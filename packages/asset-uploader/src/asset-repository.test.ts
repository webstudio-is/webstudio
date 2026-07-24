import { describe, expect, test, vi } from "vitest";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { AssetClient } from "./client";
import { createUploadTicket } from "./upload";
import { synchronizeCanonicalMetadataAfterAssetChange } from "./canonical-metadata-maintenance";
import { PostgresAssetRepository } from "./asset-repository";

const context = {
  postgrest: { client: {} },
} as unknown as AppContext;
const assetClient = {} as AssetClient;

const createDependencies = () => ({
  createUploadTicket: vi.fn<typeof createUploadTicket>(),
  synchronizeCanonicalMetadataAfterAssetChange:
    vi.fn<typeof synchronizeCanonicalMetadataAfterAssetChange>(),
  reportMaintenanceError: vi.fn<(error: unknown) => void>(),
});

describe("PostgresAssetRepository", () => {
  test("maintains a complete asset restored by upload deduplication", async () => {
    const dependencies = createDependencies();
    dependencies.createUploadTicket.mockResolvedValue({
      assetId: "asset-1",
      name: "post.md",
      deduplicated: true,
      asset: {
        id: "asset-1",
        projectId: "project-1",
        name: "post.md",
        type: "file",
        format: "raw",
        size: 12,
        createdAt: "2026-07-24T00:00:00.000Z",
        meta: {},
      },
    });
    dependencies.synchronizeCanonicalMetadataAfterAssetChange.mockResolvedValue(
      {
        status: "indexed",
        revision: "revision-1",
      }
    );
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    const ticket = await repository.createUploadTicket({
      type: "file",
      filename: "post.md",
      contentHash: "hash",
    });

    expect(ticket.deduplicated).toBe(true);
    expect(dependencies.createUploadTicket).toHaveBeenCalledWith(
      {
        projectId: "project-1",
        type: "file",
        filename: "post.md",
        contentHash: "hash",
      },
      context,
      undefined
    );
    expect(
      dependencies.synchronizeCanonicalMetadataAfterAssetChange
    ).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient,
      projectId: "project-1",
      assetId: "asset-1",
    });
  });

  test("does not index an incomplete upload reservation", async () => {
    const dependencies = createDependencies();
    dependencies.createUploadTicket.mockResolvedValue({
      assetId: "asset-1",
      name: "post.md",
      deduplicated: false,
    });
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await repository.createUploadTicket({
      type: "file",
      filename: "post.md",
    });

    expect(
      dependencies.synchronizeCanonicalMetadataAfterAssetChange
    ).not.toHaveBeenCalled();
  });

  test("keeps a committed deduplicated mutation successful when maintenance fails", async () => {
    const dependencies = createDependencies();
    const failure = new Error("maintenance failed");
    dependencies.createUploadTicket.mockResolvedValue({
      assetId: "asset-1",
      name: "post.md",
      deduplicated: true,
      asset: {
        id: "asset-1",
        projectId: "project-1",
        name: "post.md",
        type: "file",
        format: "raw",
        size: 12,
        createdAt: "2026-07-24T00:00:00.000Z",
        meta: {},
      },
    });
    dependencies.synchronizeCanonicalMetadataAfterAssetChange.mockRejectedValue(
      failure
    );
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(
      repository.createUploadTicket({ type: "file", filename: "post.md" })
    ).resolves.toMatchObject({ deduplicated: true });
    expect(dependencies.reportMaintenanceError).toHaveBeenCalledWith(failure);
  });
});
