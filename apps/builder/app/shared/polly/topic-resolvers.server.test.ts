import { describe, test, expect, afterEach } from "vitest";
import {
  createTestServer,
  db,
  testContext,
  json,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { resolveTopics } from "./topic-resolvers.server";

const server = createTestServer();

afterEach(() => {
  delete process.env.PLANS;
});

const createContext = (userId = "user-1"): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId },
  }) as unknown as AppContext;

const anonymousContext = {
  ...testContext,
  authorization: { type: "anonymous" },
} as unknown as AppContext;

// Helper: member row with workspace embedded
const memberRow = (workspaceId: string, ownerId: string, name: string) => ({
  workspaceId,
  workspace: { userId: ownerId, name },
});

// ─── seatSuspended ─────────────────────────────────────────────

describe("notifications (msw)", () => {
  test("returns empty list for non-user authorization", async () => {
    const result = await resolveTopics(["notifications"], anonymousContext);
    expect(result.notifications).toEqual([]);
  });
});

describe("seatSuspended (msw)", () => {
  test("returns false for non-user authorization", async () => {
    const result = await resolveTopics(["seatSuspended"], anonymousContext);
    expect(result.seatSuspended).toBe(false);
  });

  test("returns false when user has no workspace memberships", async () => {
    server.use(db.get("WorkspaceMember", () => json([])));

    const result = await resolveTopics(["seatSuspended"], createContext());
    expect(result.seatSuspended).toBe(false);
  });

  test("returns false when all memberships are user's own workspaces", async () => {
    server.use(
      db.get("WorkspaceMember", () =>
        // workspace.userId === userId → filtered out as own workspace
        json([memberRow("ws-1", "user-1", "My Workspace")])
      )
    );

    const result = await resolveTopics(
      ["seatSuspended"],
      createContext("user-1")
    );
    expect(result.seatSuspended).toBe(false);
  });

  test("returns workspace name when owner has default (free) plan", async () => {
    server.use(
      db.get("WorkspaceMember", () =>
        json([memberRow("ws-owner", "owner-1", "Owner Workspace")])
      ),
      // getPlanInfo: no user products → defaultPlanFeatures (maxWorkspaces=1 → suspended)
      db.get("UserProduct", () => json([]))
    );

    const result = await resolveTopics(
      ["seatSuspended"],
      createContext("user-1")
    );
    expect(result.seatSuspended).toBe("Owner Workspace");
  });

  test("returns false when owner has upgraded plan (maxWorkspaces > 1)", async () => {
    process.env.PLANS = JSON.stringify([
      { name: "Pro", features: { maxWorkspaces: 5 } },
    ]);

    server.use(
      db.get("WorkspaceMember", () =>
        json([memberRow("ws-owner", "owner-1", "Owner Workspace")])
      ),
      db.get("UserProduct", () =>
        json([
          { userId: "owner-1", productId: "prod-pro", subscriptionId: null },
        ])
      ),
      db.get("Product", () => json([{ id: "prod-pro", name: "Pro", meta: {} }]))
    );

    const result = await resolveTopics(
      ["seatSuspended"],
      createContext("user-1")
    );
    expect(result.seatSuspended).toBe(false);
  });
});
