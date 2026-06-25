import { afterEach, describe, expect, test, vi } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import { __testing__ } from "./api-router.server";

const {
  assertApiTokenPermit,
  assertApiProjectPermit,
  createBuildSnapshot,
  getTokenPermits,
  serializeAssetList,
  serializeDesignTokens,
  serializeProjectSummary,
  serializeStyleDeclarations,
  serializeTextNodes,
} = __testing__;

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

const createAsset = (id: string, name: string, size = 1) =>
  ({
    id,
    projectId: "project-1",
    name,
    type: "image",
    size,
    format: "png",
    createdAt: "2024-01-01T00:00:00.000Z",
    description: null,
  }) as never;

const createBuildWithAssetReference = (assetId: string) =>
  ({
    pages: createDefaultPages({ rootInstanceId: "root-1" }),
    props: [{ id: "prop-1", instanceId: "root-1", value: assetId }],
    styles: [],
    resources: [],
    dataSources: [],
  }) as never;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api router permits", () => {
  test("adds api permit only when token and plan both allow it", () => {
    const token = createToken();

    expect(getTokenPermits(token, createContext(true))).toEqual([
      "view",
      "edit",
      "build",
      "api",
    ]);
    expect(getTokenPermits(token, createContext(false))).toEqual([
      "view",
      "edit",
      "build",
    ]);
    expect(
      getTokenPermits(
        {
          ...token,
          canUseApi: false,
        },
        createContext(true)
      )
    ).toEqual(["view", "edit", "build"]);
  });

  test("maps token relation to project permits", () => {
    expect(
      getTokenPermits(createToken({ relation: "viewers" }), createContext(true))
    ).toEqual(["view", "api"]);
    expect(
      getTokenPermits(createToken({ relation: "editors" }), createContext(true))
    ).toEqual(["view", "edit", "api"]);
    expect(
      getTokenPermits(
        createToken({ relation: "builders" }),
        createContext(true)
      )
    ).toEqual(["view", "edit", "build", "api"]);
    expect(
      getTokenPermits(
        createToken({ relation: "administrators" }),
        createContext(true)
      )
    ).toEqual(["view", "edit", "build", "admin", "api"]);
  });

  test("requires token auth for project-scoped api procedures", async () => {
    await expect(
      assertApiProjectPermit(
        createContext(true, {
          type: "user",
          userId: "user-1",
          sessionCreatedAt: 0,
          isLoggedInToBuilder: async () => true,
        }),
        "project-1",
        "view"
      )
    ).rejects.toThrow(AuthorizationError);
  });

  test("rejects tokens from another project", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ projectId: "project-2" })
    );

    await expect(
      assertApiProjectPermit(createContext(true), "project-1", "view")
    ).rejects.toThrow("Authorization token is not valid for project");
  });

  test("rejects tokens without api permission", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ canUseApi: false })
    );

    await expect(assertApiTokenPermit(createContext(true))).rejects.toThrow(
      "Authorization token cannot use Builder API"
    );
    await expect(
      assertApiProjectPermit(createContext(true), "project-1", "view")
    ).rejects.toThrow("Authorization token cannot use Builder API");
  });

  test("rejects tokens when current plan does not allow api permission", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());

    await expect(
      assertApiProjectPermit(createContext(false), "project-1", "view")
    ).rejects.toThrow("Authorization token cannot use Builder API");
  });

  test("rejects tokens without the required relation permit", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "viewers" })
    );

    await expect(
      assertApiProjectPermit(createContext(true), "project-1", "edit")
    ).rejects.toThrow("Authorization token does not have edit permission");
  });

  test("checks project authorization after token permission checks", async () => {
    const hasProjectPermit = vi
      .spyOn(authorizeProject, "hasProjectPermit")
      .mockResolvedValue(false);
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());

    await expect(
      assertApiProjectPermit(createContext(true), "project-1", "view")
    ).rejects.toThrow("You don't have access to this project");

    expect(hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "project-1", permit: "view" },
      expect.anything()
    );
  });

  test("returns token and effective permits when access is allowed", async () => {
    const token = createToken({ relation: "editors" });
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(token);

    await expect(
      assertApiProjectPermit(createContext(true), "project-1", "edit")
    ).resolves.toEqual({
      token,
      permits: ["view", "edit", "api"],
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
    } as never;

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
    const build = {
      id: "build-1",
      projectId: "project-1",
      version: 7,
      pages: createDefaultPages({ rootInstanceId: "root-1" }),
      instances: [],
      props: [],
      styles: [],
      styleSources: [],
      styleSourceSelections: [],
      resources: [{ id: "resource-1" }],
      dataSources: [{ id: "variable-1" }],
      breakpoints: [{ id: "breakpoint-1" }],
    } as never;

    expect(
      createBuildSnapshot({
        build,
        include: new Set([
          "pages",
          "folders",
          "resources",
          "variables",
          "breakpoints",
        ]),
        projectId: "project-1",
      })
    ).toEqual(
      expect.objectContaining({
        projectId: "project-1",
        buildId: "build-1",
        version: 7,
        resources: [{ id: "resource-1" }],
        variables: [{ id: "variable-1" }],
        breakpoints: [{ id: "breakpoint-1" }],
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
    } as never;

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
      } as never)
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
      } as never)
    ).toEqual({
      id: "project-1",
      name: "Project",
      domain: undefined,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });
  });

  test("throws not found when project is missing", () => {
    expect(() => serializeProjectSummary(null as never)).toThrow(
      "Project not found"
    );
  });
});

