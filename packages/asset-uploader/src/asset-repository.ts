import type { Asset } from "@webstudio-is/sdk";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { AssetClient } from "./client";
import { createUploadTicket, type CreateUploadTicketInput } from "./upload";
import { synchronizeCanonicalMetadataAfterAssetChange } from "./canonical-metadata-maintenance";

type CreateId = () => Asset["id"];

const defaultDependencies = {
  createUploadTicket,
  synchronizeCanonicalMetadataAfterAssetChange,
  reportMaintenanceError: (error: unknown) =>
    console.error("Asset repository maintenance failed", error),
};

export interface AssetRepository {
  createUploadTicket(
    input: Omit<CreateUploadTicketInput, "projectId">,
    createId?: CreateId
  ): ReturnType<typeof createUploadTicket>;
}

/**
 * Owns logical PostgreSQL asset mutations and their derived file metadata while
 * PostgreSQL remains the project's authoritative ProjectStore backend.
 */
export class PostgresAssetRepository implements AssetRepository {
  private readonly projectId: string;
  private readonly context: AppContext;
  private readonly assetClient: AssetClient;
  private readonly dependencies: typeof defaultDependencies;

  constructor({
    projectId,
    context,
    assetClient,
    dependencies = defaultDependencies,
  }: {
    projectId: string;
    context: AppContext;
    assetClient: AssetClient;
    dependencies?: typeof defaultDependencies;
  }) {
    this.projectId = projectId;
    this.context = context;
    this.assetClient = assetClient;
    this.dependencies = dependencies;
  }

  async createUploadTicket(
    input: Omit<CreateUploadTicketInput, "projectId">,
    createId?: CreateId
  ) {
    const ticket = await this.dependencies.createUploadTicket(
      { ...input, projectId: this.projectId },
      this.context,
      createId
    );
    // A non-deduplicated ticket only reserves an upload. Deduplication can
    // restore or create a complete logical asset immediately, so it must pass
    // through the same derived-document boundary as upload completion.
    if (ticket.deduplicated) {
      try {
        await this.dependencies.synchronizeCanonicalMetadataAfterAssetChange({
          client: this.context.postgrest.client,
          assetClient: this.assetClient,
          projectId: this.projectId,
          assetId: ticket.assetId,
        });
      } catch (error) {
        // The asset mutation is already committed. Database invalidation and
        // publication reconciliation retain a durable repair path.
        this.dependencies.reportMaintenanceError(error);
      }
    }
    return ticket;
  }
}
