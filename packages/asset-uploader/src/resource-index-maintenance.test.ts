import { describe, expect, test, vi } from "vitest";
import { createCanonicalAssetFileEntry } from "@webstudio-is/asset-resource";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import { updateAssetResourceIndexesAfterCanonicalChange } from "./resource-index-maintenance";

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
const metadataRow = {
  ...entry,
  document,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

describe("incremental resource index maintenance", () => {
  test("rebuilds project queries from one canonical metadata load", async () => {
    let metadataLoads = 0;
    const begun: string[] = [];
    const activated: string[] = [];
    server.use(
      db.get("AssetResourceIndexState", ({ request }) => {
        expect(new URL(request.url).searchParams.get("projectId")).toBe(
          "eq.project-1"
        );
        return json([
          { resourceId: "listing", query: `*[extension == "md"]` },
          { resourceId: "post", query: `*[properties.slug == $slug]` },
        ]);
      }),
      db.get("AssetFileMetadata", () => {
        metadataLoads += 1;
        return json([metadataRow]);
      }),
      db.post("rpc/begin_asset_resource_index_build", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        begun.push(String(body.p_resource_id));
        return json(null);
      }),
      db.post("rpc/activate_asset_resource_index", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        activated.push(String(body.p_resource_id));
        return json(true);
      })
    );
    const putIfAbsent = vi.fn(async ({ checksum }) => ({
      status: "created" as const,
      checksum,
    }));

    await expect(
      updateAssetResourceIndexesAfterCanonicalChange({
        client: testContext.postgrest.client,
        store: { putIfAbsent },
        projectId: "project-1",
        changedAssetIds: ["post-1", "post-1"],
      })
    ).resolves.toEqual({
      changedAssetIds: ["post-1"],
      updatedResourceIds: ["listing", "post"],
    });
    expect(metadataLoads).toBe(1);
    expect(begun).toEqual(["listing", "post"]);
    expect(activated).toEqual(["listing", "post"]);
    expect(putIfAbsent).toHaveBeenCalledTimes(2);
  });

  test("does no database or storage work for an empty change set", async () => {
    const putIfAbsent = vi.fn();
    await expect(
      updateAssetResourceIndexesAfterCanonicalChange({
        client: testContext.postgrest.client,
        store: { putIfAbsent },
        projectId: "project-1",
        changedAssetIds: [],
      })
    ).resolves.toEqual({ changedAssetIds: [], updatedResourceIds: [] });
    expect(putIfAbsent).not.toHaveBeenCalled();
  });
});
