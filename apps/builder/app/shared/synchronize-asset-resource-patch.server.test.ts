import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createStructuredAssetQueryResourceBody,
  type Resource,
} from "@webstudio-is/sdk";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { synchronizeAssetResourcesAfterBuildPatch } from "./synchronize-asset-resource-patch.server";

const synchronizeCanonicalAssets = vi.fn();
const synchronizeAllCanonicalAssetStandardMetadata = vi.fn();
const synchronizeCanonicalAsset = vi.fn();
const synchronizeCanonicalAssetStandardMetadata = vi.fn();
const createAssetClient = vi.fn(() => ({
  readFile: vi.fn(),
  uploadFile: vi.fn(),
}));
const dependencies = {
  createAssetClient,
  synchronizeCanonicalAssets,
  synchronizeAllCanonicalAssetStandardMetadata,
  synchronizeCanonicalAsset,
  synchronizeCanonicalAssetStandardMetadata,
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
  url: JSON.stringify("/$resources/assets"),
  headers: [],
  body: createStructuredAssetQueryResourceBody({
    filters: [],
    sort: [],
    limit: "20",
    offset: "0",
    content: { mode: "none" },
  }),
});

describe("asset metadata synchronization", () => {
  beforeEach(() => vi.clearAllMocks());

  test("indexes all assets when a query is enabled", async () => {
    await synchronizeAssetResourcesAfterBuildPatch(
      {
        context,
        buildId: "build-1",
        projectId: "project-1",
        previousResources: "[]",
        resources: JSON.stringify([createQueryResource()]),
        changes: [],
      },
      dependencies
    );

    expect(synchronizeCanonicalAssets).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient: expect.anything(),
      projectId: "project-1",
    });
  });

  test("does no indexing work without a configured query", async () => {
    await synchronizeAssetResourcesAfterBuildPatch(
      {
        context,
        buildId: "build-1",
        projectId: "project-1",
        previousResources: "[]",
        resources: "[]",
        changes: [],
        replaceAllAssets: true,
      },
      dependencies
    );

    expect(createAssetClient).not.toHaveBeenCalled();
    expect(synchronizeCanonicalAssets).not.toHaveBeenCalled();
  });

  test("updates standard metadata for renamed or moved assets", async () => {
    const resource = createQueryResource();
    await synchronizeAssetResourcesAfterBuildPatch(
      {
        context,
        buildId: "build-1",
        projectId: "project-1",
        previousResources: JSON.stringify([resource]),
        resources: JSON.stringify([resource]),
        changes: [
          {
            namespace: "assets",
            patches: [
              { op: "replace", path: ["asset-1", "filename"], value: "Post" },
              {
                op: "replace",
                path: ["asset-2", "folderId"],
                value: "folder-1",
              },
            ],
          },
        ],
      },
      dependencies
    );

    expect(synchronizeCanonicalAssetStandardMetadata).toHaveBeenCalledWith({
      client: context.postgrest.client,
      projectId: "project-1",
      assetIds: ["asset-1", "asset-2"],
    });
    expect(synchronizeCanonicalAsset).not.toHaveBeenCalled();
  });

  test("fully reindexes assets whose stored content reference changes", async () => {
    const resource = createQueryResource();
    await synchronizeAssetResourcesAfterBuildPatch(
      {
        context,
        buildId: "build-1",
        projectId: "project-1",
        previousResources: JSON.stringify([resource]),
        resources: JSON.stringify([resource]),
        changes: [
          {
            namespace: "assets",
            patches: [
              {
                op: "replace",
                path: ["asset-1", "name"],
                value: "revision.md",
              },
            ],
          },
        ],
      },
      dependencies
    );

    expect(synchronizeCanonicalAsset).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient: expect.anything(),
      projectId: "project-1",
      assetId: "asset-1",
    });
    expect(synchronizeCanonicalAssetStandardMetadata).not.toHaveBeenCalled();
  });
});
