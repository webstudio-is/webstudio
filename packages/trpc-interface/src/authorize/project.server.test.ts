import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "../context/context.server";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import {
  checkProjectPermit,
  hasProjectPermit,
  getProjectPermit,
  __testing__,
} from "./project.server";

const { isRolePermitted, getWorkspaceOwnerIdForProject } = __testing__;

describe("isRolePermitted", () => {
  describe("workspace owner (own relation)", () => {
    test("own relation grants view permit", () => {
      expect(isRolePermitted(["own"], "view")).toBe(true);
    });

    test("own relation grants edit permit", () => {
      expect(isRolePermitted(["own"], "edit")).toBe(true);
    });

    test("own relation grants build permit", () => {
      expect(isRolePermitted(["own"], "build")).toBe(true);
    });

    test("own relation grants admin permit", () => {
      expect(isRolePermitted(["own"], "admin")).toBe(true);
    });

    test("own relation grants own permit", () => {
      expect(isRolePermitted(["own"], "own")).toBe(true);
    });
  });

  describe("administrators", () => {
    test("grants view permit", () => {
      expect(isRolePermitted(["administrators"], "view")).toBe(true);
    });

    test("grants edit permit", () => {
      expect(isRolePermitted(["administrators"], "edit")).toBe(true);
    });

    test("grants build permit", () => {
      expect(isRolePermitted(["administrators"], "build")).toBe(true);
    });

    test("grants admin permit", () => {
      expect(isRolePermitted(["administrators"], "admin")).toBe(true);
    });

    test("denies own permit", () => {
      expect(isRolePermitted(["administrators"], "own")).toBe(false);
    });
  });

  describe("builders", () => {
    test("grants view permit", () => {
      expect(isRolePermitted(["builders"], "view")).toBe(true);
    });

    test("grants edit permit", () => {
      expect(isRolePermitted(["builders"], "edit")).toBe(true);
    });

    test("grants build permit", () => {
      expect(isRolePermitted(["builders"], "build")).toBe(true);
    });

    test("denies admin permit", () => {
      expect(isRolePermitted(["builders"], "admin")).toBe(false);
    });

    test("denies own permit", () => {
      expect(isRolePermitted(["builders"], "own")).toBe(false);
    });
  });

  describe("editors", () => {
    test("grants view permit", () => {
      expect(isRolePermitted(["editors"], "view")).toBe(true);
    });

    test("grants edit permit", () => {
      expect(isRolePermitted(["editors"], "edit")).toBe(true);
    });

    test("denies build permit", () => {
      expect(isRolePermitted(["editors"], "build")).toBe(false);
    });

    test("denies admin permit", () => {
      expect(isRolePermitted(["editors"], "admin")).toBe(false);
    });

    test("denies own permit", () => {
      expect(isRolePermitted(["editors"], "own")).toBe(false);
    });
  });

  describe("viewers", () => {
    test("grants view permit", () => {
      expect(isRolePermitted(["viewers"], "view")).toBe(true);
    });

    test("denies edit permit", () => {
      expect(isRolePermitted(["viewers"], "edit")).toBe(false);
    });

    test("denies build permit", () => {
      expect(isRolePermitted(["viewers"], "build")).toBe(false);
    });

    test("denies admin permit", () => {
      expect(isRolePermitted(["viewers"], "admin")).toBe(false);
    });

    test("denies own permit", () => {
      expect(isRolePermitted(["viewers"], "own")).toBe(false);
    });
  });

  describe("multiple relations", () => {
    test("uses highest privilege from multiple relations", () => {
      // User has both viewer and builder relations
      expect(isRolePermitted(["viewers", "builders"], "build")).toBe(true);
    });

    test("own in any position grants all", () => {
      expect(isRolePermitted(["viewers", "own"], "own")).toBe(true);
    });
  });

  describe("empty relations", () => {
    test("empty relations deny all permits", () => {
      expect(isRolePermitted([], "view")).toBe(false);
      expect(isRolePermitted([], "edit")).toBe(false);
      expect(isRolePermitted([], "build")).toBe(false);
      expect(isRolePermitted([], "admin")).toBe(false);
      expect(isRolePermitted([], "own")).toBe(false);
    });
  });

  describe("unknown relation strings", () => {
    test("unknown relation denies permit", () => {
      expect(isRolePermitted(["unknown"], "view")).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// MSW integration tests
// ---------------------------------------------------------------------------

const server = createTestServer();

// Each test uses a unique projectId so the memoized `check()` doesn't
// return a cached result from a previous test.
const uid = () => `proj-${Math.random().toString(36).slice(2)}`;

const makeUserCtx = (userId = "user-1", maxWorkspaces = 5): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId },
    getOwnerPlanFeatures: async () => ({
      ...defaultPlanFeatures,
      maxWorkspaces,
    }),
  }) as unknown as AppContext;

// ---------------------------------------------------------------------------
// getWorkspaceOwnerIdForProject
// ---------------------------------------------------------------------------

describe("getWorkspaceOwnerIdForProject (msw)", () => {
  test("returns undefined when project has no workspace", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json({ id: projectId, workspaceId: null }))
    );
    const result = await getWorkspaceOwnerIdForProject(projectId, testContext);
    expect(result).toBeUndefined();
  });

  test("returns workspace owner userId when workspace exists", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json({ id: projectId, workspaceId: "ws-1" })),
      db.get("Workspace", () => json({ id: "ws-1", userId: "owner-99" }))
    );
    const result = await getWorkspaceOwnerIdForProject(projectId, testContext);
    expect(result).toBe("owner-99");
  });

  test("returns undefined when workspace not found", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json({ id: projectId, workspaceId: "ws-gone" })),
      db.get("Workspace", () => json(null))
    );
    const result = await getWorkspaceOwnerIdForProject(projectId, testContext);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// checkProjectPermit — user auth
