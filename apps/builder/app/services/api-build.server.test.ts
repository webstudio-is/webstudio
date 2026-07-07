import { afterEach, describe, expect, test, vi } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { CompactBuild } from "@webstudio-is/project-build";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import { buildPatchTransaction } from "@webstudio-is/protocol";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import * as projectApi from "@webstudio-is/project/index.server";
import * as projectBuild from "@webstudio-is/project-build/index.server";
import type { z } from "zod";
import {
  commitBuildPatch,
  commitBuildTransactions,
  createBuildSnapshot,
  loadBuildByProjectVersion,
  loadReadableDevBuild,
  serializeProjectSummary,
} from "./api-build.server";

const server = createTestServer();

type ProjectSummaryInput = Parameters<typeof serializeProjectSummary>[0];
type SnapshotBuildInput = Parameters<typeof createBuildSnapshot>[0]["build"];

const createContext = (
  allowAdditionalPermissions: boolean,
  authorization: AppContext["authorization"] = {
    type: "token",
    authToken: "secret-token",
    ownerId: "user-1",
  }
) =>
  ({
    authorization,
    planFeatures: {
      allowAdditionalPermissions,
    },
  }) as AppContext;

const createToken = (
  overrides: Partial<Awaited<ReturnType<typeof authDb.getTokenInfo>>> = {}
) =>
  ({
    token: "token-1",
    projectId: "project-1",
    name: "Token",
    relation: "builders",
    createdAt: "2024-01-01T00:00:00.000Z",
    canClone: true,
    canCopy: true,
    canPublish: false,
    canUseApi: true,
    ...overrides,
  }) as Awaited<ReturnType<typeof authDb.getTokenInfo>>;

const createBuildRow = (overrides: Record<string, unknown> = {}) => ({
  id: "build-1",
  projectId: "project-1",
  version: 3,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  pages: JSON.stringify({
    meta: {},
    homePage: {
      id: "page-1",
      name: "Home",
      path: "",
      title: "Home",
      meta: {},
      rootInstanceId: "root-1",
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
    { id: "root-1", type: "instance", component: "Body", children: [] },
  ]),
  deployment: null,
  marketplaceProduct: JSON.stringify({}),
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api build loading", () => {
  test("loads a specific project build version", async () => {
    server.use(db.get("Build", () => json([createBuildRow()])));

    await expect(
      loadBuildByProjectVersion(testContext as AppContext, "project-1", 3)
    ).resolves.toMatchObject({
      id: "build-1",
      projectId: "project-1",
      version: 3,
    });
  });

  test("throws not found when project build version is missing", async () => {
    server.use(db.get("Build", () => json([])));

    await expect(
      loadBuildByProjectVersion(testContext as AppContext, "project-1", 99)
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Build version not found for project",
    });
  });

  test("checks view permission before loading readable dev build", async () => {
    const ctx = createContext(true);
    const build = { id: "build-1" } as Awaited<
      ReturnType<typeof projectBuild.loadDevBuildByProjectId>
    >;
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    const loadDevBuild = vi
      .spyOn(projectBuild, "loadDevBuildByProjectId")
      .mockResolvedValue(build);

    await expect(loadReadableDevBuild(ctx, "project-1")).resolves.toBe(build);

    expect(loadDevBuild).toHaveBeenCalledWith(ctx, "project-1");
  });
});

