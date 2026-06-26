import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { CompactBuild } from "@webstudio-is/project-build";
import * as projectBuild from "@webstudio-is/project-build/index.server";
import * as projectApi from "@webstudio-is/project/index.server";
import { buildPatchTransaction } from "@webstudio-is/protocol";
import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import {
  blockComponent,
  getStyleDeclKey,
  type Asset,
  type Instance,
  type StyleDecl,
} from "@webstudio-is/sdk";
import {
  createAssetReplacementPayload,
  serializeAssetList,
} from "@webstudio-is/project-build/runtime/assets";
import {
  createInstanceCleanupPayload,
  serializeTextNodes,
} from "@webstudio-is/project-build/runtime/instances";
import { createPageUpdatePatches } from "@webstudio-is/project-build/runtime/pages";
import { createStyleClonePayload } from "@webstudio-is/project-build/runtime/style-utils";
import { getResourceExpressionErrors } from "@webstudio-is/project-build/runtime/data";
import {
  findDesignToken,
  serializeCssVariables,
} from "@webstudio-is/project-build/runtime/styles";
import { serializeStyleDeclarations } from "@webstudio-is/project-build/runtime/style-utils";
import {
  createValidatedPropBindingFromInput,
  createValidatedPropValueFromInput,
} from "@webstudio-is/project-build/runtime/props";
import { apiRouter, __testing__ } from "./api-router.server";
import {
  assertApiProjectPermit,
  assertApiTokenPermit,
  getTokenPermits,
} from "./api-permits.server";

const servicesDir = new URL(".", import.meta.url);

const {
  assertContentOrBuildPayload,
  assertApiPublishDomains,
  getParentFolderIdOrThrow,
  getFolderOrThrow,
  getPageOrThrow,
} = __testing__;

const validatePropValue = (
  input: Parameters<typeof createValidatedPropValueFromInput>[0]
) => {
  const result = createValidatedPropValueFromInput(input);
  if (result.success === false) {
    throw new Error(result.errors[0] ?? "Invalid prop value");
  }
  return result.prop;
};

const validatePropBinding = (
  input: Parameters<typeof createValidatedPropBindingFromInput>[0]
) => {
  const result = createValidatedPropBindingFromInput(input);
  if (result.success === false) {
    throw new Error(result.errors[0] ?? "Invalid prop binding");
  }
  return result.prop;
};

const getDesignTokenOrThrow = (
  build: Pick<CompactBuild, "styleSources">,
  tokenId: string
) => {
  const token = findDesignToken(build.styleSources, tokenId);
  if (token === undefined) {
    throw new Error("Design token not found");
  }
  return token;
};

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
  }) as Asset;

const createBuildWithAssetReference = (assetId: string) =>
  ({
    pages: createDefaultPages({ rootInstanceId: "root-1" }),
    props: [
      {
        id: "prop-1",
        instanceId: "root-1",
        name: "src",
        type: "asset",
        value: assetId,
      },
    ],
    styles: [],
    resources: [],
    dataSources: [],
  }) as unknown as CompactBuild;