describe("api read serialization", () => {
  test("lists text and expression children", () => {
    const build = {
      pages: createDefaultPages({ rootInstanceId: "root-1" }),
      instances: [
        {
          type: "instance",
          id: "root-1",
          component: "Body",
          children: [
            { type: "text", value: "Hello world" },
            { type: "expression", value: "system.params.slug" },
          ],
        },
      ],
    } as never;

    expect(serializeTextNodes(build, { mode: "all" })).toEqual([
      {
        instanceId: "root-1",
        childIndex: 0,
        component: "Body",
        label: undefined,
        mode: "text",
        value: "Hello world",
      },
      {
        instanceId: "root-1",
        childIndex: 1,
        component: "Body",
        label: undefined,
        mode: "expression",
        value: "system.params.slug",
      },
    ]);
  });

  test("throws when page-scoped text list references a missing page", () => {
    const build = {
      pages: createDefaultPages({ rootInstanceId: "root-1" }),
      instances: [
        {
          type: "instance",
          id: "root-1",
          component: "Body",
          children: [{ type: "text", value: "Hello world" }],
        },
      ],
    } as never;

    expect(() => serializeTextNodes(build, { pageId: "missing" })).toThrow(
      "Page not found"
    );
  });

  test("serializes direct style declarations for selected instances", () => {
    const build = {
      pages: createDefaultPages({ rootInstanceId: "root-1" }),
      instances: [
        {
          type: "instance",
          id: "root-1",
          component: "Body",
          children: [],
        },
      ],
      styleSources: [{ type: "local", id: "local-1" }],
      styleSourceSelections: [{ instanceId: "root-1", values: ["local-1"] }],
      styles: [
        {
          styleSourceId: "local-1",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    } as never;

    expect(
      serializeStyleDeclarations(build, {
        instanceIds: ["root-1"],
        property: "color",
      })
    ).toEqual([
      {
        instanceId: "root-1",
        styleSourceId: "local-1",
        property: "color",
        value: { type: "keyword", value: "red" },
        breakpoint: "base",
        state: undefined,
        source: "local",
      },
    ]);
  });

  test("excludes token style declarations unless requested", () => {
    const build = {
      pages: createDefaultPages({ rootInstanceId: "root-1" }),
      instances: [
        {
          type: "instance",
          id: "root-1",
          component: "Body",
          children: [],
        },
      ],
      styleSources: [{ type: "token", id: "token-1", name: "Primary" }],
      styleSourceSelections: [{ instanceId: "root-1", values: ["token-1"] }],
      styles: [
        {
          styleSourceId: "token-1",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    } as never;

    expect(
      serializeStyleDeclarations(build, {
        instanceIds: ["root-1"],
      })
    ).toEqual([]);
    expect(
      serializeStyleDeclarations(build, {
        instanceIds: ["root-1"],
        includeTokens: true,
      })
    ).toEqual([
      expect.objectContaining({
        instanceId: "root-1",
        styleSourceId: "token-1",
        source: "token",
      }),
    ]);
  });

  test("sorts design tokens by usage", () => {
    const build = {
      styleSources: [
        { type: "token", id: "token-1", name: "Secondary" },
        { type: "token", id: "token-2", name: "Primary" },
      ],
      styleSourceSelections: [
        { instanceId: "root-1", values: ["token-2"] },
        { instanceId: "root-2", values: ["token-2"] },
      ],
      styles: [
        {
          styleSourceId: "token-2",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    } as never;

    expect(
      serializeDesignTokens(build, { sort: "usage" }).tokens.map((token) => ({
        id: token.id,
        usageCount: token.usageCount,
      }))
    ).toEqual([
      { id: "token-2", usageCount: 2 },
      { id: "token-1", usageCount: 0 },
    ]);
  });

  test("sorts assets by usage and paginates", () => {
    expect(
      serializeAssetList({
        assets: [
          createAsset("asset-1", "Unused", 2),
          createAsset("asset-2", "Used"),
        ],
        build: createBuildWithAssetReference("asset-2"),
        input: { withUsage: true, sort: "usage", cursor: "0", limit: 1 },
      })
    ).toEqual({
      items: [
        expect.objectContaining({
          id: "asset-2",
          usageCount: 1,
        }),
      ],
      nextCursor: "1",
    });
  });

  test("counts asset usage when sorting by usage", () => {
    expect(
      serializeAssetList({
        assets: [
          createAsset("asset-1", "Unused"),
          createAsset("asset-2", "Used"),
        ],
        build: createBuildWithAssetReference("asset-2"),
        input: { sort: "usage" },
      }).items.map((asset) => asset.id)
    ).toEqual(["asset-2", "asset-1"]);
  });

  test("rejects invalid asset cursor", () => {
    expect(() =>
      serializeAssetList({
        assets: [],
        input: { cursor: "nope" },
      })
    ).toThrow("Invalid asset cursor");
  });
});