describe("api build patch commits", () => {
  const build = {
    id: "build",
    projectId: "project",
    version: 1,
  } as CompactBuild;
  const transaction: z.infer<typeof buildPatchTransaction> = {
    id: "transaction",
    payload: [
      {
        namespace: "pages",
        patches: [{ op: "replace", path: ["meta", "siteName"], value: "Site" }],
      },
    ],
  };

  test("commits transactions and semantic payloads", async () => {
    const ctx = createContext(true);
    const patchBuild = vi
      .spyOn(projectApi, "patchBuild")
      .mockResolvedValue({ status: "ok", version: 2 });

    await expect(
      commitBuildTransactions({
        ctx,
        projectId: "project",
        buildId: "build",
        clientVersion: 1,
        transactions: [transaction],
      })
    ).resolves.toEqual({ version: 2 });
    await expect(
      commitBuildPatch({
        build,
        ctx,
        projectId: "project",
        payload: transaction.payload,
      })
    ).resolves.toEqual({ version: 2 });

    expect(patchBuild).toHaveBeenNthCalledWith(
      1,
      {
        buildId: "build",
        projectId: "project",
        clientVersion: 1,
        transactions: [transaction],
      },
      ctx
    );
    expect(patchBuild).toHaveBeenNthCalledWith(
      2,
      {
        buildId: "build",
        projectId: "project",
        clientVersion: 1,
        transactions: [
          {
            id: expect.any(String),
            payload: transaction.payload,
          },
        ],
      },
      ctx
    );
  });

  test("maps patch conflicts and errors to TRPC errors", async () => {
    const ctx = createContext(true);
    const patchBuild = vi.spyOn(projectApi, "patchBuild");

    patchBuild.mockResolvedValueOnce({
      status: "version_mismatched",
      errors: "Version changed",
    });
    await expect(
      commitBuildTransactions({
        ctx,
        projectId: "project",
        buildId: "build",
        clientVersion: 1,
        transactions: [transaction],
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Version changed",
    });

    patchBuild.mockResolvedValueOnce({
      status: "error",
      errors: "Invalid patch",
    });
    await expect(
      commitBuildTransactions({
        ctx,
        projectId: "project",
        buildId: "build",
        clientVersion: 1,
        transactions: [transaction],
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid patch",
    });
  });
});

describe("api build snapshot", () => {
  test("returns only requested build namespaces", () => {
    const tokenStyleSource = {
      type: "token" as const,
      id: "token-1",
      name: "Primary",
    };
    const localStyleSource = { type: "local" as const, id: "local-1" };
    const build = {
      id: "build-1",
      projectId: "project-1",
      version: 7,
      pages: createDefaultPages({ rootInstanceId: "root-1" }),
      instances: [{ type: "instance", id: "root-1", component: "Body" }],
      props: [],
      styles: [],
      styleSources: [tokenStyleSource, localStyleSource],
      styleSourceSelections: [],
      resources: [],
      dataSources: [],
      breakpoints: [],
    } as unknown as SnapshotBuildInput;

    expect(
      createBuildSnapshot({
        build,
        include: new Set(["designTokens", "instances"]),
        projectId: "project-1",
      })
    ).toEqual({
      projectId: "project-1",
      buildId: "build-1",
      version: 7,
      designTokens: [tokenStyleSource],
      instances: [{ type: "instance", id: "root-1", component: "Body" }],
    });
  });

  test("returns page folders and data namespaces when requested", () => {
    const pages = createDefaultPages({ rootInstanceId: "root-1" });
    pages.meta = { siteName: "Acme" };
    pages.compiler = { atomicStyles: true };
    pages.redirects = [{ old: "/old", new: "/new", status: "301" }];
    const build = {
      id: "build-1",
      projectId: "project-1",
      version: 7,
      pages,
      instances: [],
      props: [],
      styles: [],
      styleSources: [],
      styleSourceSelections: [],
      resources: [{ id: "resource-1" }],
      dataSources: [{ id: "variable-1" }],
      breakpoints: [{ id: "breakpoint-1" }],
      marketplaceProduct: { categories: ["template"] },
    } as unknown as SnapshotBuildInput;

    expect(
      createBuildSnapshot({
        build,
        include: new Set([
          "pages",
          "folders",
          "resources",
          "variables",
          "breakpoints",
          "marketplaceProduct",
        ]),
        projectId: "project-1",
      })
    ).toEqual(
      expect.objectContaining({
        projectId: "project-1",
        buildId: "build-1",
        version: 7,
        homePageId: build.pages.homePageId,
        rootFolderId: build.pages.rootFolderId,
        meta: { siteName: "Acme" },
        compiler: { atomicStyles: true },
        redirects: [{ old: "/old", new: "/new", status: "301" }],
        resources: [{ id: "resource-1" }],
        variables: [{ id: "variable-1" }],
        breakpoints: [{ id: "breakpoint-1" }],
        marketplaceProduct: { categories: ["template"] },
      })
    );
  });
});

describe("api project serialization", () => {
  test("uses latest virtual build time as project updated time", () => {
    const project = {
      id: "project-1",
      title: "Project",
      domain: "example.com",
      createdAt: "2024-01-01T00:00:00.000Z",
      latestBuildVirtual: {
        createdAt: "2024-01-03T00:00:00.000Z",
      },
      latestStaticBuild: {
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
    } as unknown as ProjectSummaryInput;

    expect(serializeProjectSummary(project)).toEqual({
      id: "project-1",
      name: "Project",
      domain: "example.com",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-03T00:00:00.000Z",
    });
  });

  test("falls back to latest static build and then project creation time", () => {
    expect(
      serializeProjectSummary({
        id: "project-1",
        title: "Project",
        domain: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        latestBuildVirtual: null,
        latestStaticBuild: {
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      } as unknown as ProjectSummaryInput)
    ).toEqual({
      id: "project-1",
      name: "Project",
      domain: undefined,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });

    expect(
      serializeProjectSummary({
        id: "project-1",
        title: "Project",
        domain: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        latestBuildVirtual: null,
        latestStaticBuild: null,
      } as unknown as ProjectSummaryInput)
    ).toEqual({
      id: "project-1",
      name: "Project",
      domain: undefined,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });
  });

  test("throws not found when project is missing", () => {
    expect(() =>
      serializeProjectSummary(null as unknown as ProjectSummaryInput)
    ).toThrow("Project not found");
  });
});
