import { describe, expect, test, vi } from "vitest";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import {
  collectAssetResourceIndexGarbage,
  collectAssetResourceIndexGarbageBestEffort,
} from "./resource-index-garbage-collection";

const server = createTestServer();
const candidate = {
  projectId: "project-1",
  resourceId: "posts",
  revision: `sha256:${"a".repeat(64)}`,
  objectKey: "projects/project-1/resources/posts/index.json",
  gcClaimId: "claim-1",
};

describe("resource index garbage collection", () => {
  test("deletes claimed objects and finalizes their rows", async () => {
    server.use(
      db.post("rpc/claim_asset_resource_index_garbage", async ({ request }) => {
        expect(await request.json()).toEqual({
          p_before: "2026-07-20T00:00:00.000Z",
          p_limit: 10,
        });
        return json([candidate]);
      }),
      db.post("rpc/finalize_asset_resource_index_garbage", () => json(true))
    );
    const remove = vi.fn(async () => "deleted" as const);

    await expect(
      collectAssetResourceIndexGarbage({
        client: testContext.postgrest.client,
        store: { delete: remove },
        now: new Date("2026-07-20T00:00:00Z"),
        limit: 10,
      })
    ).resolves.toEqual({ claimed: 1, deleted: 1, missing: 0 });
    expect(remove).toHaveBeenCalledWith(candidate.objectKey);
  });

  test("releases a claim after object storage fails", async () => {
    server.use(
      db.post("rpc/claim_asset_resource_index_garbage", () =>
        json([candidate])
      ),
      db.post("rpc/release_asset_resource_index_garbage_claim", () =>
        json(true)
      )
    );

    await expect(
      collectAssetResourceIndexGarbage({
        client: testContext.postgrest.client,
        store: {
          delete: async () => {
            throw new Error("R2 unavailable");
          },
        },
      })
    ).rejects.toThrow("Failed to collect 1");
  });

  test("keeps a claim when database finalization fails after deletion", async () => {
    const release = vi.fn(() => json(true));
    server.use(
      db.post("rpc/claim_asset_resource_index_garbage", () =>
        json([candidate])
      ),
      db.post("rpc/finalize_asset_resource_index_garbage", () =>
        json({ message: "database unavailable" }, { status: 500 })
      ),
      db.post("rpc/release_asset_resource_index_garbage_claim", release)
    );
    const remove = vi.fn(async () => "deleted" as const);

    await expect(
      collectAssetResourceIndexGarbage({
        client: testContext.postgrest.client,
        store: { delete: remove },
      })
    ).rejects.toThrow("Failed to collect 1");
    expect(remove).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
  });

  test("treats an already missing object as collected", async () => {
    server.use(
      db.post("rpc/claim_asset_resource_index_garbage", () =>
        json([candidate])
      ),
      db.post("rpc/finalize_asset_resource_index_garbage", () => json(true))
    );

    await expect(
      collectAssetResourceIndexGarbage({
        client: testContext.postgrest.client,
        store: { delete: async () => "missing" },
      })
    ).resolves.toEqual({ claimed: 1, deleted: 0, missing: 1 });
  });

  test("processes at most one batch", async () => {
    let claims = 0;
    server.use(
      db.post("rpc/claim_asset_resource_index_garbage", () => {
        claims += 1;
        if (claims === 1) {
          return json([
            candidate,
            {
              ...candidate,
              revision: `sha256:${"b".repeat(64)}`,
              objectKey: "projects/project-1/resources/posts/older.json",
              gcClaimId: "claim-2",
            },
          ]);
        }
        return json([]);
      }),
      db.post("rpc/finalize_asset_resource_index_garbage", () => json(true))
    );
    const remove = vi.fn(async () => "deleted" as const);

    await collectAssetResourceIndexGarbageBestEffort({
      client: testContext.postgrest.client,
      store: { delete: remove },
      limit: 2,
    });

    expect(claims).toBe(1);
    expect(remove).toHaveBeenCalledTimes(2);
  });
});
