import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { PlanRequiredError } from "@webstudio-is/trpc-interface/index.server";
import {
  findMany,
  getTokenInfo,
  getTokenProjectPermits,
  create,
  update,
  remove,
  __testing__,
} from "./authorization-token";
import { authorizationTokenRouter } from "../trpc/authorization-tokens-router";

const { applyTokenPermissions } = __testing__;

// ---------------------------------------------------------------------------
// applyTokenPermissions — pure logic tests
// Verifies the business rules that override stored DB values by relation.
// ---------------------------------------------------------------------------

const baseToken = {
  token: "tok-1",
  projectId: "proj-1",
  name: "test",
  createdAt: "2024-01-01T00:00:00.000Z",
  canClone: false,
  canCopy: false,
  canPublish: true,
  canUseApi: false,
};

describe("applyTokenPermissions", () => {
  test("viewers: canPublish forced to false, canClone/canCopy unchanged", () => {
    const result = applyTokenPermissions({ ...baseToken, relation: "viewers" });
    expect(result.canPublish).toBe(false);
    expect(result.canClone).toBe(false);
    expect(result.canCopy).toBe(false);
  });

  test("editors: canClone forced to false, canCopy forced to true, canPublish unchanged", () => {
    const result = applyTokenPermissions({
      ...baseToken,
      relation: "editors",
      canClone: true,
      canPublish: false,
    });
    expect(result.canClone).toBe(false);
    expect(result.canCopy).toBe(true);
    expect(result.canPublish).toBe(false);
  });

  test("builders: canClone/canCopy true, canPublish forced to false", () => {
    const result = applyTokenPermissions({
      ...baseToken,
      relation: "builders",
      canPublish: true,
    });
    expect(result.canClone).toBe(true);
    expect(result.canCopy).toBe(true);
    expect(result.canPublish).toBe(false);
  });

  test("administrators: canClone/canCopy true, canPublish forced to true", () => {
    const result = applyTokenPermissions({
      ...baseToken,
      relation: "administrators",
      canPublish: false,
    });
    expect(result.canClone).toBe(true);
    expect(result.canCopy).toBe(true);
    expect(result.canPublish).toBe(true);
  });

  test("preserves explicit API capability", () => {
    const result = applyTokenPermissions({
      ...baseToken,
      relation: "viewers",
      canUseApi: true,
    });
    expect(result.canUseApi).toBe(true);
  });
});

describe("getTokenProjectPermits", () => {
  test("maps token relation to project permits", () => {
    expect(getTokenProjectPermits({ relation: "viewers" })).toEqual(["view"]);
    expect(getTokenProjectPermits({ relation: "editors" })).toEqual([
      "view",
      "edit",
    ]);
    expect(getTokenProjectPermits({ relation: "builders" })).toEqual([
      "view",
      "edit",
      "build",
    ]);
    expect(getTokenProjectPermits({ relation: "administrators" })).toEqual([
      "view",
      "edit",
      "build",
      "admin",
    ]);
  });
});

// ---------------------------------------------------------------------------
// MSW integration tests — verifies actual DB queries
// ---------------------------------------------------------------------------

const server = createTestServer();

const createContext = (allowAdditionalPermissions = true): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    planFeatures: { allowAdditionalPermissions },
    getOwnerPlanFeatures: () => Promise.resolve({}),
  }) as unknown as AppContext;

/**
 * hasProjectPermit checks direct ownership via:
 *   GET /Project?id=eq.{id}&userId=eq.{userId}&select=id
 * Returning a row makes it return true for any permit.
 * Include this in server.use() for every test that calls a function
 * gated by authorizeProject.hasProjectPermit.
 */
const projectOwnershipHandler = db.get("Project", () => json({ id: "proj-1" }));

const tokenRow = {
  token: "tok-abc",
  projectId: "proj-1",
  name: "My Token",
  relation: "builders",
  canClone: false,
  canCopy: false,
  canPublish: true,
  canUseApi: false,
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("getTokenInfo (msw)", () => {
  // getTokenInfo does not call hasProjectPermit — no Project handler needed.
  test("returns token with permissions applied for builders relation", async () => {
    server.use(db.get("AuthorizationToken", () => json(tokenRow)));

    const result = await getTokenInfo("tok-abc", createContext());
    // builders rule: canClone=true, canCopy=true, canPublish=false
    expect(result.canClone).toBe(true);
    expect(result.canCopy).toBe(true);
    expect(result.canPublish).toBe(false);
  });

  test("throws AuthorizationError when token not found", async () => {
    server.use(db.get("AuthorizationToken", () => json(null)));

    await expect(getTokenInfo("unknown", createContext())).rejects.toThrow(
      "Authorization token not found"
    );
  });
});

describe("findMany (msw)", () => {
  test("returns tokens with permissions applied, ordered by createdAt", async () => {
    server.use(
      projectOwnershipHandler,
      db.get("AuthorizationToken", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("projectId")).toBe("eq.proj-1");
        return json([
          { ...tokenRow, relation: "administrators", canPublish: false },
        ]);
      })
    );

    const result = await findMany({ projectId: "proj-1" }, createContext());
    expect(result).toHaveLength(1);
    // administrators rule: canPublish=true
    expect(result[0].canPublish).toBe(true);
  });
});

