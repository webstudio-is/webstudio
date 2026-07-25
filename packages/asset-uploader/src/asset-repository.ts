import {
  createAssetQueryRepository,
  createAssetIndex,
  selectAssetProperties,
  verifyAssetIndex,
} from "@webstudio-is/asset-resource";
import type {
  Asset,
  AssetFolder,
  AssetQueryRequirements,
  AssetQueryRequestInput,
  AssetQueryResult,
} from "@webstudio-is/sdk";
import { assetQuery, getAssetQueryRequirements } from "@webstudio-is/sdk";
import type {
  AssetFolderUpdateRequest,
  AssetMetadataUpdate,
} from "@webstudio-is/sdk/asset-resource-api";
import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import type { AssetDataOverride } from "./utils/get-asset-data";
import type {
  AssetReadRange,
  AssetObjectReader,
  AssetObjectStore,
  AssetObjectWriter,
} from "./client";
import { nanoid } from "nanoid";
import {
  createUploadTicket,
  uploadFile,
  type CreateUploadTicketInput,
} from "./upload";
import { updateAssetContent } from "./revision";
import {
  deleteAssetsWithClient,
  updateAssetMetadataWithClient,
  loadAssetsByProjectWithClient,
} from "./asset-patch-core";
import type { UploadTicket } from "./types";
import {
  loadCanonicalAssetBaseEntries,
  synchronizeCanonicalAssets,
} from "./canonical-metadata-backfill";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import {
  deleteAssetFoldersWithClient,
  loadAssetFoldersByProjectWithClient,
  upsertAssetFolderWithClient,
} from "./folder-persistence";

type CreateId = () => Asset["id"];
type RepositoryObjectStore = AssetObjectReader & Partial<AssetObjectWriter>;

const defaultDependencies = {
  hasProjectPermit: authorizeProject.hasProjectPermit,
  createUploadTicket,
  uploadFile,
  updateAssetContent,
  deleteAssetsWithClient,
  updateAssetMetadataWithClient,
  loadAssetsByProjectWithClient,
  loadAssetFoldersByProjectWithClient,
  upsertAssetFolderWithClient,
  deleteAssetFoldersWithClient,
  createId: (): string => nanoid(),
  now: () => new Date(),
  loadCanonicalAssetBaseEntries,
  synchronizeCanonicalAssets,
  loadCanonicalAssetFileEntries,
  createAssetIndex,
  verifyAssetIndex,
};

type AssetRepositoryDependencies = typeof defaultDependencies;

export class AssetRepositoryNotFoundError extends Error {}
export class AssetRepositoryConflictError extends Error {}

export class AssetIndexPreparationError extends Error {
  readonly issues: Awaited<
    ReturnType<typeof synchronizeCanonicalAssets>
  >["issues"];

  constructor(
    issues: Awaited<ReturnType<typeof synchronizeCanonicalAssets>>["issues"]
  ) {
    super(
      `Asset index preparation failed for ${issues.length} asset${issues.length === 1 ? "" : "s"}: ${issues.map(({ assetId, storageName, message }) => `${assetId} (${storageName}): ${message}`).join("; ")}`
    );
    this.name = "AssetIndexPreparationError";
    this.issues = issues;
  }
}

export type AssetContentRead = {
  asset: Asset;
  data: AsyncIterable<Uint8Array>;
  contentLength?: number;
};

export interface AssetRepository {
  list(): Promise<Asset[]>;
  get(assetId: Asset["id"]): Promise<Asset>;
  readContent(input: {
    assetId: Asset["id"];
    range?: AssetReadRange;
    asset?: Asset;
  }): Promise<AssetContentRead>;
  createUploadTicket(
    input: Omit<CreateUploadTicketInput, "projectId">,
    createId?: CreateId
  ): Promise<UploadTicket>;
  completeUpload(input: {
    name: string;
    data: ReadableStream<Uint8Array>;
    assetInfoFallback:
      | { width: number; height: number; format: string }
      | undefined;
    assetDataOverride?: AssetDataOverride;
    assetId?: Asset["id"];
  }): Promise<Asset>;
  updateContent(input: {
    assetId: Asset["id"];
    expectedName: string;
    data: ReadableStream<Uint8Array>;
  }): Promise<Asset>;
  updateMetadata(
    assetId: Asset["id"],
    values: AssetMetadataUpdate
  ): Promise<Asset>;
  delete(ids: Asset["id"][]): Promise<void>;
  listFolders(): Promise<AssetFolder[]>;
  getFolder(folderId: string): Promise<AssetFolder>;
  createFolder(input: {
    name: string;
    parentId?: string;
  }): Promise<AssetFolder>;
  updateFolder(
    folderId: string,
    values: AssetFolderUpdateRequest
  ): Promise<AssetFolder>;
  deleteFolder(folderId: string): Promise<void>;
  readIndex(
    requirements?: AssetQueryRequirements
  ): ReturnType<typeof createAssetIndex>;
  query(request: AssetQueryRequestInput): Promise<AssetQueryResult>;
}

