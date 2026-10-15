import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { create, loadById, ProjectNotFoundError } from "./project";

const server = createTestServer();

const createContext = (
  planOverrides: Partial<typeof defaultPlanFeatures> = {}
): AppContext =>
  ({
    authorization: { type: "user", userId: "owner-1" },
    planFeatures: defaultPlanFeatures,
    purchases: [],
    trpcCache: new Map(),
    domain: {},
    deployment: {},
    entri: {},
    ...testContext,
    createTokenContext: () => {},
    getOwnerPlanFeatures: async () => ({
      ...defaultPlanFeatures,
      ...planOverrides,
    }),
  }) as unknown as AppContext;

describe("create — maxProjectsAllowedPerUser guard", () => {
  test("throws when owner is at the project limit", async () => {
    server.use(
      // Project count HEAD — owner already has 100 projects
      db.head("Project", () => empty({ headers: { "Content-Range": "*/100" } }))
    );

    const ctx = createContext({ maxProjectsAllowedPerUser: 100 });

    await expect(create({ title: "New Project" }, ctx)).rejects.toThrow(
      "You've reached the project limit"
    );
  });

  test("proceeds when owner is under the project limit", async () => {
    const projectRow = {
      id: "proj-new",
      title: "New Project",
      userId: "owner-1",
      workspaceId: null,
      domain: "new-project",
      isDeleted: false,
    };

    server.use(
      // Project count HEAD — owner has 99 projects, limit is 100
      db.head("Project", () => empty({ headers: { "Content-Range": "*/99" } })),
      // Project insert
      db.post("Project", () => json([projectRow], { status: 201 })),
      // Project update (assign userId)
      db.patch("Project", () => json(projectRow)),
      // createBuild inserts into Build table
      db.post("Build", () => empty({ status: 201 }))
    );

    const ctx = createContext({ maxProjectsAllowedPerUser: 100 });

    const result = await create({ title: "New Project" }, ctx);
    expect(result).toMatchObject({ id: "proj-new", title: "New Project" });
  });
});

describe("loadById", () => {
  beforeEach(() => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  test("treats an absent project as an explicit not-found result", async () => {
    server.use(db.get("Project", () => json([])));
    const result = loadById("missing-project", createContext());
    await expect(result).rejects.toBeInstanceOf(ProjectNotFoundError);
    await expect(result).rejects.toMatchObject({
      code: "NOT_FOUND",
      cause: { webstudioCode: "NOT_FOUND" },
    });
  });

  test("returns the unique project with its optional static build", async () => {
    server.use(
      db.get("Project", () =>
        json([{ id: "project-1", latestStaticBuild: [] }])
      )
    );
    await expect(loadById("project-1", createContext())).resolves.toMatchObject(
      { id: "project-1", latestStaticBuild: null }
    );
  });

  test("preserves database failures instead of reporting a missing project", async () => {
    server.use(
      db.get("Project", () =>
        json(
          { code: "08006", message: "Database unavailable" },
          { status: 503 }
        )
      )
    );
    await expect(loadById("project-1", createContext())).rejects.toMatchObject({
      code: "08006",
    });
  });
});