// ---------------------------------------------------------------------------

describe("checkProjectPermit — user direct owner (msw)", () => {
  test("allows edit when user directly owns the project", async () => {
    const projectId = uid();
    server.use(db.get("Project", () => json({ id: projectId })));
    const allowed = await checkProjectPermit({
      projectId,
      permit: "edit",
      authInfo: { type: "user", userId: "user-1" },
      postgrestClient: testContext.postgrest.client,
    });
    expect(allowed).toBe(true);
  });

  test("allows via workspace member relation", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json(null)),
      db.get("WorkspaceProjectAuthorization", () =>
        json([{ relation: "builders" }])
      )
    );
    const allowed = await checkProjectPermit({
      projectId,
      permit: "build",
      authInfo: { type: "user", userId: "user-2" },
      postgrestClient: testContext.postgrest.client,
    });
    expect(allowed).toBe(true);
  });

  test("denies when user has insufficient workspace relation", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json(null)),
      db.get("WorkspaceProjectAuthorization", () =>
        json([{ relation: "viewers" }])
      )
    );
    const allowed = await checkProjectPermit({
      projectId,
      permit: "edit",
      authInfo: { type: "user", userId: "user-3" },
      postgrestClient: testContext.postgrest.client,
    });
    expect(allowed).toBe(false);
  });

  test("denies when user has no access at all", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json(null)),
      db.get("WorkspaceProjectAuthorization", () => json([]))
    );
    const allowed = await checkProjectPermit({
      projectId,
      permit: "view",
      authInfo: { type: "user", userId: "user-4" },
      postgrestClient: testContext.postgrest.client,
    });
    expect(allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkProjectPermit — token auth
// ---------------------------------------------------------------------------

describe("checkProjectPermit — token auth (msw)", () => {
  test("allows when token exists with matching relation", async () => {
    const projectId = uid();
    server.use(db.get("AuthorizationToken", () => json({ token: "tok-1" })));
    const allowed = await checkProjectPermit({
      projectId,
      permit: "view",
      authInfo: { type: "token", authToken: "tok-1" },
      postgrestClient: testContext.postgrest.client,
    });
    expect(allowed).toBe(true);
  });

  test("denies when token not found", async () => {
    const projectId = uid();
    server.use(db.get("AuthorizationToken", () => json(null)));
    const allowed = await checkProjectPermit({
      projectId,
      permit: "view",
      authInfo: { type: "token", authToken: "tok-missing" },
      postgrestClient: testContext.postgrest.client,
    });
    expect(allowed).toBe(false);
  });

  test("denies 'own' permit for tokens regardless of DB", async () => {
    const projectId = uid();
    const allowed = await checkProjectPermit({
      projectId,
      permit: "own",
      authInfo: { type: "token", authToken: "tok-any" },
      postgrestClient: testContext.postgrest.client,
    });
    expect(allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkProjectPermit — service auth
// ---------------------------------------------------------------------------

describe("checkProjectPermit — service auth", () => {
  test("service auth allows view without DB", async () => {
    const projectId = uid();
    const allowed = await checkProjectPermit({
      projectId,
      permit: "view",
      authInfo: { type: "service" },
      postgrestClient: testContext.postgrest.client,
    });
    expect(allowed).toBe(true);
  });

  test("service auth denies edit", async () => {
    const projectId = uid();
    const allowed = await checkProjectPermit({
      projectId,
      permit: "edit",
      authInfo: { type: "service" },
      postgrestClient: testContext.postgrest.client,
    });
    expect(allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasProjectPermit — workspace downgrade guard
// ---------------------------------------------------------------------------

describe("hasProjectPermit — workspace downgrade guard (msw)", () => {
  test("denies workspace member when owner plan has maxWorkspaces <= 1", async () => {
    const projectId = uid();
    server.use(
      // Per-call routing: ownership check uses userId param; workspaceId lookup does not
      db.get("Project", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("userId")) {
          return json(null);
        }
        return json({ id: projectId, workspaceId: "ws-1" });
      }),
      db.get("WorkspaceProjectAuthorization", () =>
        json([{ relation: "editors" }])
      ),
      db.get("Workspace", () => json({ id: "ws-1", userId: "owner-1" }))
    );
    const ctx = makeUserCtx("user-2", 1);

    const allowed = await hasProjectPermit({ projectId, permit: "edit" }, ctx);
    expect(allowed).toBe(false);
  });

  test("allows workspace member when owner plan has maxWorkspaces > 1", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("userId")) {
          return json(null);
        }
        return json({ id: projectId, workspaceId: "ws-1" });
      }),
      db.get("WorkspaceProjectAuthorization", () =>
        json([{ relation: "editors" }])
      ),
      db.get("Workspace", () => json({ id: "ws-1", userId: "owner-1" }))
    );
    const ctx = makeUserCtx("user-2", 5);

    const allowed = await hasProjectPermit({ projectId, permit: "edit" }, ctx);
    expect(allowed).toBe(true);
  });

  test("anonymous auth always denied without hitting DB", async () => {
    const projectId = uid();
    const ctx = {
      ...testContext,
      authorization: { type: "anonymous" },
      getOwnerPlanFeatures: async () => defaultPlanFeatures,
    } as unknown as AppContext;
    const allowed = await hasProjectPermit({ projectId, permit: "view" }, ctx);
    expect(allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getProjectPermit
// ---------------------------------------------------------------------------

describe("getProjectPermit (msw)", () => {
  test("returns first matching permit from ordered list", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json({ id: projectId })),
      db.get("WorkspaceProjectAuthorization", () => json([]))
    );
    const ctx = makeUserCtx("user-1");

    const permit = await getProjectPermit(
      { projectId, permits: ["own", "admin", "edit"] },
      ctx
    );
    expect(permit).toBe("own");
  });

  test("returns undefined when no permit matches", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json(null)),
      db.get("WorkspaceProjectAuthorization", () => json([]))
    );
    const ctx = makeUserCtx("user-no-access");

    const permit = await getProjectPermit(
      { projectId, permits: ["edit", "view"] },
      ctx
    );
    expect(permit).toBeUndefined();
  });
});