/** Trusted repair/publication operations. Every method still verifies permits. */
export interface AssetMaintenanceRepository {
  synchronize(): ReturnType<typeof synchronizeCanonicalAssets>;
  prepareIndex(
    requirements?: AssetQueryRequirements
  ): ReturnType<typeof createAssetIndex>;
}

/**
 * Hosted Assets repository. PostgreSQL owns logical records and canonical
 * metadata; the injected object store owns file bytes. Published runtimes use
 * a separate storage-neutral index/query repository.
 *
 * Public mutations update only logical records and object bytes. Query reads
 * and publication lazily reconcile derived metadata so projects that do not
 * use configured Assets queries never open or parse stored file contents.
 */
export class PostgresAssetRepository
  implements AssetRepository, AssetMaintenanceRepository
{
  private readonly projectId: string;
  private readonly context: AppContext;
  private readonly assetStore: RepositoryObjectStore;
  private readonly dependencies: AssetRepositoryDependencies;

  constructor({
    projectId,
    context,
    assetClient,
    assetStore = assetClient,
    dependencies,
  }: {
    projectId: string;
    context: AppContext;
    assetClient?: RepositoryObjectStore;
    assetStore?: RepositoryObjectStore;
    dependencies?: Partial<AssetRepositoryDependencies>;
  }) {
    if (assetStore === undefined) {
      throw new Error("Asset object storage is required");
    }
    this.projectId = projectId;
    this.context = context;
    this.assetStore = assetStore;
    this.dependencies = { ...defaultDependencies, ...dependencies };
  }

  static async forUpload({
    name,
    context,
    assetStore,
  }: {
    name: string;
    context: AppContext;
    assetStore: AssetObjectStore;
  }) {
    const file = await context.postgrest.client
      .from("File")
      .select("uploaderProjectId")
      .eq("name", name)
      .single();
    if (file.error || typeof file.data?.uploaderProjectId !== "string") {
      throw new Error(
        file.error?.message ?? "File uploader project is missing"
      );
    }
    return new PostgresAssetRepository({
      projectId: file.data.uploaderProjectId,
      context,
      assetStore,
    });
  }

  private async assertCanEdit() {
    const canEdit = await this.dependencies.hasProjectPermit(
      { projectId: this.projectId, permit: "edit" },
      this.context
    );
    if (canEdit === false) {
      throw new AuthorizationError(
        "You don't have access to edit this project assets"
      );
    }
  }

  private async assertCanView() {
    const canView = await this.dependencies.hasProjectPermit(
      { projectId: this.projectId, permit: "view" },
      this.context
    );
    if (canView === false) {
      throw new AuthorizationError(
        "You don't have access to view this project assets"
      );
    }
  }

  private async assertCanBuild() {
    const canBuild = await this.dependencies.hasProjectPermit(
      { projectId: this.projectId, permit: "build" },
      this.context
    );
    if (canBuild === false) {
      throw new AuthorizationError(
        "You don't have access to build this project assets index"
      );
    }
  }

  private getWritableStore(): AssetObjectStore {
    if (this.assetStore.uploadFile === undefined) {
      throw new Error("Asset object storage is read-only");
    }
    return this.assetStore as AssetObjectStore;
  }

  private getUploadErrorCleanup(assetId: Asset["id"] | undefined) {
    if (assetId === undefined) {
      return;
    }
    return async (name: string) => {
      const deletedAsset = await this.context.postgrest.client
        .from("Asset")
        .delete()
        .eq("id", assetId)
        .eq("projectId", this.projectId);
      if (deletedAsset.error) {
        throw deletedAsset.error;
      }
      const deletedFile = await this.context.postgrest.client
        .from("File")
        .delete()
        .eq("name", name);
      if (deletedFile.error) {
        throw deletedFile.error;
      }
    };
  }

  async list() {
    await this.assertCanView();
    return await this.dependencies.loadAssetsByProjectWithClient(
      this.projectId,
      this.context.postgrest.client
    );
  }

  async get(assetId: Asset["id"]) {
    await this.assertCanView();
    const [asset] = await this.dependencies.loadAssetsByProjectWithClient(
      this.projectId,
      this.context.postgrest.client,
      [assetId]
    );
    if (asset === undefined) {
      throw new AssetRepositoryNotFoundError("Asset not found");
    }
    return asset;
  }

  async readContent({
    assetId,
    range,
    asset: knownAsset,
  }: Parameters<AssetRepository["readContent"]>[0]) {
    if (knownAsset !== undefined && knownAsset.id !== assetId) {
      throw new Error("Known asset does not match requested asset id");
    }
    if (knownAsset !== undefined) {
      await this.assertCanView();
    }
    const asset = knownAsset ?? (await this.get(assetId));
    const content = await this.assetStore.readFile(asset.name, range);
    return { asset, ...content };
  }

  async createUploadTicket(
    input: Omit<CreateUploadTicketInput, "projectId">,
    createId?: CreateId
  ) {
    await this.assertCanEdit();
    const ticket = await this.dependencies.createUploadTicket(
      { ...input, projectId: this.projectId },
      this.context,
      createId
    );
    return ticket;
  }

  async completeUpload({
    name,
    data,
    assetInfoFallback,
    assetDataOverride,
    assetId,
  }: Parameters<AssetRepository["completeUpload"]>[0]) {
    // Reserved upload names are not authorization credentials. Recheck the
    // derived owning project when the second upload step writes file content.
    await this.assertCanEdit();
    const asset = await this.dependencies.uploadFile(
      name,
      data,
      this.getWritableStore(),
      this.context,
      assetInfoFallback,
      assetDataOverride,
      this.getUploadErrorCleanup(assetId)
    );
    return asset;
  }

  async updateContent({
    assetId,
    expectedName,
    data,
  }: Parameters<AssetRepository["updateContent"]>[0]) {
    await this.assertCanEdit();
    const asset = await this.dependencies.updateAssetContent(
      {
        assetId,
        projectId: this.projectId,
        expectedName,
        data,
      },
      this.getWritableStore(),
      this.context
    );
    return asset;
  }

  async updateMetadata(assetId: Asset["id"], values: AssetMetadataUpdate) {
    await this.assertCanEdit();
    const asset = await this.dependencies.updateAssetMetadataWithClient(
      { projectId: this.projectId, assetId, values },
      this.context.postgrest.client
    );

    return asset;
  }

  async delete(ids: Asset["id"][]) {
    await this.assertCanEdit();
    await this.dependencies.deleteAssetsWithClient(
      { projectId: this.projectId, ids },
      this.context.postgrest.client
    );
  }

  async listFolders() {
    await this.assertCanView();
    return await this.dependencies.loadAssetFoldersByProjectWithClient(
      this.projectId,
      this.context.postgrest.client
    );
  }

  async getFolder(folderId: string) {
    await this.assertCanView();
    const [folder] =
      await this.dependencies.loadAssetFoldersByProjectWithClient(
        this.projectId,
        this.context.postgrest.client,
        [folderId]
      );
    if (folder === undefined) {
      throw new AssetRepositoryNotFoundError("Asset folder not found");
    }
    return folder;
  }

  async createFolder({ name, parentId }: { name: string; parentId?: string }) {
    await this.assertCanEdit();
    return await this.dependencies.upsertAssetFolderWithClient(
      {
        projectId: this.projectId,
        folder: {
          id: this.dependencies.createId(),
          projectId: this.projectId,
          name,
          parentId,
          createdAt: this.dependencies.now().toISOString(),
        },
      },
      this.context.postgrest.client
    );
  }

  async updateFolder(folderId: string, values: AssetFolderUpdateRequest) {
    await this.assertCanEdit();
    const folder = (
      await this.dependencies.loadAssetFoldersByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      )
    ).find(({ id }) => id === folderId);
    if (folder === undefined) {
      throw new AssetRepositoryNotFoundError("Asset folder not found");
    }
    const updated = await this.dependencies.upsertAssetFolderWithClient(
      {
        projectId: this.projectId,
        folder: {
          ...folder,
          ...(values.name === undefined ? {} : { name: values.name }),
          parentId:
            values.parentId === null
              ? undefined
              : (values.parentId ?? folder.parentId),
        },
      },
      this.context.postgrest.client
    );
    return updated;
  }

  async deleteFolder(folderId: string) {
    await this.assertCanEdit();
    const [folders, assets] = await Promise.all([
      this.dependencies.loadAssetFoldersByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      ),
      this.dependencies.loadAssetsByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      ),
    ]);
    if (folders.some(({ id }) => id === folderId) === false) {
      throw new AssetRepositoryNotFoundError("Asset folder not found");
    }
    if (
      folders.some(({ parentId }) => parentId === folderId) ||
      assets.some(({ folderId: assetFolderId }) => assetFolderId === folderId)
    ) {
      throw new AssetRepositoryConflictError(
        "Asset folder must be empty before it can be deleted"
      );
    }
    await this.dependencies.deleteAssetFoldersWithClient(
      { projectId: this.projectId, ids: [folderId] },
      this.context.postgrest.client
    );
  }

  async synchronize() {
    await this.assertCanEdit();
    return await this.synchronizeTrusted();
  }

  private async synchronizeTrusted(requirements?: AssetQueryRequirements) {
    return await this.dependencies.synchronizeCanonicalAssets({
      client: this.context.postgrest.client,
      assetClient: this.assetStore,
      projectId: this.projectId,
      ...(requirements === undefined
        ? {}
        : {
            requirements: {
              structuredProperties: requirements.structuredProperties,
              excerpt: requirements.excerpt,
            },
          }),
    });
  }

  async prepareIndex(requirements?: AssetQueryRequirements) {
    await this.assertCanBuild();
    return await this.prepareIndexAfterAuthorization(requirements, true);
  }

  private async prepareIndexAfterAuthorization(
    requirements: AssetQueryRequirements | undefined,
    strict: boolean
  ) {
    if (
      requirements === undefined ||
      requirements.structuredProperties ||
      requirements.excerpt
    ) {
      const result = await this.synchronizeTrusted(requirements);
      if (strict && result.issues.length > 0) {
        throw new AssetIndexPreparationError(result.issues);
      }
      return await this.dependencies.verifyAssetIndex(
        await this.loadIndex(requirements)
      );
    }
    const entries = await this.dependencies.loadCanonicalAssetBaseEntries({
      client: this.context.postgrest.client,
      projectId: this.projectId,
    });
    return await this.dependencies.verifyAssetIndex(
      await this.dependencies.createAssetIndex({
        projectId: this.projectId,
        entries,
      })
    );
  }

  async readIndex(requirements?: AssetQueryRequirements) {
    await this.assertCanView();
    return await this.prepareIndexAfterAuthorization(requirements, false);
  }

  private async loadIndex(requirements?: AssetQueryRequirements) {
    const entries = await this.dependencies.loadCanonicalAssetFileEntries({
      client: this.context.postgrest.client,
      projectId: this.projectId,
    });
    const projectedEntries =
      requirements === undefined
        ? entries
        : entries.map((entry) => {
            const { excerpt, ...document } = entry.document;
            return {
              ...entry,
              document: {
                ...document,
                properties:
                  requirements.structuredPropertyPaths === "all"
                    ? entry.document.properties
                    : selectAssetProperties({
                        properties: entry.document.properties,
                        fields: requirements.structuredPropertyPaths,
                      }),
                ...(requirements.excerpt && excerpt !== undefined
                  ? { excerpt }
                  : {}),
              },
            };
          });
    return await this.dependencies.createAssetIndex({
      projectId: this.projectId,
      entries: projectedEntries,
    });
  }

  async query(request: AssetQueryRequestInput) {
    return await createAssetQueryRepository({
      loadIndex: () =>
        this.readIndex(
          getAssetQueryRequirements(assetQuery.parse(request.query))
        ),
      readContent: this.assetStore.readFile,
    }).query(request);
  }
}