describe("api router build operation adapters", () => {
  test("does not keep an api-only build operations service", async () => {
    await expect(
      access(join(servicesDir.pathname, "build-operations.server.ts"))
    ).rejects.toThrow();
  });

  test("api router tests do not mock modules", async () => {
    const content = await readFile(new URL(import.meta.url), "utf-8");
    const forbidden = [
      new RegExp("\\bvi\\.mock\\("),
      new RegExp("\\bjest\\.mock\\("),
      new RegExp("unstable_" + "mock" + "Module"),
      new RegExp("mock" + "Module"),
    ];
    for (const pattern of forbidden) {
      expect(content).not.toMatch(pattern);
    }
  });

  test("api router does not assemble semantic patches inline", async () => {
    const content = await readFile(
      new URL("api-router.server.ts", servicesDir),
      "utf-8"
    );
    expect(content).not.toMatch(/\bnamespace:/);
    expect(content).not.toMatch(/\bpatches:/);
    expect(content).not.toMatch(/\bop: ["'](add|remove|replace)["']/);
  });

  const pages = createDefaultPages({ rootInstanceId: "root" });
  const root: Instance = {
    type: "instance",
    id: "root",
    component: "Body",
    children: [
      { type: "id", value: "child" },
      { type: "text", value: "Hello" },
      { type: "expression", value: "title" },
    ],
  };
  const child: Instance = {
    type: "instance",
    id: "child",
    component: "Box",
    children: [],
  };
  const build = {
    id: "build",
    projectId: "project",
    version: 1,
    pages,
    instances: [root, child],
    styleSources: [{ type: "token", id: "token", name: "Token" }],
  } as CompactBuild;
  test("resolves pages and folders used by route adapters", () => {
    expect(getPageOrThrow(pages, pages.homePageId).id).toBe(pages.homePageId);
    expect(getFolderOrThrow(pages, pages.rootFolderId).id).toBe(
      pages.rootFolderId
    );
    expect(getParentFolderIdOrThrow(pages, pages.homePageId)).toBe(
      pages.rootFolderId
    );

    expect(() => getPageOrThrow(pages, "missing")).toThrow("Page not found");
    expect(() => getFolderOrThrow(pages, "missing")).toThrow(
      "Folder not found"
    );
    expect(() => getParentFolderIdOrThrow(pages, "missing")).toThrow(
      "Page parent folder not found"
    );
  });

  test("validates values and resolves referenced tokens", () => {
    expect(
      getResourceExpressionErrors({ url: '"https://example.com"' })
    ).toEqual([]);
    expect(getResourceExpressionErrors({ url: "invalid +" })[0]).toMatch(
      /^url: /
    );
    expect(
      validatePropValue({
        propId: "prop",
        instanceId: "root",
        name: "label",
        type: "string",
        value: "Label",
      })
    ).toEqual({
      id: "prop",
      instanceId: "root",
      name: "label",
      type: "string",
      value: "Label",
    });
    expect(
      validatePropBinding({
        propId: "prop",
        instanceId: "root",
        name: "value",
        binding: { type: "parameter", value: "param" },
      })
    ).toEqual({
      id: "prop",
      instanceId: "root",
      name: "value",
      type: "parameter",
      value: "param",
    });
    expect(() =>
      validatePropValue({
        instanceId: "root",
        name: "value",
        type: "expression",
        value: "invalid {",
      })
    ).toThrow();
    expect(() =>
      validatePropBinding({
        instanceId: "root",
        name: "value",
        binding: { type: "expression", value: "invalid {" },
      })
    ).toThrow();
    expect(getDesignTokenOrThrow(build, "token")).toEqual({
      type: "token",
      id: "token",
      name: "Token",
    });
    expect(() => getDesignTokenOrThrow(build, "missing")).toThrow(
      "Design token not found"
    );
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

  test("allows token introspection without api permission", async () => {
    const token = createToken({ canUseApi: false, relation: "editors" });
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(token);
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);

    const caller = apiRouter.createCaller(createContext(true));

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
    });
  });

  test("returns publish capabilities from token permissions", async () => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    const caller = apiRouter.createCaller(createContext(true));

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

    const caller = apiRouter.createCaller(createContext(true));

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

    const caller = apiRouter.createCaller(createContext(true));

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
});

describe("api semantic build writes", () => {
  test("uses shared page meta empty value normalization", () => {
    const pages = createDefaultPages({
      rootInstanceId: "root",
      homePageId: "page",
    });
    const page = pages.pages.get("page");
    if (page === undefined) {
      throw new Error("Expected page");
    }
    page.meta = {
      description: "old description",
      language: "en",
      socialImageUrl: "https://example.com/image.png",
    };

    expect(
      createPageUpdatePatches({
        input: {
          meta: {
            description: "",
            language: "",
            socialImageUrl: "",
          },
        },
        page,
        pages,
      })
    ).toEqual([
      {
        op: "replace",
        path: ["pages", "page", "meta", "description"],
        value: "",
      },
      { op: "remove", path: ["pages", "page", "meta", "language"] },
      { op: "remove", path: ["pages", "page", "meta", "socialImageUrl"] },
    ]);
  });

  test("cleans local styles when removing instances", () => {
    const styleDecl: StyleDecl = {
      styleSourceId: "local-1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    };
    const build = {
      instances: [{ id: "child-1" }],
      props: [
        { id: "prop-1", instanceId: "child-1" },
        {
          id: "resource-prop",
          instanceId: "child-1",
          type: "resource",
          value: "prop-resource",
        },
      ],
      dataSources: [
        {
          id: "variable-1",
          type: "variable",
          scopeInstanceId: "child-1",
          name: "Value",
          value: { type: "string", value: "text" },
        },
        {
          id: "resource-variable",
          type: "resource",
          scopeInstanceId: "child-1",
          name: "Resource",
          resourceId: "variable-resource",
        },
      ],
      styleSources: [
        { type: "local", id: "local-1" },
        { type: "token", id: "token-1", name: "Token" },
      ],
      styleSourceSelections: [
        { instanceId: "child-1", values: ["token-1", "local-1"] },
      ],
      styles: [
        styleDecl,
        {
          styleSourceId: "token-1",
          breakpointId: "base",
          property: "font-size",
          value: { type: "unit", value: 16, unit: "px" },
        },
      ],
    } as unknown as Pick<
      CompactBuild,
      | "props"
      | "dataSources"
      | "styleSources"
      | "styleSourceSelections"
      | "styles"
    >;

    expect(
      createInstanceCleanupPayload({
        instanceIds: new Set(["child-1"]),
        props: build.props,
        dataSources: build.dataSources,
        styleSources: build.styleSources,
        styleSourceSelections: build.styleSourceSelections,
        styles: build.styles,
      })
    ).toEqual([
      {
        namespace: "instances",
        patches: [{ op: "remove", path: ["child-1"] }],
      },
      {
        namespace: "props",
        patches: [
          { op: "remove", path: ["prop-1"] },
          { op: "remove", path: ["resource-prop"] },
        ],
      },
      {
        namespace: "dataSources",
        patches: [
          { op: "remove", path: ["variable-1"] },
          { op: "remove", path: ["resource-variable"] },
        ],
      },
      {
        namespace: "resources",
        patches: [
          { op: "remove", path: ["prop-resource"] },
          { op: "remove", path: ["variable-resource"] },
        ],
      },
      {
        namespace: "styleSourceSelections",
        patches: [{ op: "remove", path: ["child-1"] }],
      },
      {
        namespace: "styleSources",
        patches: [{ op: "remove", path: ["local-1"] }],
      },
      {
        namespace: "styles",
        patches: [{ op: "remove", path: [getStyleDeclKey(styleDecl)] }],
      },
    ]);
  });

  test("clones local styles while keeping design tokens shared", () => {
    const styleDecl: StyleDecl = {
      styleSourceId: "local-1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    };
    const build = {
      styleSources: [
        { type: "local", id: "local-1" },
        { type: "token", id: "token-1", name: "Token" },
      ],
      styleSourceSelections: [
        { instanceId: "source-1", values: ["token-1", "local-1"] },
      ],
      styles: [styleDecl],
    } as Pick<
      CompactBuild,
      "styleSources" | "styleSourceSelections" | "styles"
    >;

    const payload = createStyleClonePayload({
      styleSourceSelections: build.styleSourceSelections,
      styleSources: build.styleSources,
      styles: new Map(
        build.styles.map((styleDecl) => [getStyleDeclKey(styleDecl), styleDecl])
      ),
      nextIdById: new Map([["source-1", "clone-1"]]),
      createId: () => "local-copy",
    });
    const styleSourcePatch = payload.find(
      (change) => change.namespace === "styleSources"
    )?.patches[0];
    const clonedLocalSourceId = styleSourcePatch?.path[0];

    expect(clonedLocalSourceId).toEqual(expect.any(String));
    expect(clonedLocalSourceId).not.toBe("local-1");
    expect(payload).toEqual([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: [clonedLocalSourceId],
            value: { type: "local", id: clonedLocalSourceId },
          },
        ],
      },
      {
        namespace: "styleSourceSelections",
        patches: [
          {
            op: "add",
            path: ["clone-1"],
            value: {
              instanceId: "clone-1",
              values: ["token-1", clonedLocalSourceId],
            },
          },
        ],
      },
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: [
              getStyleDeclKey({
                ...styleDecl,
                styleSourceId: String(clonedLocalSourceId),
              }),
            ],
            value: { ...styleDecl, styleSourceId: clonedLocalSourceId },
          },
        ],
      },
    ]);
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

    const caller = apiRouter.createCaller(createContext(true));

    await expect(
      caller.instances.list({
        projectId: "project-1",
        pagePath: "",
        maxDepth: 1,
        labelContains: "Hero",
      })
    ).resolves.toEqual({
      instances: [
        {
          id: "hero-1",
          label: "Hero",
          component: blockComponent,
          tag: "section",
          depth: 1,
          childCount: 1,
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

    const caller = apiRouter.createCaller(createContext(true));

    await expect(
      caller.instances.listTexts({
        projectId: "project-1",
        pagePath: "",
        mode: "expression",
        maxValueLength: 6,
      })
    ).resolves.toEqual({
      texts: [
        {
          instanceId: "hero-1",
          childIndex: 0,
          component: blockComponent,
          label: "Hero",
          mode: "expression",
          value: "system",
        },
      ],
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

    const caller = apiRouter.createCaller(createContext(true));

    await expect(
      caller.pages.list({ projectId: "project-1", includeFolders: true })
    ).resolves.toMatchObject({
      pages: [
        expect.objectContaining({ isHome: true, path: "" }),
        expect.objectContaining({
          id: "page-1",
          path: "/blog/first-post",
          parentFolderId: "folder-1",
        }),
      ],
      folders: expect.arrayContaining([
        expect.objectContaining({ id: "folder-1", slug: "blog" }),
      ]),
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
      caller.folders.list({ projectId: "project-1", includePages: true })
    ).resolves.toMatchObject({
      folders: expect.arrayContaining([
        expect.objectContaining({
          id: "folder-1",
          parentFolderId: build.pages.rootFolderId,
          children: ["page-1"],
        }),
      ]),
      pages: expect.arrayContaining([
        expect.objectContaining({ id: "page-1" }),
      ]),
    });
    await expect(
      caller.designTokens.list({
        projectId: "project-1",
        withUsage: true,
      })
    ).resolves.toEqual({
      tokens: [
        {
          id: "token-1",
          name: "Primary",
          styles: { color: { type: "keyword", value: "red" } },
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
          value: { type: "string", value: "Hello" },
        },
      ],
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
    });
  });
});

describe("api read serialization", () => {
  test("lists css variables with usage only when requested", () => {
    const input: Parameters<typeof serializeCssVariables>[0] = {
      props: [],
      styles: [
        {
          styleSourceId: "source-1",
          breakpointId: "base",
          property: "--brand",
          value: { type: "keyword", value: "red" },
        },
        {
          styleSourceId: "source-1",
          breakpointId: "base",
          property: "color",
          value: { type: "var", value: "brand" },
        },
      ],
      styleSourceSelections: [{ instanceId: "root-1", values: ["source-1"] }],
    };

    expect(
      serializeCssVariables({
        styles: input.styles,
        props: input.props,
        styleSourceSelections: input.styleSourceSelections,
      })
    ).toEqual({
      vars: [
        {
          name: "--brand",
          value: "red",
          scope: "root-1",
          usageCount: undefined,
        },
      ],
    });
    expect(
      serializeCssVariables({
        styles: input.styles,
        props: input.props,
        styleSourceSelections: input.styleSourceSelections,
        withUsage: true,
      })
    ).toEqual({
      vars: [
        {
          name: "--brand",
          value: "red",
          scope: "root-1",
          usageCount: 1,
        },
      ],
    });
  });

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
    } as Pick<CompactBuild, "instances">;

    expect(
      serializeTextNodes({ instances: build.instances, mode: "all" })
    ).toEqual([
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
    } as Pick<
      CompactBuild,
      "styles" | "styleSources" | "styleSourceSelections"
    >;

    expect(
      serializeStyleDeclarations({
        styles: build.styles,
        styleSources: build.styleSources,
        styleSourceSelections: build.styleSourceSelections,
        instanceIds: new Set(["root-1"]),
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
    } as Pick<
      CompactBuild,
      "styles" | "styleSources" | "styleSourceSelections"
    >;

    expect(
      serializeStyleDeclarations({
        styles: build.styles,
        styleSources: build.styleSources,
        styleSourceSelections: build.styleSourceSelections,
        instanceIds: new Set(["root-1"]),
      })
    ).toEqual([]);
    expect(
      serializeStyleDeclarations({
        styles: build.styles,
        styleSources: build.styleSources,
        styleSourceSelections: build.styleSourceSelections,
        instanceIds: new Set(["root-1"]),
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

  test("creates asset replacement payload from shared replacement semantics", () => {
    const pages = createDefaultPages({ rootInstanceId: "root-1" });
    pages.meta = { faviconAssetId: "asset-1" };
    const homePage = pages.pages.get(pages.homePageId);
    if (homePage === undefined) {
      throw new Error("Expected home page");
    }
    homePage.meta.socialImageAssetId = "asset-1";
    const styleDecl: StyleDecl = {
      styleSourceId: "local",
      breakpointId: "base",
      property: "backgroundImage",
      value: {
        type: "image",
        value: { type: "asset", value: "asset-1" },
      },
    };

    expect(
      createAssetReplacementPayload({
        build: {
          pages,
          props: [
            {
              id: "prop-1",
              instanceId: "root-1",
              name: "src",
              type: "asset",
              value: "asset-1",
            },
          ],
          styles: [styleDecl],
        } as CompactBuild,
        fromAsset: createAsset("asset-1", "Old"),
        toAsset: createAsset("asset-2", "New"),
      })
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "replace",
            path: ["meta", "faviconAssetId"],
            value: "asset-2",
          },
          {
            op: "replace",
            path: ["pages", pages.homePageId, "meta", "socialImageAssetId"],
            value: "asset-2",
          },
        ],
      },
      {
        namespace: "props",
        patches: [
          {
            op: "replace",
            path: ["prop-1"],
            value: {
              id: "prop-1",
              instanceId: "root-1",
              name: "src",
              type: "asset",
              value: "asset-2",
            },
          },
        ],
      },
      {
        namespace: "styles",
        patches: [
          {
            op: "replace",
            path: [getStyleDeclKey(styleDecl)],
            value: {
              ...styleDecl,
              value: {
                type: "image",
                value: { type: "asset", value: "asset-2" },
              },
            },
          },
        ],
      },
      {
        namespace: "assets",
        patches: [{ op: "remove", path: ["asset-1"] }],
      },
    ]);
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
