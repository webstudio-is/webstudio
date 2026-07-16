import { access } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { CompactBuild } from "@webstudio-is/project-build";
import * as projectBuild from "@webstudio-is/project-build/server";
import * as projectApi from "@webstudio-is/project/index.server";
import {
  buildPatchTransaction,
  publicApiContractVersion,
  publicApiOperationRequiresServerSupport,
  publicApiOperations,
} from "@webstudio-is/protocol";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import { blockComponent } from "@webstudio-is/sdk";
import { apiRouter, __testing__ } from "./api-router.server";
import {
  getApiRouterProcedures,
  getProcedureInputSchemaMetadata,
  getProcedurePublicApiPermit,
} from "./api-router-introspection.server";
import {
  assertApiProjectPermit,
  assertApiTokenPermit,
  getTokenPermits,
} from "./api-permits.server";

const servicesDir = new URL(".", import.meta.url);

const { assertContentOrBuildPayload, assertApiPublishDomains } = __testing__;

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

type RuntimeCallerProcedure = (input: unknown) => Promise<unknown>;
type RuntimeApiCaller = Record<string, Record<string, RuntimeCallerProcedure>>;
type ApiRouterCaller = ReturnType<typeof apiRouter.createCaller>;

const createCaller = (context: AppContext) =>
  apiRouter.createCaller(context) as ApiRouterCaller & RuntimeApiCaller;

