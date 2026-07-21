import { describe, expect, test, vi } from "vitest";
import {
  computeAssetResourceQueryHash,
  computeCanonicalAssetRevision,
  createCanonicalAssetFileEntry,
} from "@webstudio-is/asset-resource";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import {
  reconcileAssetResourceIndexesForPublication,
  prepareAssetResourceIndexSnapshotsForPublication,
  updateAssetResourceIndexesAfterCanonicalChange,
} from "./resource-index-maintenance";

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
  metadataToken: "metadata-token-1",
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
        const search = new URL(request.url).searchParams;
        expect(search.get("projectId")).toBe("eq.project-1");
        expect(search.get("deletedAt")).toBe("is.null");
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
        return json(true);
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

  test("does not rebuild deleted resource queries", async () => {
    let metadataLoaded = false;
    server.use(
      db.get("AssetResourceIndexState", ({ request }) => {
        const search = new URL(request.url).searchParams;
        return search.get("deletedAt") === "is.null"
          ? json([])
          : json([{ resourceId: "deleted", query: "*[]" }]);
      }),
      db.get("AssetFileMetadata", () => {
        metadataLoaded = true;
        return json([metadataRow]);
      })
    );
    const putIfAbsent = vi.fn();

    await expect(
      updateAssetResourceIndexesAfterCanonicalChange({
        client: testContext.postgrest.client,
        store: { putIfAbsent },
        projectId: "project-1",
        changedAssetIds: ["post-1"],
      })
    ).resolves.toEqual({
      changedAssetIds: ["post-1"],
      updatedResourceIds: [],
    });
    expect(metadataLoaded).toBe(false);
    expect(putIfAbsent).not.toHaveBeenCalled();
  });

  test("does not rebuild resources already updated by query synchronization", async () => {
    let metadataLoaded = false;
    server.use(
      db.get("AssetResourceIndexState", () =>
        json([{ resourceId: "posts", query: "*[]" }])
      ),
      db.get("AssetFileMetadata", () => {
        metadataLoaded = true;
        return json([metadataRow]);
      })
    );
    const putIfAbsent = vi.fn();

    await expect(
      updateAssetResourceIndexesAfterCanonicalChange({
        client: testContext.postgrest.client,
        store: { putIfAbsent },
        projectId: "project-1",
        changedAssetIds: ["post-1"],
        excludedResourceIds: ["posts"],
      })
    ).resolves.toEqual({
      changedAssetIds: ["post-1"],
      updatedResourceIds: [],
    });
    expect(metadataLoaded).toBe(false);
    expect(putIfAbsent).not.toHaveBeenCalled();
  });

  test("repairs a stale current-query index before publication", async () => {
    const query = `*[extension == "md"]`;
    const queryHash = await computeAssetResourceQueryHash(query);
    const assetRevision = await computeCanonicalAssetRevision([entry]);
    server.use(
      db.get("AssetResourceIndexState", () =>
        json([
          {
            resourceId: "posts",
            queryHash,
            assetRevision: `sha256:${"0".repeat(64)}`,
            buildStatus: "FAILED",
            activeRevision: null,
            deletedAt: null,
          },
        ])
      ),
      db.post("rpc/begin_asset_resource_index_build", () => json(true)),
      db.post("rpc/activate_asset_resource_index", () => json(true))
    );
    const putIfAbsent = vi.fn(async ({ checksum }) => ({
      status: "created" as const,
      checksum,
    }));

    await expect(
      reconcileAssetResourceIndexesForPublication({
        client: testContext.postgrest.client,
        store: { putIfAbsent },
        projectId: "project-1",
        resources: [{ resourceId: "posts", query, queryHash }],
        entries: [entry],
        assetRevision,
        metadataSnapshot: [
          { assetId: "post-1", metadataToken: "metadata-token-1" },
        ],
      })
    ).resolves.toEqual(["posts"]);
    expect(putIfAbsent).toHaveBeenCalledOnce();
  });

  test("builds a historical query snapshot without replacing current state", async () => {
    const historicalQuery = `*[extension == "md"]`;
    const historicalQueryHash =
      await computeAssetResourceQueryHash(historicalQuery);
    const assetRevision = await computeCanonicalAssetRevision([entry]);
    server.use(
      db.get("AssetResourceIndexState", () =>
        json([
          {
            resourceId: "posts",
            queryHash: `sha256:${"1".repeat(64)}`,
            deletedAt: null,
          },
        ])
      )
    );
    const putIfAbsent = vi.fn();
    const read = vi.fn();

    const snapshots = await prepareAssetResourceIndexSnapshotsForPublication({
      client: testContext.postgrest.client,
      store: { putIfAbsent },
      projectId: "project-1",
      resources: [
        {
          resourceId: "posts",
          query: historicalQuery,
          queryHash: historicalQueryHash,
        },
      ],
      entries: [entry],
      assetRevision,
      metadataSnapshot: [
        { assetId: "post-1", metadataToken: "metadata-token-1" },
      ],
      read,
      referenceId: "historical-build",
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.index.queryHash).toBe(historicalQueryHash);
    expect(putIfAbsent).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });
});
