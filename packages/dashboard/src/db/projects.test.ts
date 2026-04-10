import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { findMany, countByUserId } from "./projects";

const server = createTestServer();

const createContext = (userId = "user-1"): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId },
  }) as unknown as AppContext;

const projectRow = {
  id: "proj-1",
  title: "My Project",
  domain: "my-project",
  userId: "user-1",
  workspaceId: null,
  isDeleted: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  previewImageAsset: null,
  latestBuildVirtual: null,
};

// ---------------------------------------------------------------------------
// countByUserId
// ---------------------------------------------------------------------------

describe("countByUserId (msw)", () => {
  test("returns project count from Content-Range header", async () => {
    server.use(
      db.head("Project", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("userId")).toBe("eq.user-1");
        expect(url.searchParams.get("isDeleted")).toBe("eq.false");
        return empty({
          headers: { "Content-Range": "*/7" },
        });
      })
    );

    const count = await countByUserId({
      userId: "user-1",
      context: createContext(),
    });
    expect(count).toBe(7);
  });

  test("throws AuthorizationError when userId does not match caller", async () => {
    await expect(
      countByUserId({ userId: "other-user", context: createContext("user-1") })
    ).rejects.toThrow(AuthorizationError);
  });
});

// ---------------------------------------------------------------------------
// findMany
// ---------------------------------------------------------------------------

describe("findMany (msw)", () => {
  test("returns projects with empty domainsVirtual when no domains exist", async () => {
    server.use(
      db.get("DashboardProject", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("userId")).toBe("eq.user-1");
        expect(url.searchParams.get("isDeleted")).toBe("eq.false");
        return json([projectRow]);
      }),
      db.get("ProjectDomain", () => json([]))
    );

    const result = await findMany({
      userId: "user-1",
      context: createContext(),
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("proj-1");
    expect(result[0].domainsVirtual).toEqual([]);
  });

  test("throws AuthorizationError when userId does not match caller", async () => {
    await expect(
      findMany({ userId: "other-user", context: createContext("user-1") })
    ).rejects.toThrow(AuthorizationError);
  });

  test("filters by workspaceId when provided and caller is owner", async () => {
    server.use(
      db.get("Workspace", () => json({ id: "ws-1", userId: "user-1" })),
      db.get("DashboardProject", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("workspaceId")).toBe("eq.ws-1");
        return json([{ ...projectRow, workspaceId: "ws-1" }]);
      }),
      db.get("ProjectDomain", () => json([]))
    );

    const result = await findMany({
      userId: "user-1",
      context: createContext(),
      workspaceId: "ws-1",
    });
    expect(result).toHaveLength(1);
    expect(result[0].workspaceId).toBe("ws-1");
  });
});