describe("api router build operation adapters", () => {
  test("allows CLI clients to refresh pages without project settings", async () => {
    const build = {
      id: "build-1",
      projectId: "project-1",
      version: 1,
      pages: createDefaultPages({ rootInstanceId: "root" }),
      projectSettings: { agents: "Project instructions" },
    } as unknown as Awaited<
      ReturnType<typeof projectBuild.loadDevBuildByProjectId>
    >;
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);

    const caller = createCaller({
      ...createContext(true),
      apiClient: { type: "cli", version: "0.276.0" },
    });

    await expect(
      caller.build.get({ projectId: "project-1", include: ["pages"] })
    ).resolves.toMatchObject({
      projectId: "project-1",
      buildId: "build-1",
      version: 1,
      pages: expect.any(Array),
    });
  });

  test("public operation catalog paths exist on the api router", () => {
    const procedures = getApiRouterProcedures(apiRouter);

    for (const operation of publicApiOperations) {
      if (operation.path === undefined) {
        continue;
      }
      const procedure = procedures[operation.path.replace(/^api\./, "")] as
        | { _def?: Partial<Record<typeof operation.method, boolean>> }
        | undefined;
      expect(procedure).toBeDefined();
      expect(procedure?._def?.[operation.method]).toBe(true);
    }
  });

  test("api router procedures are all described by the public operation catalog", () => {
    const procedures = getApiRouterProcedures(apiRouter);
    expect(
      Object.keys(procedures)
        .map((path) => `api.${path}`)
        .sort()
    ).toEqual(
      publicApiOperations
        .flatMap((operation) =>
          operation.path === undefined ? [] : [operation.path]
        )
        .sort()
    );
  });

  test("operation catalog input fields match api router inputs", () => {
    const procedures = getApiRouterProcedures(apiRouter);

    for (const operation of publicApiOperations) {
      if (operation.path === undefined) {
        continue;
      }
      const procedure = procedures[operation.path.replace(/^api\./, "")];
      const metadata = getProcedureInputSchemaMetadata(procedure);
      expect(metadata.inputFields).toEqual(operation.inputFields);
      expect(metadata.requiredInputFields).toEqual(
        operation.requiredInputFields
      );
      expect(metadata.inputFieldTypes).toEqual(operation.inputFieldTypes);
      expect(metadata.inputJsonSchema).toEqual(operation.inputSchema);
    }
  });

  test("operation catalog permits match api router metadata", () => {
    const procedures = getApiRouterProcedures(apiRouter);

    for (const operation of publicApiOperations) {
      if (operation.path === undefined) {
        continue;
      }
      const procedure = procedures[operation.path.replace(/^api\./, "")];
      expect(getProcedurePublicApiPermit(procedure)).toBe(operation.permit);
    }
  });

  test("does not keep an api-only build operations service", async () => {
    await expect(
      access(join(servicesDir.pathname, "build-operations.server.ts"))
    ).rejects.toThrow();
  });
});

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
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Builder API requires an API token",
    });
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

  test("allows token introspection without api permission", async () => {
    const token = createToken({ canUseApi: false, relation: "editors" });
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(token);
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);

    const caller = createCaller(createContext(true));

    await expect(caller.auth.me()).resolves.toEqual({
      actor: { type: "token", tokenId: token.token },
      projectId: token.projectId,
      relation: "editors",
      permits: ["view", "edit"],
    });
    await expect(
      caller.projects.permissions({ projectId: token.projectId })
    ).resolves.toEqual({
      relation: "editors",
      permits: ["view", "edit"],
      canView: true,
      canEdit: true,
      canBuild: false,
      canAdmin: false,
      canOwn: false,
      canUseApi: false,
      canPublish: false,
      canPublishProjectDomain: false,
      canPublishCustomDomains: false,
      apiContract: {
        version: publicApiContractVersion,
        operationIds: publicApiOperations.flatMap((operation) =>
          publicApiOperationRequiresServerSupport(operation)
            ? [operation.id]
            : []
        ),
      },
    });
  });

  test("returns publish capabilities from token permissions", async () => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    const caller = createCaller(createContext(true));

    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "editors", canPublish: true })
    );
    await expect(
      caller.projects.permissions({ projectId: "project-1" })
    ).resolves.toMatchObject({
      relation: "editors",
      canPublish: true,
      canPublishProjectDomain: true,
      canPublishCustomDomains: true,
    });

    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "builders", canPublish: false })
    );
    await expect(
      caller.projects.permissions({ projectId: "project-1" })
    ).resolves.toMatchObject({
      relation: "builders",
      canPublish: false,
      canPublishProjectDomain: true,
      canPublishCustomDomains: false,
    });

    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "administrators", canPublish: true })
    );
    await expect(
      caller.projects.permissions({ projectId: "project-1" })
    ).resolves.toMatchObject({
      relation: "administrators",
      canPublish: true,
      canPublishProjectDomain: true,
      canPublishCustomDomains: true,
    });
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

  test("requires build permission before semantic build mutation handlers", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "viewers" })
    );

    const caller = createCaller(createContext(true));

    await expect(
      caller.pages.update({
        projectId: "project-1",
        pageId: "page-id",
        values: {},
      })
    ).rejects.toThrow("Authorization token does not have build permission");
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

  test("requires publish permission for api publish domains", () => {
    const project = { domain: "project.wstd.dev" };

    expect(() =>
      assertApiPublishDomains({
        auth: {
          token: createToken({ relation: "editors", canPublish: false }),
          permits: ["view", "edit", "api"],
        },
        domains: ["project.wstd.dev"],
        project,
      })
    ).toThrow("Authorization token does not have publish permission");

    expect(() =>
      assertApiPublishDomains({
        auth: {
          token: createToken({ relation: "editors", canPublish: true }),
          permits: ["view", "edit", "api"],
        },
        domains: ["custom.example.com"],
        project,
      })
    ).not.toThrow();

    expect(() =>
      assertApiPublishDomains({
        auth: {
          token: createToken({ relation: "builders", canPublish: false }),
          permits: ["view", "edit", "build", "api"],
        },
        domains: ["project.wstd.dev"],
        project,
      })
    ).not.toThrow();

    expect(() =>
      assertApiPublishDomains({
        auth: {
          token: createToken({ relation: "builders", canPublish: false }),
          permits: ["view", "edit", "build", "api"],
        },
        domains: ["custom.example.com"],
        project,
      })
    ).toThrow("Authorization token does not have publish permission");

    expect(() =>
      assertApiPublishDomains({
        auth: {
          token: createToken({
            relation: "administrators",
            canPublish: true,
          }),
          permits: ["view", "edit", "build", "admin", "api"],
        },
        domains: ["custom.example.com"],
        project,
      })
    ).not.toThrow();
  });

  test("allows editor api tokens to commit content-mode payloads only", () => {
    const build = {
      id: "build",
      projectId: "project-1",
      version: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      pages: createDefaultPages({ rootInstanceId: "block" }),
      breakpoints: [],
      styles: [],
      styleSources: [],
      styleSourceSelections: [],
      props: [],
      dataSources: [],
      resources: [],
      instances: [
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [{ type: "id", value: "text-instance" }],
        },
        {
          type: "instance",
          id: "text-instance",
          component: "ws:element",
          tag: "p",
          children: [{ type: "text", value: "Old" }],
        },
      ],
      marketplaceProduct: {},
    } as unknown as CompactBuild;
    const editorAuth = {
      token: createToken({ relation: "editors" }),
      permits: ["view", "edit", "api"],
    } satisfies Awaited<ReturnType<typeof assertApiProjectPermit>>;
    const builderAuth = {
      token: createToken({ relation: "builders" }),
      permits: ["view", "edit", "build", "api"],
    } satisfies Awaited<ReturnType<typeof assertApiProjectPermit>>;
    const contentPayload: z.infer<typeof buildPatchTransaction>["payload"] = [
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["text-instance", "children", 0],
            value: { type: "text", value: "New" },
          },
        ],
      },
    ];
    const designPayload: z.infer<typeof buildPatchTransaction>["payload"] = [
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["style"],
            value: {
              breakpointId: "base",
              property: "color",
              styleSourceId: "local",
              value: { type: "keyword", value: "red" },
            },
          },
        ],
      },
    ];

    expect(() =>
      assertContentOrBuildPayload({
        auth: editorAuth,
        build,
        payload: contentPayload,
      })
    ).not.toThrow();
    expect(() =>
      assertContentOrBuildPayload({
        auth: editorAuth,
        build,
        payload: designPayload,
      })
    ).toThrow("content mode");
    expect(() =>
      assertContentOrBuildPayload({
        auth: builderAuth,
        build,
        payload: designPayload,
      })
    ).not.toThrow();
  });

  test("commits content-mode mutations with editor api tokens", async () => {
    const build = {
      id: "build-1",
      projectId: "project-1",
      version: 3,
      pages: createDefaultPages({ rootInstanceId: "block" }),
      breakpoints: [],
      styles: [],
      styleSources: [],
      styleSourceSelections: [],
      props: [],
      dataSources: [],
      resources: [],
      instances: [
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [{ type: "id", value: "text-instance" }],
        },
        {
          type: "instance",
          id: "text-instance",
          component: "ws:element",
          tag: "p",
          children: [{ type: "text", value: "Old" }],
        },
      ],
      marketplaceProduct: {},
    } as unknown as Awaited<
      ReturnType<typeof projectBuild.loadDevBuildByProjectId>
    >;
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "editors" })
    );
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);
    const patchBuild = vi
      .spyOn(projectApi, "patchBuild")
      .mockResolvedValue({ status: "ok", version: 4 });

    const caller = createCaller(createContext(true));

    await expect(
      caller.instances.updateText({
        projectId: "project-1",
        instanceId: "text-instance",
        childIndex: 0,
        text: "New",
        mode: "text",
      })
    ).resolves.toMatchObject({
      version: 4,
      instanceId: "text-instance",
      childIndex: 0,
      mode: "text",
    });

    expect(patchBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
      }),
      expect.anything()
    );
  });

  test("does not commit empty runtime mutation payloads", async () => {
    const build = {
      id: "build-1",
      projectId: "project-1",
      version: 7,
      pages: createDefaultPages({ rootInstanceId: "root" }),
      breakpoints: [],
      styles: [],
      styleSources: [],
      styleSourceSelections: [],
      props: [],
      dataSources: [],
      resources: [],
      instances: [
        {
          type: "instance",
          id: "root",
          component: blockComponent,
          children: [],
        },
      ],
      marketplaceProduct: {},
    } as unknown as Awaited<
      ReturnType<typeof projectBuild.loadDevBuildByProjectId>
    >;
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);
    const patchBuild = vi.spyOn(projectApi, "patchBuild");

    const caller = createCaller(createContext(true));

    await expect(
      caller.pages.update({
        projectId: "project-1",
        pageId: build.pages.homePageId,
        values: {},
      })
    ).resolves.toEqual({
      version: 7,
      pageId: build.pages.homePageId,
    });

    expect(patchBuild).not.toHaveBeenCalled();
  });
});

