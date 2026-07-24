import { beforeEach, describe, expect, test, vi } from "vitest";
import { createAssetQueryResourceBody, type Resource } from "@webstudio-is/sdk";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { synchronizeAssetResourcesAfterBuildPatch } from "./synchronize-asset-resource-patch.server";

const synchronizeCanonicalAssets = vi.fn();
const synchronizeAllCanonicalAssetStandardMetadata = vi.fn();
const synchronizeAssetResourceIndexQueries = vi.fn();
const synchronizeCanonicalAsset = vi.fn();
const updateAssetResourceIndexesAfterCanonicalChange = vi.fn();
const resourceIndexStore = {
  putIfAbsent: vi.fn(async ({ checksum }: { checksum: string }) => ({
    status: "created" as const,
    checksum,
  })),
  read: vi.fn(async () => ({
    data: {
      async *[Symbol.asyncIterator]() {},
    },
  })),
};
const createAssetClient = vi.fn(() => ({
  readFile: vi.fn(async () => ({
    data: {
      async *[Symbol.asyncIterator]() {},
    },
  })),
  uploadFile: vi.fn(async () => ({ format: "file", size: 0, meta: {} })),
  resourceIndexStore,
}));
const dependencies = {
  createAssetClient,
  synchronizeCanonicalAssets,
  synchronizeAllCanonicalAssetStandardMetadata,
  synchronizeAssetResourceIndexQueries,
  synchronizeCanonicalAsset,
  updateAssetResourceIndexesAfterCanonicalChange,
} satisfies Exclude<
  Parameters<typeof synchronizeAssetResourcesAfterBuildPatch>[1],
  undefined
>;
const context = {
  postgrest: { client: { from: vi.fn() } },
} as unknown as AppContext;

const createQueryResource = (): Resource => ({
  id: "posts",
  name: "Posts",
  control: "system",
  method: "post",
  url: JSON.stringify("/$resources/assets/query"),
  headers: [],
  body: createAssetQueryResourceBody({
    query: "{ assets { items { id } } }",
    variables: [],
  }),
});

describe("asset resource synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    synchronizeAssetResourceIndexQueries.mockResolvedValue({
      deletedResourceIds: [],
      updatedResourceIds: [],
    });
    synchronizeCanonicalAssets.mockResolvedValue({
      scanned: 1,
      indexed: 1,
      metadataUpdated: 0,
      unchanged: 0,
      removed: 0,
      skipped: 0,
      inconsistent: 0,
    });
    updateAssetResourceIndexesAfterCanonicalChange.mockResolvedValue({
      changedAssetIds: ["project-assets"],
      updatedResourceIds: ["posts"],
    });
  });

  test("rebuilds canonical metadata and indexes after replacing all assets", async () => {
    const resources = JSON.stringify([createQueryResource()]);

    await synchronizeAssetResourcesAfterBuildPatch(
      {
        context,
        buildId: "build-1",
        projectId: "project-1",
        previousResources: resources,
        resources,
        changes: [],
        replaceAllAssets: true,
      },
      dependencies
    );

    expect(synchronizeAssetResourceIndexQueries).toHaveBeenCalledOnce();
    expect(synchronizeCanonicalAssets).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient: expect.anything(),
      projectId: "project-1",
    });
    expect(updateAssetResourceIndexesAfterCanonicalChange).toHaveBeenCalledWith(
      {
        client: context.postgrest.client,
        store: resourceIndexStore,
        projectId: "project-1",
        changedAssetIds: ["project-assets"],
        excludedResourceIds: [],
      }
    );
  });

  test("reconciles ownership without reading assets when no query is configured", async () => {
    const resources = JSON.stringify([]);

    await synchronizeAssetResourcesAfterBuildPatch(
      {
        context,
        buildId: "build-1",
        projectId: "project-1",
        previousResources: resources,
        resources,
        changes: [],
        replaceAllAssets: true,
      },
      dependencies
    );

    expect(synchronizeAssetResourceIndexQueries).toHaveBeenCalledOnce();
    expect(synchronizeCanonicalAssets).not.toHaveBeenCalled();
    expect(
      updateAssetResourceIndexesAfterCanonicalChange
    ).not.toHaveBeenCalled();
  });
});
