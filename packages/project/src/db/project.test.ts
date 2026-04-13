import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { create } from "./project";

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
