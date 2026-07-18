import { describe, expect, test } from "vitest";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import {
  AssetResourceIndexPublicationBlockedError,
  assertAssetResourceIndexesPublishable,
} from "./resource-index-publication";

const server = createTestServer();
const request = {
  client: testContext.postgrest.client,
  projectId: "project-1",
  resources: [
    { resourceId: "listing", queryHash: `sha256:${"a".repeat(64)}` },
  ],
  assetRevision: `sha256:${"b".repeat(64)}`,
};

describe("asset resource publication gate", () => {
  test("allows a fully matching active snapshot", async () => {
    server.use(
      db.post(
        "rpc/get_unpublishable_asset_resource_indexes",
        async ({ request: rpcRequest }) => {
          expect(await rpcRequest.json()).toEqual({
            p_project_id: request.projectId,
            p_resources: request.resources,
            p_asset_revision: request.assetRevision,
          });
          return json([]);
        }
      )
    );
    await expect(
      assertAssetResourceIndexesPublishable(request)
    ).resolves.toBeUndefined();
  });

  test("blocks publication with stable per-resource mismatch reasons", async () => {
    const issues = [
      {
        resourceId: "listing",
        reason: "INDEX_QUERY_HASH_MISMATCH" as const,
      },
    ];
    server.use(
      db.post("rpc/get_unpublishable_asset_resource_indexes", () =>
        json(issues)
      )
    );
    await expect(assertAssetResourceIndexesPublishable(request)).rejects.toEqual(
      expect.objectContaining<Partial<AssetResourceIndexPublicationBlockedError>>({
        issues,
      })
    );
  });
});
