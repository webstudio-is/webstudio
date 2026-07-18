import { describe, expect, test } from "vitest";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import { auditAssetResourceIndexObjects } from "./resource-index-orphan-audit";

const server = createTestServer();

describe("resource index orphan audit", () => {
  test("reports missing objects, storage orphans, stale claims, and counts", async () => {
    server.use(
      db.get("AssetResourceIndexRevision", () =>
        json([
          {
            resourceId: "listing",
            revision: "revision-1",
            objectKey: "projects/project-1/resources/listing/one.json",
            gcClaimId: null,
            gcStartedAt: null,
          },
          {
            resourceId: "post",
            revision: "revision-2",
            objectKey: "projects/project-1/resources/post/two.json",
            gcClaimId: "claim-2",
            gcStartedAt: "2026-07-18T00:00:00.000Z",
          },
        ])
      )
    );
    const report = await auditAssetResourceIndexObjects({
      client: testContext.postgrest.client,
      store: {
        listKeys: async (prefix) => {
          expect(prefix).toBe("projects/project-1/resources/");
          return [
            "projects/project-1/resources/listing/one.json",
            "projects/project-1/resources/orphan/unknown.json",
          ];
        },
      },
      projectId: "project-1",
      now: new Date("2026-07-18T02:00:00.000Z"),
      staleClaimMs: 60 * 60 * 1000,
    });

    expect(report.metrics).toEqual({
      databaseObjects: 2,
      storedObjects: 2,
      missingObjects: 1,
      orphanObjects: 1,
      staleClaims: 1,
    });
    expect(report.missingObjects).toEqual([
      expect.objectContaining({ resourceId: "post", revision: "revision-2" }),
    ]);
    expect(report.orphanObjects).toEqual([
      "projects/project-1/resources/orphan/unknown.json",
    ]);
    expect(report.staleClaims).toHaveLength(1);
  });
});
