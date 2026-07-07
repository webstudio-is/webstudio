import { describe, expect, test } from "vitest";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import {
  createCallerFactory,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { projectRouter } from "./project-router";

const server = createTestServer();
const createCaller = createCallerFactory(projectRouter);

const createContext = (
  overrides: Partial<Pick<AppContext, "authorization" | "planFeatures">> = {}
): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "member-1" },
    planFeatures: defaultPlanFeatures,
    getOwnerPlanFeatures: () =>
      Promise.resolve({
        ...defaultPlanFeatures,
        maxWorkspaces: 20,
      }),
    ...overrides,
  }) as unknown as AppContext;

describe("userPublishCount", () => {
  test("counts publishes for the project owner when called by a workspace member", async () => {
    server.use(
      db.get("Project", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("userId")) {
          return json(null);
        }
        return json({ userId: "owner-1" });
      }),
      db.get("WorkspaceProjectAuthorization", () =>
        json([{ relation: "editors" }])
      ),
      db.get("user_publish_count", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("user_id")).toBe("eq.owner-1");
        return json({ count: 42 });
      })
    );

    const caller = createCaller(createContext());
    const result = await caller.userPublishCount({ projectId: "proj-1" });

    expect(result).toEqual({ success: true, data: 42 });
  });

  test("counts publishes for the caller when projectId is omitted", async () => {
    server.use(
      db.get("user_publish_count", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("user_id")).toBe("eq.member-1");
        return json({ count: 7 });
      })
    );

    const caller = createCaller(createContext());
    const result = await caller.userPublishCount();

    expect(result).toEqual({ success: true, data: 7 });
  });

  test("uses token owner when projectId is omitted for token auth", async () => {
    server.use(
      db.get("user_publish_count", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("user_id")).toBe("eq.token-owner");
        return json({ count: 9 });
      })
    );

    const caller = createCaller(
      createContext({
        authorization: {
          type: "token",
          authToken: "token-1",
          ownerId: "token-owner",
        },
      })
    );
    const result = await caller.userPublishCount();

    expect(result).toEqual({ success: true, data: 9 });
  });

  test("does not count publishes when caller cannot view the project", async () => {
    let publishCountQueried = false;

    server.use(
      db.get("Project", () => json(null)),
      db.get("WorkspaceProjectAuthorization", () => json([])),
      db.get("user_publish_count", () => {
        publishCountQueried = true;
        return json({ count: 0 });
      })
    );

    const caller = createCaller(createContext());
    const result = await caller.userPublishCount({ projectId: "private" });

    expect(result.success).toBe(false);
    if ("error" in result) {
      expect(result.error).toContain("Not authorized");
    }
    expect(publishCountQueried).toBe(false);
  });
});
