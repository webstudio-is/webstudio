import { describe, expect, test, vi } from "vitest";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import { collectAssetResourceIndexGarbage } from "./resource-index-garbage-collection";

const server = createTestServer();
const candidate = {
  projectId: "project-1",
  resourceId: "posts",
  revision: `sha256:${"a".repeat(64)}`,
  objectKey: "projects/project-1/resources/posts/index.json",
  gcClaimId: "claim-1",
};

describe("resource index garbage collection", () => {
  test("deletes claimed objects only after the grace period and finalizes rows", async () => {
    server.use(
      db.post("rpc/claim_asset_resource_index_garbage", async ({ request }) => {
        expect(await request.json()).toEqual({
          p_before: "2026-07-11T00:00:00.000Z",
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
        now: new Date("2026-07-18T00:00:00Z"),
        gracePeriodMs: 7 * 24 * 60 * 60 * 1000,
        limit: 10,
      })
    ).resolves.toEqual({ claimed: 1, deleted: 1, missing: 0 });
    expect(remove).toHaveBeenCalledWith(candidate.objectKey);
  });

  test("releases a claim after an object-store failure", async () => {
    server.use(
      db.post("rpc/claim_asset_resource_index_garbage", () => json([candidate])),
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
        gracePeriodMs: 0,
      })
    ).rejects.toThrow("Failed to collect 1");
  });

  test("treats a missing object as cleaned and repeated runs as no-ops", async () => {
    let claims = 0;
    server.use(
      db.post("rpc/claim_asset_resource_index_garbage", () => {
        claims += 1;
        return json(claims === 1 ? [candidate] : []);
      }),
      db.post("rpc/finalize_asset_resource_index_garbage", () => json(true))
    );
    const remove = vi.fn(async () => "missing" as const);
    const input = {
      client: testContext.postgrest.client,
      store: { delete: remove },
      gracePeriodMs: 0,
    };
    await expect(collectAssetResourceIndexGarbage(input)).resolves.toEqual({
      claimed: 1,
      deleted: 0,
      missing: 1,
    });
    await expect(collectAssetResourceIndexGarbage(input)).resolves.toEqual({
      claimed: 0,
      deleted: 0,
      missing: 0,
    });
    expect(remove).toHaveBeenCalledOnce();
  });
});