describe("api instance queries", () => {
  const createInstanceQueryBuild = () =>
    ({
      id: "build-1",
      projectId: "project-1",
      version: 1,
      pages: createDefaultPages({ rootInstanceId: "root-1" }),
      instances: [
        {
          type: "instance",
          id: "root-1",
          component: "Body",
          tag: "body",
          label: "Root",
          children: [
            { type: "id", value: "hero-1" },
            { type: "text", value: "Root text" },
          ],
        },
        {
          type: "instance",
          id: "hero-1",
          component: blockComponent,
          tag: "section",
          label: "Hero",
          children: [{ type: "expression", value: "system.params.slug" }],
        },
      ],
      props: [],
      styles: [],
      styleSources: [],
      styleSourceSelections: [],
      resources: [],
      dataSources: [],
      breakpoints: [],
    }) as unknown as Awaited<
      ReturnType<typeof projectBuild.loadDevBuildByProjectId>
    >;

  test("lists instances through server semantics", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(
      createInstanceQueryBuild()
    );

    const caller = createCaller(createContext(true));

    await expect(
      caller.instances.list({
        projectId: "project-1",
        pagePath: "",
        maxDepth: 1,
        labelContains: "Hero",
      })
    ).resolves.toMatchObject({
      detail: "compact",
      total: 1,
      instances: [
        {
          id: "hero-1",
          label: "Hero",
          component: blockComponent,
          tag: "section",
          depth: 1,
          childCount: 1,
          parentId: "root-1",
          indexWithinParent: 0,
        },
      ],
    });
  });

  test("lists text and expression children through server semantics", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(
      createInstanceQueryBuild()
    );

    const caller = createCaller(createContext(true));

    await expect(
      caller.instances.listTexts({
        projectId: "project-1",
        pagePath: "",
        mode: "expression",
      })
    ).resolves.toEqual({
      texts: [
        {
          instanceId: "hero-1",
          childIndex: 0,
          component: blockComponent,
          label: "Hero",
          mode: "expression",
          valuePreview: "system.params.slug",
          valueLength: 18,
          truncated: false,
        },
      ],
      detail: "compact",
      total: 1,
      returnedCount: 1,
      nextCursor: null,
      filters: { pagePath: "", mode: "expression" },
    });
  });

  test("lists project entities through semantic routes", async () => {
    const build = createInstanceQueryBuild();
    build.pages.folders.set("folder-1", {
      id: "folder-1",
      name: "Blog",
      slug: "blog",
      children: ["page-1"],
    });
    build.pages.folders
      .get(build.pages.rootFolderId)
      ?.children.push("folder-1");
    build.pages.pages.set("page-1", {
      id: "page-1",
      name: "Post",
      path: "/first-post",
      title: "Post",
      rootInstanceId: "hero-1",
      meta: { description: "Post description" },
    });
    build.styleSources.push({
      id: "token-1",
      type: "token",
      name: "Primary",
    });
    build.styles.push({
      styleSourceId: "token-1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    build.styleSourceSelections.push({
      instanceId: "hero-1",
      values: ["token-1"],
    });
    build.dataSources.push(
      {
        id: "variable-1",
        type: "variable",
        scopeInstanceId: "hero-1",
        name: "Title",
        value: { type: "string", value: "Hello" },
      },
      {
        id: "resource-data-source-1",
        type: "resource",
        scopeInstanceId: "hero-1",
        name: "Posts",
        resourceId: "resource-1",
      }
    );
    build.resources.push({
      id: "resource-1",
      name: "Posts",
      method: "get",
      url: '"https://example.com/posts"',
      headers: [],
    });
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);

    const caller = createCaller(createContext(true));

    await expect(
      caller.pages.list({ projectId: "project-1" })
    ).resolves.toMatchObject({
      pages: [
        expect.objectContaining({ isHome: true, path: "" }),
        expect.objectContaining({
          id: "page-1",
          path: "/blog/first-post",
          parentFolderId: "folder-1",
        }),
      ],
    });
    await expect(
      caller.pages.getByPath({
        projectId: "project-1",
        path: "/blog/first-post",
      })
    ).resolves.toMatchObject({
      id: "page-1",
      meta: { description: "Post description" },
    });
    await expect(
      caller.folders.list({ projectId: "project-1" })
    ).resolves.toMatchObject({
      folders: expect.arrayContaining([
        expect.objectContaining({
          id: "folder-1",
          slug: "blog",
          parentFolderId: build.pages.rootFolderId,
          children: ["page-1"],
        }),
      ]),
    });
    await expect(
      caller.designTokens.list({
        projectId: "project-1",
        withUsage: true,
      })
    ).resolves.toMatchObject({
      detail: "compact",
      total: 1,
      tokens: [
        {
          id: "token-1",
          name: "Primary",
          declarationCount: 1,
          usageCount: 1,
        },
      ],
    });
    await expect(
      caller.variables.list({
        projectId: "project-1",
        scopeInstanceId: "hero-1",
      })
    ).resolves.toEqual({
      variables: [
        {
          id: "variable-1",
          name: "Title",
          scopeInstanceId: "hero-1",
          valueType: "string",
        },
      ],
      detail: "compact",
      total: 1,
      returnedCount: 1,
      nextCursor: null,
      filters: { scopeInstanceId: "hero-1" },
    });
    await expect(
      caller.resources.list({
        projectId: "project-1",
        scopeInstanceId: "hero-1",
      })
    ).resolves.toEqual({
      resources: [
        {
          id: "resource-1",
          name: "Posts",
          method: "get",
          url: '"https://example.com/posts"',
          scopeInstanceId: "hero-1",
          exposedAsDataSource: true,
          dataSourceId: "resource-data-source-1",
        },
      ],
      detail: "compact",
      total: 1,
      returnedCount: 1,
      nextCursor: null,
      filters: { scopeInstanceId: "hero-1" },
    });
  });
});
