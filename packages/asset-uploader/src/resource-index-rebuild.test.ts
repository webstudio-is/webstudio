import { describe, expect, test, vi } from "vitest";
import { createCanonicalAssetFileEntry } from "@webstudio-is/asset-resource";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import {
  AssetResourceIndexNotFoundError,
  rebuildAssetResourceIndex,
} from "./resource-index-rebuild";

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
      db.get("AssetResourceIndexState", () =>
        json({ query: `*[properties.slug == $slug]` })
      ),
      db.get("AssetFileMetadata", () =>
        json([
          {
            ...entry,
            document,
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          },
        ])
      ),
      db.post("rpc/begin_asset_resource_index_build", () => json(null)),
      db.post("rpc/activate_asset_resource_index", () => json(true))
    );
    const putIfAbsent = vi.fn(async ({ checksum }) => ({
      status: "exists" as const,
      checksum,
    }));
    const result = await rebuildAssetResourceIndex({
      client: testContext.postgrest.client,
      store: { putIfAbsent },
      projectId: "project-1",
      resourceId: "posts",
    });

    expect(result.index.parameterNames).toEqual(["slug"]);
    expect(result.index.documents).toHaveLength(1);
    expect(putIfAbsent).toHaveBeenCalledOnce();
  });

  test("fails clearly when the resource has no persisted index state", async () => {
    server.use(
      db.get("AssetResourceIndexState", ({ request }) => {
        expect(new URL(request.url).searchParams.get("deletedAt")).toBe(
          "is.null"
        );
        return json(null);
      })
    );
    await expect(
      rebuildAssetResourceIndex({
        client: testContext.postgrest.client,
        store: { putIfAbsent: vi.fn() },
        projectId: "project-1",
        resourceId: "missing",
      })
    ).rejects.toBeInstanceOf(AssetResourceIndexNotFoundError);
  });

  test("treats a deleted resource index state as not found", async () => {
    const putIfAbsent = vi.fn();
    server.use(
      db.get("AssetResourceIndexState", ({ request }) => {
        const search = new URL(request.url).searchParams;
        return search.get("deletedAt") === "is.null"
          ? json(null)
          : json({ query: "*[]" });
      })
    );

    await expect(
      rebuildAssetResourceIndex({
        client: testContext.postgrest.client,
        store: { putIfAbsent },
        projectId: "project-1",
        resourceId: "deleted",
      })
    ).rejects.toBeInstanceOf(AssetResourceIndexNotFoundError);
    expect(putIfAbsent).not.toHaveBeenCalled();
  });
});
