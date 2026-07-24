import { describe, expect, test, vi } from "vitest";
import { createCanonicalAssetFileEntry } from "@webstudio-is/asset-resource";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import { rebuildAssetResourceIndex } from "./resource-index-rebuild";

const server = createTestServer();
const document = {
  _id: "post-1",
  _type: "asset.file" as const,
  name: "post.md",
  path: "blog/post.md",
  key: "post",
  extension: "md",
  mimeType: "text/markdown",
  size: 100,
  revision: "content-revision",
  contentRef: "private:post.md",
  properties: { slug: "post" },
};
const entry = createCanonicalAssetFileEntry({
  projectId: "project-1",
  document,
});

describe("explicit resource index rebuild", () => {
  test("rebuilds the persisted query from canonical metadata", async () => {
    server.use(
      db.get("AssetFileMetadata", () =>
        json([
          {
            ...entry,
            metadataToken: "metadata-token-1",
            document,
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          },
        ])
      ),
      db.post("rpc/begin_asset_resource_index_build", () => json(true)),
      db.post("rpc/activate_asset_resource_index", () => json(true))
    );
    const putIfAbsent = vi.fn(async ({ checksum }) => ({
      status: "exists" as const,
      checksum,
    }));
    const synchronizeCanonicalAssets = vi.fn(async () => ({
      scanned: 1,
      indexed: 0,
      metadataUpdated: 0,
      unchanged: 1,
      removed: 0,
      skipped: 0,
      inconsistent: 0,
    }));
    const result = await rebuildAssetResourceIndex({
      client: testContext.postgrest.client,
      assetClient: { resourceIndexStore: { putIfAbsent } } as never,
      projectId: "project-1",
      resourceId: "posts",
      query:
        "query Post($slug: String!) { assets(where: { properties: { slug: { eq: $slug } } }, first: 1) { items { id } } }",
      source: { buildId: "build-1", resources: "[]" },
      dependencies: { synchronizeCanonicalAssets },
    });

    expect(synchronizeCanonicalAssets).toHaveBeenCalledOnce();
    expect(synchronizeCanonicalAssets.mock.invocationCallOrder[0]).toBeLessThan(
      putIfAbsent.mock.invocationCallOrder[0]
    );
    expect(result.index.plan).toMatchObject({
      variables: [expect.objectContaining({ name: "slug" })],
    });
    expect(result.index.documents).toHaveLength(1);
    expect(putIfAbsent).toHaveBeenCalledOnce();
  });
});
