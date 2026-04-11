import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { loadAssetsByProject } from "./load";

const server = createTestServer();

const createContext = (): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    getOwnerPlanFeatures: () => Promise.resolve({}),
  }) as unknown as AppContext;

/**
 * hasProjectPermit checks direct ownership via:
 *   GET /Project?id=eq.{id}&userId=eq.{userId}
 * Returning a row grants access. Include this in each test that needs
 * hasProjectPermit to pass.
 */
const projectOwnershipHandler = db.get("Project", () => json({ id: "proj-1" }));

// Asset row with File join as PostgREST returns it (select alias `assetId:id`
// causes the column to appear as `assetId` in the response).
const assetRow = {
  assetId: "asset-1",
  projectId: "proj-1",
  filename: "photo.jpg",
  description: null,
  file: {
    name: "photo.jpg",
    format: "jpg",
    description: null,
    size: 12345,
    createdAt: "2024-01-01T00:00:00.000Z",
    meta: JSON.stringify({ width: 800, height: 600 }),
    status: "UPLOADED",
  },
};

describe("loadAssetsByProject (msw)", () => {
  test("returns formatted assets for an authorised project", async () => {
    server.use(
      projectOwnershipHandler,
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("projectId")).toBe("eq.proj-1");
        expect(url.searchParams.get("file.status")).toBe("eq.UPLOADED");
        return json([assetRow]);
      })
    );

    const result = await loadAssetsByProject("proj-1", createContext());
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "asset-1",
      projectId: "proj-1",
      type: "image",
      meta: { width: 800, height: 600 },
    });
  });

  test("returns empty array when project has no uploaded assets", async () => {
    server.use(
      projectOwnershipHandler,
      db.get("Asset", () => json([]))
    );

    const result = await loadAssetsByProject("proj-1", createContext());
    expect(result).toEqual([]);
  });

  test("throws AuthorizationError when caller lacks access", async () => {
    // Use a project the test user does not own ("proj-denied") so hasProjectPermit
    // returns false. We cannot reuse "proj-1" here because hasProjectPermit is
    // memoized and previous tests have already cached allowed=true for that id.
    server.use(
      // Ownership check: no row found for proj-denied
      db.get("Project", () => json(null)),
      // Workspace fallback: no workspace membership
      db.get("WorkspaceProjectAuthorization", () => json([]))
    );

    await expect(
      loadAssetsByProject("proj-denied", createContext())
    ).rejects.toThrow(AuthorizationError);
  });
});
