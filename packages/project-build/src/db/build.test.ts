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
import {
  loadRawBuildById,
  loadBuildById,
  loadDevBuildByProjectId,
  createBuild,
  unpublishBuild,
} from "./build";

const server = createTestServer();

const uid = () => `proj-${Math.random().toString(36).slice(2)}`;

const createContext = (userId = "user-1"): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId },
    getOwnerPlanFeatures: async () => ({}),
  }) as unknown as AppContext;

/** hasProjectPermit: return the row when userId param is in the query */
const ownershipHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: url.searchParams.get("id")?.replace("eq.", "") });
  }
  return json(null);
});

/** Minimal Build row that satisfies parseCompactBuild */
const buildRow = {
  id: "build-1",
  projectId: "proj-1",
  version: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pages: JSON.stringify({
    meta: {},
    homePage: {
      id: "page-1",
      name: "Home",
      path: "/",
      title: '"Home"',
      meta: {},
      rootInstanceId: "body-1",
      systemDataSourceId: undefined,
    },
    pages: [],
  }),
  breakpoints: JSON.stringify([]),
  styles: JSON.stringify([]),
  styleSources: JSON.stringify([]),
  styleSourceSelections: JSON.stringify([]),
  props: JSON.stringify([]),
  dataSources: JSON.stringify([]),
  resources: JSON.stringify([]),
  instances: JSON.stringify([
    { id: "body-1", type: "instance", component: "Body", children: [] },
  ]),
  deployment: null,
  marketplaceProduct: JSON.stringify({}),
};

// ---------------------------------------------------------------------------
// loadRawBuildById
// ---------------------------------------------------------------------------

describe("loadRawBuildById (msw)", () => {
  test("returns raw build row", async () => {
    server.use(db.get("Build", () => json([buildRow])));
    const result = await loadRawBuildById(createContext(), "build-1");
    expect(result.id).toBe("build-1");
  });

  test("throws when build not found", async () => {
    server.use(db.get("Build", () => json([])));
    await expect(loadRawBuildById(createContext(), "missing")).rejects.toThrow(
      "0 row(s)"
    );
  });

  test("throws when multiple rows returned", async () => {
    server.use(
      db.get("Build", () => json([buildRow, { ...buildRow, id: "build-2" }]))
    );
    await expect(loadRawBuildById(createContext(), "build-1")).rejects.toThrow(
      "2 row(s)"
    );
  });
});

// ---------------------------------------------------------------------------
// loadBuildById (delegates to loadRawBuildById + parseCompactBuild)
// ---------------------------------------------------------------------------

describe("loadBuildById (msw)", () => {
  test("returns parsed build with id and projectId", async () => {
    server.use(db.get("Build", () => json([buildRow])));
    const result = await loadBuildById(createContext(), "build-1");
    expect(result.id).toBe("build-1");
    expect(result.projectId).toBe("proj-1");
  });
});

// ---------------------------------------------------------------------------
// loadDevBuildByProjectId
// ---------------------------------------------------------------------------

describe("loadDevBuildByProjectId (msw)", () => {
  test("returns the dev build (no deployment)", async () => {
    server.use(db.get("Build", () => json([buildRow])));
    const result = await loadDevBuildByProjectId(createContext(), "proj-1");
    expect(result.projectId).toBe("proj-1");
  });

  test("throws when no dev build found", async () => {
    server.use(db.get("Build", () => json([])));
    await expect(
      loadDevBuildByProjectId(createContext(), "proj-1")
    ).rejects.toThrow("No dev build found");
  });
});

// ---------------------------------------------------------------------------
// createBuild
// ---------------------------------------------------------------------------

describe("createBuild (msw)", () => {
  test("inserts a new build row", async () => {
    let insertedRow: unknown;
    server.use(
      db.post("Build", async ({ request }) => {
        insertedRow = await request.json();
        return empty({ status: 201 });
      })
    );

    await createBuild({ projectId: "proj-1" }, createContext());
    expect(insertedRow).toMatchObject({ projectId: "proj-1" });
  });

  test("throws when insert fails", async () => {
    server.use(
      db.post("Build", () =>
        json({ message: "constraint violation" }, { status: 409 })
      )
    );

    await expect(
      createBuild({ projectId: "proj-1" }, createContext())
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// unpublishBuild
// ---------------------------------------------------------------------------

describe("unpublishBuild (msw)", () => {
  test("throws AuthorizationError when caller lacks edit access", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json(null)),
      db.get("WorkspaceProjectAuthorization", () => json([]))
    );

    await expect(
      unpublishBuild({ projectId, domain: "example.com" }, createContext())
    ).rejects.toThrow(AuthorizationError);
  });

  test("throws when domain is not published", async () => {
    const projectId = uid();
    server.use(
      ownershipHandler,
      // no builds with deployment containing example.com
      db.get("Build", () => json([]))
    );

    await expect(
      unpublishBuild({ projectId, domain: "example.com" }, createContext())
    ).rejects.toThrow("is not published");
  });

  test("deletes build when it has only the one domain", async () => {
    const projectId = uid();
    let buildDeleted = false;
    const deployment = JSON.stringify({
      destination: "saas",
      domains: ["example.com"],
    });

    server.use(
      ownershipHandler,
      db.get("Build", () => json([{ id: "build-prod", deployment }])),
      db.delete("Build", () => {
        buildDeleted = true;
        return empty({ status: 204 });
      })
    );

    await unpublishBuild({ projectId, domain: "example.com" }, createContext());
    expect(buildDeleted).toBe(true);
  });

  test("updates build deployment when it has multiple domains", async () => {
    const projectId = uid();
    let updatedDeployment: unknown;
    const deployment = JSON.stringify({
      destination: "saas",
      domains: ["example.com", "other.com"],
    });

    server.use(
      ownershipHandler,
      db.get("Build", () => json([{ id: "build-prod", deployment }])),
      db.patch("Build", async ({ request }) => {
        updatedDeployment = await request.json();
        return json({ id: "build-prod" });
      })
    );

    await unpublishBuild({ projectId, domain: "example.com" }, createContext());

    expect(updatedDeployment).toMatchObject({
      deployment: expect.stringContaining("other.com"),
    });
    expect(updatedDeployment).toMatchObject({
      deployment: expect.not.stringContaining("example.com"),
    });
  });
});