describe("create (msw)", () => {
  test("inserts a new token and returns the rows", async () => {
    const newRow = {
      ...tokenRow,
      relation: "viewers" as const,
      token: "tok-new",
      canUseApi: true,
    };
    server.use(
      projectOwnershipHandler,
      db.post("AuthorizationToken", async ({ request }) => {
        await expect(request.json()).resolves.toMatchObject({
          canUseApi: true,
        });
        return json([newRow], { status: 201 });
      })
    );

    const result = await create(
      {
        projectId: "proj-1",
        relation: "viewers",
        name: "Viewer Token",
        canUseApi: true,
      },
      createContext()
    );
    expect(result[0].token).toBe("tok-new");
    expect(result[0].canUseApi).toBe(true);
  });

  test("rejects API capability when plan does not allow it", async () => {
    server.use(projectOwnershipHandler);

    const promise = create(
      {
        projectId: "proj-1",
        relation: "viewers",
        name: "Viewer Token",
        canUseApi: true,
      },
      createContext(false)
    );
    await expect(promise).rejects.toThrow(PlanRequiredError);
    await expect(promise).rejects.toMatchObject({ code: "PLAN_REQUIRED" });
  });

  test("maps API capability plan errors to forbidden tRPC errors", async () => {
    server.use(projectOwnershipHandler);

    const caller = authorizationTokenRouter.createCaller(createContext(false));

    await expect(
      caller.create({
        projectId: "proj-1",
        relation: "viewers",
        name: "Viewer Token",
        canUseApi: true,
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "API permission requires an upgrade.",
    });
  });
});

describe("update (msw)", () => {
  test("updates token relation and returns updated row", async () => {
    const updatedRow = {
      ...tokenRow,
      relation: "editors" as const,
      canUseApi: true,
    };
    server.use(
      projectOwnershipHandler,
      // previous token fetch
      db.get("AuthorizationToken", () => json(tokenRow)),
      // update
      db.patch("AuthorizationToken", async ({ request }) => {
        await expect(request.json()).resolves.toMatchObject({
          canUseApi: true,
        });
        return json(updatedRow);
      })
    );

    const result = await update(
      "proj-1",
      { token: "tok-abc", relation: "editors", canUseApi: true },
      createContext()
    );
    expect(result.relation).toBe("editors");
    expect(result.canUseApi).toBe(true);
  });

  test("rejects API capability update when plan does not allow it", async () => {
    server.use(
      projectOwnershipHandler,
      db.get("AuthorizationToken", () => json(tokenRow))
    );

    const promise = update(
      "proj-1",
      { token: "tok-abc", relation: "editors", canUseApi: true },
      createContext(false)
    );
    await expect(promise).rejects.toThrow(PlanRequiredError);
    await expect(promise).rejects.toMatchObject({ code: "PLAN_REQUIRED" });
  });

  test("maps API capability update plan errors to forbidden tRPC errors", async () => {
    server.use(
      projectOwnershipHandler,
      db.get("AuthorizationToken", () => json(tokenRow))
    );

    const caller = authorizationTokenRouter.createCaller(createContext(false));

    await expect(
      caller.update({
        projectId: "proj-1",
        token: "tok-abc",
        name: "My Token",
        relation: "editors",
        canClone: false,
        canCopy: true,
        canPublish: false,
        canUseApi: true,
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "API permission requires an upgrade.",
    });
  });

  test("allows preserving existing API capability when plan no longer allows it", async () => {
    const existingToken = { ...tokenRow, canUseApi: true };
    const updatedRow = {
      ...existingToken,
      name: "Renamed Token",
    };
    server.use(
      projectOwnershipHandler,
      db.get("AuthorizationToken", () => json(existingToken)),
      db.patch("AuthorizationToken", async ({ request }) => {
        await expect(request.json()).resolves.toMatchObject({
          name: "Renamed Token",
          canUseApi: true,
        });
        return json(updatedRow);
      })
    );

    const result = await update(
      "proj-1",
      {
        token: "tok-abc",
        name: "Renamed Token",
        relation: "builders",
        canUseApi: true,
      },
      createContext(false)
    );
    expect(result.name).toBe("Renamed Token");
    expect(result.canUseApi).toBe(true);
  });
});

describe("remove (msw)", () => {
  test("deletes token and returns deleted row", async () => {
    server.use(
      projectOwnershipHandler,
      db.delete("AuthorizationToken", () => json(tokenRow))
    );

    const result = await remove(
      { projectId: "proj-1", token: "tok-abc" },
      createContext()
    );
    expect(result.token).toBe("tok-abc");
  });
});
