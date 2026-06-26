import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  AuthorizationError,
  authorizeProject,
  procedure,
  router,
  type AppContext,
  type AuthPermit,
} from "@webstudio-is/trpc-interface/index.server";
import { loadById, patchBuild } from "@webstudio-is/project/index.server";
import {
  loadDevBuildByProjectId,
  loadBuildById,
  parseDeployment,
} from "@webstudio-is/project-build/index.server";
import {
  createProjectDomain,
  createUnpublishJobId,
  deleteProjectDomain,
  getDefaultPublishDomains,
  listProjectDomains,
  publishProject,
  updateProjectDomain,
  unpublishProjectDomains,
  verifyProjectDomain,
} from "@webstudio-is/domain/index.server";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import { buildPatchTransaction } from "@webstudio-is/protocol";
import {
  assertApiProjectPermit,
  assertApiTokenPermit,
  getTokenPermits,
  loadApiToken,
} from "./api-permits.server";
import {
  createPageUpdatePayload,
  pageFieldsInput,
  pageMetaInput,
  pageMetaToPatchValue,
} from "~/shared/page-utils/meta";
import {
  createPageCreatePayload,
  createPageRootInstance,
  createPageValue,
} from "~/shared/page-utils/create";
import { createPageDuplicatePayload } from "~/shared/page-utils";
import {
  createCssVariableDeletePayload,
  createCssVariableReferenceRewritePayload,
  createCssVariableRootDefinePayload,
  cssVariableValueInput,
  serializeCssVariables,
  validateCssVariableNameWithStyles,
} from "~/shared/css-variable-usage";
import {
  createAssetDeletePayload,
  createAssetReplacementPayload,
  createAssetUsageList,
  findAsset,
  serializeAssetList,
} from "~/shared/asset-style-value";
import {
  createResource as createResourceValue,
  createResourceCreatePayload,
  createResourceDeletePayload,
  createResourceUpdatePayload,
  createResourceUpsertPatchPayload,
  findResource,
  getResourceExpressionErrors,
  resourceFieldsInput,
  resourceFieldsUpdateInput,
  serializeResources,
} from "~/shared/resource-utils";
import {
  createDataVariableCreatePayload,
  createDataVariableDeletePayload,
  createDataVariableUpdatePayload,
  dataVariableValueInput,
  findDataVariable,
  serializeDataVariables,
} from "~/shared/data-variables";
import {
  createDesignTokenExtractionPayload,
  createDesignTokenCreatePayload,
  createDesignTokenStyleDeletePayload,
  createDesignTokenStyleUpdatePayload,
  createStyleDeclarationDeletePayload,
  createStyleDeclarationUpdatePayload,
  createStyleSourceSelectionAttachPayload,
  createStyleSourceSelectionDetachPayload,
  createStyleValueReplacementPayload,
  designTokenCreateInput,
  designTokenStyleInput,
  findDesignToken,
  serializeDesignTokens,
  serializeStyleDeclarations,
  styleDeleteInput,
  styleReplaceInput,
  styleUpdateInput,
} from "~/shared/style-source-utils";
import {
  createTextContentChild,
  createTextContentUpdatePayload,
  findTextContentChild,
  getTextContentErrors,
  serializeTextNodes,
} from "~/shared/instance-utils/text-content";
import {
  createFolderValue,
  createFolderCreatePayload,
  createFolderUpdatePayload,
  findFolder,
  findPage,
  findSerializedPageByInput,
  getAllChildrenAndSelf,
  getSerializedPages,
  getHomePageRootInstanceId,
  getParentFolderId,
  isPathAvailable,
  isSlugAvailable,
  createFolderDeletePayload,
  createPageDeletePayload,
  serializePageDetailsByInput,
  serializePageSummary,
  findParentFolderId,
} from "~/shared/page-utils/tree";
import {
  createValidatedPropBindingFromInput,
  createValidatedPropValueFromInput,
  createPropDeletePayload,
  createPropUpsertPayload,
  findProp,
  propBindingInput,
  propValueInput,
} from "~/shared/prop-utils";
import {
  createInstanceAppendPayload,
  createInstanceDeletePayload,
  createInstanceMovePayload,
  findParentInstanceReference,
  getBuildInstanceDepths as getInstanceDepths,
  serializeInstanceSummary,
} from "~/shared/instance-utils/tree";
import { createInstanceClonePayload } from "~/shared/instance-utils/clone";
import {
  elementComponent,
  coreMetas,
  getStyleDeclKey,
  type Asset,
  type Instance,
  type Pages,
  type Prop,
  type Resource,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  applyContentModeTransaction,
  getContentModeCapabilities,
} from "@webstudio-is/project/content-mode-permissions";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as animationComponentMetas from "@webstudio-is/sdk-components-animation/metas";
import * as radixComponentMetas from "@webstudio-is/sdk-components-react-radix/metas";
import type { CompactBuild } from "@webstudio-is/project-build";

const componentMetas = new Map<string, WsComponentMeta>(
  Object.entries({
    ...coreMetas,
    ...baseComponentMetas,
    ...animationComponentMetas,
    ...radixComponentMetas,
  })
);

const throwApiError = (
  code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT",
  message: string
): never => {
  throw new TRPCError({ code, message });
};

const loadBuildByProjectVersion = async (
  ctx: AppContext,
  projectId: string,
  version: number
) => {
  const build = await ctx.postgrest.client
    .from("Build")
    .select("id")
    .eq("projectId", projectId)
    .eq("version", version)
    .is("deployment", null)
    .order("createdAt", { ascending: false })
    .limit(1);

  if (build.error) {
    throw build.error;
  }
  const buildId = build.data.at(0)?.id;
  if (buildId === undefined) {
    return throwApiError("NOT_FOUND", "Build version not found for project");
  }

  return await loadBuildById(ctx, buildId);
};

const loadReadableDevBuild = async (ctx: AppContext, projectId: string) => {
  await assertApiProjectPermit(ctx, projectId, "view");
  return await loadDevBuildByProjectId(ctx, projectId);
};

const assertApiPublishDomains = ({
  auth,
  domains,
  project,
}: {
  auth: Awaited<ReturnType<typeof assertApiProjectPermit>>;
  domains: string[];
  project: { domain: string };
}) => {
  const { token } = auth;
  if (token.canPublish === true) {
    return;
  }
  if (
    token.relation === "builders" &&
    domains.length > 0 &&
    domains.every((domain) => domain === project.domain)
  ) {
    return;
  }
  throw new AuthorizationError(
    "Authorization token does not have publish permission"
  );
};

const projectIdInput = z.object({ projectId: z.string() });

const buildInclude = z.enum([
  "pages",
  "folders",
  "instances",
  "props",
  "styles",
  "styleSources",
  "styleSourceSelections",
  "designTokens",
  "assets",
  "resources",
  "variables",
  "breakpoints",
  "marketplaceProduct",
]);

type BuildInclude = z.infer<typeof buildInclude>;

const createBuildSnapshot = ({
  build,
  include,
  projectId,
}: {
  build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>;
  include: Set<BuildInclude>;
  projectId: string;
}) => {
  const snapshot: Record<string, unknown> = {
    projectId,
    buildId: build.id,
    version: build.version,
  };
  const add = (name: BuildInclude, value: unknown) => {
    if (include.has(name)) {
      snapshot[name] = value;
    }
  };

  if (include.has("pages") || include.has("folders")) {
    const pages = serializePages(build.pages);
    snapshot.homePageId = pages.homePageId;
    snapshot.rootFolderId = pages.rootFolderId;
    add("pages", pages.pages);
    add("folders", pages.folders);
  }
  add("instances", build.instances);
  add("props", build.props);
  add("styles", build.styles);
  add("styleSources", build.styleSources);
  add("styleSourceSelections", build.styleSourceSelections);
  if (include.has("designTokens")) {
    snapshot.designTokens = build.styleSources.filter(
      (styleSource) => styleSource.type === "token"
    );
  }
  add("resources", build.resources);
  add("variables", build.dataSources);
  add("breakpoints", build.breakpoints);
  add("marketplaceProduct", build.marketplaceProduct);

  return snapshot;
};

const serializeProjectSummary = (
  project: Awaited<ReturnType<typeof loadById>>
) => {
  if (project === null) {
    throwApiError("NOT_FOUND", "Project not found");
  }

  return {
    id: project.id,
    name: project.title,
    domain: project.domain ?? undefined,
    createdAt: project.createdAt,
    updatedAt:
      project.latestBuildVirtual?.createdAt ??
      project.latestStaticBuild?.updatedAt ??
      project.createdAt,
  };
};

const throwBadRequest = (errors: string[]): never => {
  return throwApiError("BAD_REQUEST", errors.join(", "));
};

const mapById = <Item extends { id: string }>(items: Item[]) =>
  new Map(items.map((item) => [item.id, item]));

const commitBuildPatch = async ({
  build,
  ctx,
  projectId,
  payload,
}: {
  build: CompactBuild;
  ctx: AppContext;
  projectId: string;
  payload: z.infer<typeof buildPatchTransaction>["payload"];
}) => {
  return commitBuildTransactions({
    ctx,
    projectId,
    buildId: build.id,
    clientVersion: build.version,
    transactions: [{ id: nanoid(), payload }],
  });
};

const commitBuildTransactions = async ({
  ctx,
  projectId,
  buildId,
  clientVersion,
  transactions,
}: {
  ctx: AppContext;
  projectId: string;
  buildId: string;
  clientVersion: number;
  transactions: z.infer<typeof buildPatchTransaction>[];
}) => {
  const result = await patchBuild(
    {
      buildId,
      projectId,
      clientVersion,
      transactions,
    },
    ctx
  );
  if (result.status === "version_mismatched") {
    throwApiError("CONFLICT", result.errors);
  }
  if (result.status === "error") {
    throwApiError("BAD_REQUEST", result.errors);
  }
  if (result.status !== "ok") {
    return throwApiError("BAD_REQUEST", "Unexpected patch result");
  }
  return { version: result.version };
};

const getParentFolderIdOrThrow = (pages: Pages, pageId: string) => {
  const folderId = getParentFolderId(pages.folders, pageId);
  if (folderId !== undefined) {
    return folderId;
  }
  return throwApiError("NOT_FOUND", "Page parent folder not found");
};

const getFolderOrThrow = (
  pages: Pages,
  folderId: string
): NonNullable<ReturnType<typeof findFolder>> => {
  const folder = findFolder(pages, folderId);
  if (folder === undefined) {
    return throwApiError("NOT_FOUND", "Folder not found");
  }
  return folder;
};

const getPageOrThrow = (
  pages: Pages,
  pageId: string
): NonNullable<ReturnType<typeof findPage>> => {
  const page = findPage(pages, pageId);
  if (page === undefined) {
    return throwApiError("NOT_FOUND", "Page not found");
  }
  return page;
};

const getInstanceOrThrow = (
  instances: Map<string, Instance>,
  instanceId: string
): Instance => {
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return throwApiError("NOT_FOUND", "Instance not found");
  }
  return instance;
};

const getParentInstanceOrThrow = (
  instances: Map<string, Instance>,
  instanceId: string
): NonNullable<ReturnType<typeof findParentInstanceReference>> => {
  const parent = findParentInstanceReference(instances, instanceId);
  if (parent === undefined) {
    return throwApiError("NOT_FOUND", "Parent instance not found");
  }
  return parent;
};

const getRequiredPageByInput = (
  pages: ReturnType<typeof getSerializedPages>,
  input: { pageId?: string; pagePath?: string }
) => {
  if (input.pageId === undefined && input.pagePath === undefined) {
    return undefined;
  }
  const page = findSerializedPageByInput(pages, input);
  if (page === undefined) {
    throwApiError("NOT_FOUND", "Page not found");
  }
  return page;
};

const serializeRequiredPageDetails = (
  build: CompactBuild,
  input: { pageId?: string; pagePath?: string }
) => {
  const details = serializePageDetailsByInput(build, input);
  if (details === undefined) {
    throwApiError("NOT_FOUND", "Page not found");
  }
  return details;
};

const getTextChildOrThrow = (
  build: CompactBuild,
  input: {
    instanceId: string;
    childIndex: number;
    mode?: "text" | "expression";
  }
): Extract<
  ReturnType<typeof findTextContentChild>,
  { status: "found" }
>["child"] => {
  const result = findTextContentChild(build.instances, input);
  switch (result.status) {
    case "found":
      return result.child;
    case "instance-not-found":
      return throwApiError("NOT_FOUND", "Instance not found");
    case "child-not-found":
      return throwApiError("NOT_FOUND", "Child not found");
    case "not-text-content":
      return throwApiError("BAD_REQUEST", "Child is not text or expression");
    case "mode-mismatch":
      return throwApiError(
        "BAD_REQUEST",
        `Child is ${result.actual}, not ${input.mode}`
      );
  }
};

const validateTextValue = (mode: "text" | "expression", value: string) => {
  const errors = getTextContentErrors({ type: mode, value });
  if (errors.length > 0) {
    throwBadRequest(errors);
  }
};

const getResourceOrThrow = (
  resources: Resource[],
  resourceId: string
): Resource => {
  const found = findResource(resources, resourceId);
  if (found === undefined) {
    return throwApiError("NOT_FOUND", "Resource not found");
  }
  return found;
};

const validateResourceExpressions = (
  fields: z.infer<typeof resourceFieldsUpdateInput>
) => {
  const errors = getResourceExpressionErrors(fields);
  if (errors.length > 0) {
    throwBadRequest(errors);
  }
};

const validatePropValue = (value: z.infer<typeof propValueInput>): Prop => {
  const result = createValidatedPropValueFromInput(value);
  if (result.success === true) {
    return result.prop;
  }
  return throwBadRequest(result.errors);
};

const validatePropBinding = (
  binding: z.infer<typeof propBindingInput>
): Prop => {
  const result = createValidatedPropBindingFromInput(binding);
  if (result.success === true) {
    return result.prop;
  }
  return throwBadRequest(result.errors);
};

const getDesignTokenOrThrow = (
  build: CompactBuild,
  tokenId: string
): NonNullable<ReturnType<typeof findDesignToken>> => {
  const token = findDesignToken(build.styleSources, tokenId);
  if (token === undefined) {
    return throwApiError("NOT_FOUND", "Design token not found");
  }
  return token;
};

const assertCssVariableName = (name: string) => {
  const error = validateCssVariableNameWithStyles({ name, styles: [] });
  if (error !== undefined) {
    throwApiError("BAD_REQUEST", error.message);
  }
};

const compileOptionalRegex = (pattern: string | undefined) => {
  if (pattern === undefined) {
    return;
  }
  try {
    return new RegExp(pattern);
  } catch {
    return throwApiError("BAD_REQUEST", "Invalid scope regex");
  }
};

const getAssetOrThrow = (assets: Asset[], assetId: string): Asset => {
  const asset = findAsset(assets, assetId);
  if (asset === undefined) {
    return throwApiError("NOT_FOUND", "Asset not found");
  }
  return asset;
};

const applySemanticBuildPatch = async ({
  build,
  ctx,
  projectId,
  payload,
}: {
  build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>;
  ctx: AppContext;
  projectId: string;
  payload: z.infer<typeof buildPatchTransaction>["payload"];
}) => {
  await assertApiProjectPermit(ctx, projectId, "build");
  return await commitBuildPatch({ build, ctx, projectId, payload });
};

const applyBuildPayload = async <Result extends Record<string, unknown> = {}>(
  ctx: AppContext,
  build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>,
  projectId: string,
  payload: z.infer<typeof buildPatchTransaction>["payload"],
  result?: Result
) => ({
  ...(await applySemanticBuildPatch({ build, ctx, projectId, payload })),
  ...(result ?? {}),
});

const buildGetInput = projectIdInput.extend({
  include: z.array(buildInclude).optional(),
  version: z.number().int().optional(),
});

const buildPatchInput = projectIdInput.extend({
  baseVersion: z.number().int(),
  transactions: z.array(buildPatchTransaction).min(1),
});

const projectQuery = <Schema extends z.ZodType<{ projectId: string }>, Result>(
  input: Schema,
  permit: AuthPermit,
  handler: (args: {
    ctx: AppContext;
    input: z.infer<Schema>;
    auth: Awaited<ReturnType<typeof assertApiProjectPermit>>;
  }) => Promise<Result>
) =>
  procedure.input(input).query(async ({ ctx, input }) => {
    const parsedInput = input as z.infer<Schema>;
    return await handler({
      ctx,
      input: parsedInput,
      auth: await assertApiProjectPermit(ctx, parsedInput.projectId, permit),
    });
  });

const projectMutation = <
  Schema extends z.ZodType<{ projectId: string }>,
  Result,
>(
  input: Schema,
  permit: AuthPermit,
  handler: (args: {
    ctx: AppContext;
    input: z.infer<Schema>;
    auth: Awaited<ReturnType<typeof assertApiProjectPermit>>;
  }) => Promise<Result>
) =>
  procedure.input(input).mutation(async ({ ctx, input }) => {
    const parsedInput = input as z.infer<Schema>;
    return await handler({
      ctx,
      input: parsedInput,
      auth: await assertApiProjectPermit(ctx, parsedInput.projectId, permit),
    });
  });

const buildQuery = <Schema extends z.ZodType<{ projectId: string }>, Result>(
  input: Schema,
  handler: (args: {
    ctx: AppContext;
    input: z.infer<Schema>;
    build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>;
  }) => Promise<Result>
) =>
  procedure.input(input).query(async ({ ctx, input }) => {
    const parsedInput = input as z.infer<Schema>;
    return await handler({
      ctx,
      input: parsedInput,
      build: await loadReadableDevBuild(ctx, parsedInput.projectId),
    });
  });

const buildMutation = <Schema extends z.ZodType<{ projectId: string }>, Result>(
  input: Schema,
  handler: (args: {
    ctx: AppContext;
    input: z.infer<Schema>;
    build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>;
    commit: <CommitResult extends Record<string, unknown> = {}>(
      payload: z.infer<typeof buildPatchTransaction>["payload"],
      result?: CommitResult
    ) => Promise<{ version: number } & CommitResult>;
  }) => Promise<Result>
) =>
  procedure.input(input).mutation(async ({ ctx, input }) => {
    const parsedInput = input as z.infer<Schema>;
    await assertApiProjectPermit(ctx, parsedInput.projectId, "build");
    const build = await loadReadableDevBuild(ctx, parsedInput.projectId);
    return await handler({
      ctx,
      input: parsedInput,
      build,
      commit: async <CommitResult extends Record<string, unknown> = {}>(
        payload: z.infer<typeof buildPatchTransaction>["payload"],
        result?: CommitResult
      ) =>
        (await applyBuildPayload(
          ctx,
          build,
          parsedInput.projectId,
          payload,
          result
        )) as { version: number } & CommitResult,
    });
  });

const createContentModeCapabilitiesFromBuild = (build: CompactBuild) =>
  getContentModeCapabilities({
    instances: mapById(build.instances),
    metas: componentMetas,
    props: mapById(build.props),
    styleSources: mapById(build.styleSources),
    styleSourceSelections: new Map(
      build.styleSourceSelections.map((selection) => [
        selection.instanceId,
        selection,
      ])
    ),
    styles: new Map(
      build.styles.map((styleDecl) => [getStyleDeclKey(styleDecl), styleDecl])
    ),
    breakpoints: mapById(build.breakpoints),
  });

const assertContentOrBuildPayload = ({
  auth,
  build,
  payload,
}: {
  auth: Awaited<ReturnType<typeof assertApiProjectPermit>>;
  build: CompactBuild;
  payload: z.infer<typeof buildPatchTransaction>["payload"];
}) => {
  if (auth.permits.includes("build")) {
    return;
  }
  const result = applyContentModeTransaction({
    capabilities: createContentModeCapabilitiesFromBuild(build),
    transaction: { id: "api-content-mode", payload },
  });
  if (result.success === false) {
    throw new AuthorizationError(result.error);
  }
};

const contentOrBuildMutation = <
  Schema extends z.ZodType<{ projectId: string }>,
  Result,
>(
  input: Schema,
  handler: (args: {
    ctx: AppContext;
    input: z.infer<Schema>;
    build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>;
    commit: <CommitResult extends Record<string, unknown> = {}>(
      payload: z.infer<typeof buildPatchTransaction>["payload"],
      result?: CommitResult
    ) => Promise<{ version: number } & CommitResult>;
  }) => Promise<Result>
) =>
  procedure.input(input).mutation(async ({ ctx, input }) => {
    const parsedInput = input as z.infer<Schema>;
    const auth = await assertApiProjectPermit(
      ctx,
      parsedInput.projectId,
      "edit"
    );
    const build = await loadReadableDevBuild(ctx, parsedInput.projectId);
    return await handler({
      ctx,
      input: parsedInput,
      build,
      commit: async <CommitResult extends Record<string, unknown> = {}>(
        payload: z.infer<typeof buildPatchTransaction>["payload"],
        result?: CommitResult
      ) => {
        assertContentOrBuildPayload({ auth, build, payload });
        return (await applyBuildPayload(
          ctx,
          build,
          parsedInput.projectId,
          payload,
          result
        )) as { version: number } & CommitResult;
      },
    });
  });

const cssVariableListInput = projectIdInput.extend({
  filter: z.string().optional(),
  withUsage: z.boolean().optional(),
});

const cssVariableDefineInput = projectIdInput.extend({
  vars: z.record(cssVariableValueInput),
  overwrite: z.boolean().optional(),
});

const cssVariableDeleteInput = projectIdInput.extend({
  names: z.array(z.string()).min(1),
  force: z.boolean().optional(),
  confirm: z.literal(true),
});

const cssVariableRewriteRefsInput = projectIdInput.extend({
  map: z.record(z.string()),
  scopeRegex: z.string().optional(),
});

export const apiRouter = router({
  auth: router({
    me: procedure.query(async ({ ctx }) => {
      const token = await loadApiToken(ctx);
      const permits = getTokenPermits(token, ctx);
      return {
        actor: { type: "token" as const, tokenId: token.token },
        projectId: token.projectId,
        relation: token.relation,
        permits,
      };
    }),
  }),

  projects: router({
    permissions: procedure
      .input(projectIdInput)
      .query(async ({ ctx, input }) => {
        const token = await loadApiToken(ctx);
        if (token.projectId !== input.projectId) {
          throw new AuthorizationError(
            "Authorization token is not valid for project"
          );
        }
        const permits = getTokenPermits(token, ctx);
        const canUseProject = await authorizeProject.hasProjectPermit(
          { projectId: input.projectId, permit: "view" },
          ctx
        );
        if (canUseProject === false) {
          throw new AuthorizationError("You don't have access to this project");
        }
        return {
          relation: token.relation,
          permits,
          canView: permits.includes("view"),
          canEdit: permits.includes("edit"),
          canBuild: permits.includes("build"),
          canAdmin: permits.includes("admin"),
          canOwn: false,
          canUseApi: permits.includes("api"),
          canPublish: token.canPublish === true,
          canPublishProjectDomain:
            token.canPublish === true || token.relation === "builders",
          canPublishCustomDomains: token.canPublish === true,
        };
      }),

    get: projectQuery(projectIdInput, "view", async ({ ctx, input }) => {
      const project = await loadById(input.projectId, ctx);
      const build = await loadDevBuildByProjectId(ctx, input.projectId);
      return {
        ...serializeProjectSummary(project),
        buildId: build.id,
        version: build.version,
        homePageId: build.pages.homePageId,
        features: ctx.planFeatures,
      };
    }),
  }),

  build: router({
    get: projectQuery(buildGetInput, "view", async ({ ctx, input }) => {
      const build =
        input.version === undefined
          ? await loadDevBuildByProjectId(ctx, input.projectId)
          : await loadBuildByProjectVersion(
              ctx,
              input.projectId,
              input.version
            );

      if (build.projectId !== input.projectId) {
        throwApiError("NOT_FOUND", "Build not found for project");
      }

      const include = new Set(input.include ?? []);
      const snapshot = createBuildSnapshot({
        build,
        include,
        projectId: input.projectId,
      });
      if (include.has("assets")) {
        snapshot.assets = await loadAssetsByProject(input.projectId, ctx);
      }

      return snapshot;
    }),

    patch: projectMutation(buildPatchInput, "build", async ({ ctx, input }) => {
      const build = await loadDevBuildByProjectId(ctx, input.projectId);
      return commitBuildTransactions({
        ctx,
        projectId: input.projectId,
        buildId: build.id,
        clientVersion: input.baseVersion,
        transactions: input.transactions,
      });
    }),
  }),

  pages: router({
    list: buildQuery(
      projectIdInput.extend({ includeFolders: z.boolean().optional() }),
      async ({ input, build }) => {
        const pages = getSerializedPages(build);
        return {
          pages: pages.pages.map((page) => serializePageSummary(pages, page)),
          folders: input.includeFolders === true ? pages.folders : undefined,
        };
      }
    ),

    get: buildQuery(
      projectIdInput.extend({ pageId: z.string() }),
      async ({ input, build }) => {
        return serializeRequiredPageDetails(build, { pageId: input.pageId });
      }
    ),

    getByPath: buildQuery(
      projectIdInput.extend({ path: z.string() }),
      async ({ input, build }) => {
        return serializeRequiredPageDetails(build, {
          pagePath: input.path === "/" ? "" : input.path,
        });
      }
    ),

    create: buildMutation(
      projectIdInput.extend({
        pageId: z.string().optional(),
        name: z.string().min(1),
        path: z.string(),
        title: z.string().optional(),
        parentFolderId: z.string().optional(),
        meta: pageMetaInput.optional(),
      }),
      async ({ input, build, commit }) => {
        const pages = build.pages;
        const parentFolderId = input.parentFolderId ?? pages.rootFolderId;
        const parentFolder = getFolderOrThrow(pages, parentFolderId);
        const pageId = input.pageId ?? nanoid();
        if (pages.pages.has(pageId)) {
          throwApiError("CONFLICT", "Page id already exists");
        }
        if (
          isPathAvailable({
            pages,
            path: input.path,
            parentFolderId,
            pageId,
          }) === false
        ) {
          throwApiError(
            "CONFLICT",
            `Page path "${input.path}" is already in use`
          );
        }
        const rootInstanceId = nanoid();
        const page = createPageValue({
          pageId,
          name: input.name,
          path: input.path,
          title: input.title,
          rootInstanceId,
          meta:
            input.meta === undefined ? {} : pageMetaToPatchValue(input.meta),
        });
        const rootInstance = createPageRootInstance(rootInstanceId);
        return await commit(
          createPageCreatePayload({
            page,
            parentFolderId,
            parentChildIndex: parentFolder.children.length,
            rootInstance,
          }),
          { pageId }
        );
      }
    ),

    update: buildMutation(
      projectIdInput.extend({
        pageId: z.string(),
        values: pageFieldsInput,
      }),
      async ({ input, build, commit }) => {
        const page = getPageOrThrow(build.pages, input.pageId);
        if (
          (input.values.path !== undefined ||
            input.values.parentFolderId !== undefined) &&
          isPathAvailable({
            pages: build.pages,
            path: input.values.path ?? page.path,
            parentFolderId:
              input.values.parentFolderId ??
              getParentFolderIdOrThrow(build.pages, page.id),
            pageId: page.id,
          }) === false
        ) {
          throwApiError(
            "CONFLICT",
            `Page path "${input.values.path ?? page.path}" is already in use`
          );
        }
        if (input.values.parentFolderId !== undefined) {
          getFolderOrThrow(build.pages, input.values.parentFolderId);
          getParentFolderIdOrThrow(build.pages, page.id);
        }
        const payload = createPageUpdatePayload({
          input: input.values,
          page,
          pages: build.pages,
        });
        if (payload.length === 0) {
          return { version: build.version, pageId: input.pageId };
        }
        return await commit(payload, { pageId: input.pageId });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({ pageId: z.string() }),
      async ({ input, build, commit }) => {
        const page = getPageOrThrow(build.pages, input.pageId);
        if (page.id === build.pages.homePageId) {
          throwApiError("BAD_REQUEST", "Home page cannot be deleted");
        }
        const parentFolderId = getParentFolderIdOrThrow(
          build.pages,
          input.pageId
        );
        const payload = createPageDeletePayload({
          build,
          page,
          parentFolderId,
        });
        return await commit(payload, { pageId: input.pageId });
      }
    ),

    duplicate: buildMutation(
      projectIdInput.extend({
        pageId: z.string(),
        parentFolderId: z.string().optional(),
        name: z.string().min(1).optional(),
        path: z.string().optional(),
      }),
      async ({ input, build, commit }) => {
        const sourcePage = getPageOrThrow(build.pages, input.pageId);
        const parentFolderId =
          input.parentFolderId ??
          getParentFolderIdOrThrow(build.pages, sourcePage.id);
        getFolderOrThrow(build.pages, parentFolderId);
        if (
          input.path !== undefined &&
          isPathAvailable({
            pages: build.pages,
            path: input.path,
            parentFolderId,
          }) === false
        ) {
          throwApiError(
            "CONFLICT",
            `Page path "${input.path}" is already in use`
          );
        }
        const duplicate = createPageDuplicatePayload({
          build,
          projectId: input.projectId,
          pageId: sourcePage.id,
          parentFolderId,
          name: input.name,
          path: input.path,
        });
        if (duplicate === undefined) {
          return throwApiError("BAD_REQUEST", "Page could not be duplicated");
        }
        return await commit(duplicate.payload, { pageId: duplicate.pageId });
      }
    ),
  }),

  folders: router({
    list: buildQuery(
      projectIdInput.extend({ includePages: z.boolean().optional() }),
      async ({ input, build }) => {
        const pages = getSerializedPages(build);
        return {
          folders: pages.folders.map((folder) => ({
            id: folder.id,
            name: folder.name,
            slug: folder.slug,
            parentFolderId: findParentFolderId(pages.folders, folder.id),
            children: folder.children,
          })),
          pages:
            input.includePages === true
              ? pages.pages.map((page) => serializePageSummary(pages, page))
              : undefined,
        };
      }
    ),

    create: buildMutation(
      projectIdInput.extend({
        folderId: z.string().optional(),
        name: z.string().min(1),
        slug: z.string(),
        parentFolderId: z.string().optional(),
      }),
      async ({ input, build, commit }) => {
        const pages = build.pages;
        const parentFolderId = input.parentFolderId ?? pages.rootFolderId;
        const parentFolder = getFolderOrThrow(pages, parentFolderId);
        const folderId = input.folderId ?? nanoid();
        if (pages.folders.has(folderId)) {
          throwApiError("CONFLICT", "Folder id already exists");
        }
        if (
          isSlugAvailable(
            input.slug,
            pages.folders,
            parentFolderId,
            folderId
          ) === false
        ) {
          throwApiError(
            "CONFLICT",
            `Folder slug "${input.slug}" is already in use`
          );
        }
        const folder = createFolderValue({
          folderId,
          name: input.name,
          slug: input.slug,
        });
        return await commit(
          createFolderCreatePayload({
            folder,
            parentFolderId,
            parentChildIndex: parentFolder.children.length,
          }),
          { folderId }
        );
      }
    ),

    update: buildMutation(
      projectIdInput.extend({
        folderId: z.string(),
        values: z.object({
          name: z.string().min(1).optional(),
          slug: z.string().optional(),
          parentFolderId: z.string().optional(),
        }),
      }),
      async ({ input, build, commit }) => {
        const pages = build.pages;
        const folder = getFolderOrThrow(pages, input.folderId);
        if (folder.id === pages.rootFolderId) {
          throwApiError("BAD_REQUEST", "Root folder cannot be updated");
        }
        if (input.values.slug !== undefined) {
          if (
            isSlugAvailable(
              input.values.slug,
              pages.folders,
              input.values.parentFolderId ??
                getParentFolderIdOrThrow(pages, folder.id),
              folder.id
            ) === false
          ) {
            throwApiError(
              "CONFLICT",
              `Folder slug "${input.values.slug}" is already in use`
            );
          }
        }
        if (input.values.parentFolderId !== undefined) {
          const descendantFolderIds = getAllChildrenAndSelf(
            folder.id,
            pages.folders,
            "folder"
          );
          if (descendantFolderIds.includes(input.values.parentFolderId)) {
            throwApiError(
              "BAD_REQUEST",
              "Folder cannot be moved into itself or a descendant"
            );
          }
          const slug = input.values.slug ?? folder.slug;
          if (
            isSlugAvailable(
              slug,
              pages.folders,
              input.values.parentFolderId,
              folder.id
            ) === false
          ) {
            throwApiError(
              "CONFLICT",
              `Folder slug "${slug}" is already in use`
            );
          }
          getFolderOrThrow(pages, input.values.parentFolderId);
          getParentFolderIdOrThrow(pages, folder.id);
        }
        const payload = createFolderUpdatePayload({
          folder,
          pages,
          values: input.values,
        });
        if (payload.length === 0) {
          return { version: build.version, folderId: input.folderId };
        }
        return await commit(payload, { folderId: input.folderId });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({ folderId: z.string() }),
      async ({ input, build, commit }) => {
        const pages = build.pages;
        const folder = getFolderOrThrow(pages, input.folderId);
        if (folder.id === pages.rootFolderId) {
          throwApiError("BAD_REQUEST", "Root folder cannot be deleted");
        }
        const parentFolderId = getParentFolderIdOrThrow(pages, folder.id);
        const { folderIds, pageIds, payload } = createFolderDeletePayload({
          build,
          folder,
          parentFolderId,
        });
        if (folderIds.length === 0) {
          throwApiError(
            "BAD_REQUEST",
            "Folder containing home page cannot be deleted"
          );
        }
        return await commit(payload, {
          folderId: input.folderId,
          pageIds,
          folderIds,
        });
      }
    ),
  }),

  instances: router({
    list: buildQuery(
      projectIdInput.extend({
        pageId: z.string().optional(),
        pagePath: z.string().optional(),
        rootInstanceId: z.string().optional(),
        maxDepth: z.number().int().nonnegative().optional(),
        topLevelOnly: z.boolean().optional(),
        component: z.string().optional(),
        tag: z.string().optional(),
        labelContains: z.string().optional(),
      }),
      async ({ input, build }) => {
        const pages = getSerializedPages(build);
        const page = getRequiredPageByInput(pages, input);
        const rootInstanceIds =
          input.rootInstanceId !== undefined
            ? [input.rootInstanceId]
            : page === undefined
              ? undefined
              : [page.rootInstanceId];
        const depths = getInstanceDepths(build, rootInstanceIds);
        const instances = [];
        for (const instance of build.instances) {
          const depth = depths.get(instance.id);
          if (depth === undefined) {
            continue;
          }
          if (input.maxDepth !== undefined && depth > input.maxDepth) {
            continue;
          }
          if (input.topLevelOnly === true && depth > 0) {
            continue;
          }
          if (
            input.component !== undefined &&
            instance.component !== input.component
          ) {
            continue;
          }
          if (input.tag !== undefined && instance.tag !== input.tag) {
            continue;
          }
          if (
            input.labelContains !== undefined &&
            instance.label?.includes(input.labelContains) !== true
          ) {
            continue;
          }
          instances.push(serializeInstanceSummary(instance, depth));
        }
        return { instances };
      }
    ),

    inspect: buildQuery(
      projectIdInput.extend({
        instanceId: z.string(),
        include: z
          .array(z.enum(["props", "styles", "children", "bindings", "sources"]))
          .optional(),
        childDepth: z.number().int().optional(),
      }),
      async ({ input, build }) => {
        const depths = getInstanceDepths(build, [input.instanceId]);
        const instance = build.instances.find(
          (instance) => instance.id === input.instanceId
        );
        if (instance === undefined) {
          return throwApiError("NOT_FOUND", "Instance not found");
        }

        const include = new Set(input.include ?? []);
        const details: Record<string, unknown> = serializeInstanceSummary(
          instance,
          depths.get(instance.id) ?? 0
        );
        if (include.has("props")) {
          details.props = build.props.filter(
            (prop) => prop.instanceId === instance.id
          );
        }
        if (include.has("styles")) {
          details.styles = serializeStyleDeclarations({
            styles: build.styles,
            styleSources: build.styleSources,
            styleSourceSelections: build.styleSourceSelections,
            instanceIds: new Set([instance.id]),
          });
        }
        if (include.has("children")) {
          const maxDepth = input.childDepth ?? 1;
          details.children = build.instances
            .filter((child) => {
              const depth = depths.get(child.id);
              return depth !== undefined && depth > 0 && depth <= maxDepth;
            })
            .map((child) =>
              serializeInstanceSummary(child, depths.get(child.id) ?? 0)
            );
        }
        if (include.has("bindings")) {
          details.bindings = build.props.filter(
            (prop) =>
              prop.instanceId === instance.id &&
              (prop.type === "expression" ||
                prop.type === "parameter" ||
                prop.type === "resource" ||
                prop.type === "action")
          );
        }
        if (include.has("sources")) {
          const selected = build.styleSourceSelections.find(
            (selection) => selection.instanceId === instance.id
          );
          details.sources = selected?.values ?? [];
        }
        return details;
      }
    ),

    append: buildMutation(
      projectIdInput.extend({
        parentInstanceId: z.string(),
        mode: z.enum(["append", "prepend", "replace"]).optional(),
        insertIndex: z.number().int().nonnegative().optional(),
        children: z
          .array(
            z.object({
              instanceId: z.string().optional(),
              component: z.string().optional(),
              tag: z.string(),
              label: z.string().optional(),
              text: z.string().optional(),
            })
          )
          .min(1),
      }),
      async ({ input, build, commit }) => {
        const instances = mapById(build.instances);
        const parent = getInstanceOrThrow(instances, input.parentInstanceId);
        const mode = input.mode ?? "append";
        const insertIndex =
          mode === "replace"
            ? 0
            : mode === "prepend"
              ? 0
              : (input.insertIndex ?? parent.children.length);
        if (insertIndex > parent.children.length) {
          throwApiError(
            "BAD_REQUEST",
            "Insert index is outside parent children"
          );
        }
        const createdInstances: Instance[] = input.children.map((child) => {
          const instanceId = child.instanceId ?? nanoid();
          if (instances.has(instanceId)) {
            throwApiError("CONFLICT", "Instance id already exists");
          }
          return {
            type: "instance",
            id: instanceId,
            component: child.component ?? elementComponent,
            tag: child.tag,
            label: child.label,
            children:
              child.text === undefined
                ? []
                : [createTextContentChild({ type: "text", value: child.text })],
          };
        });
        const { payload, replacedInstanceIds } = createInstanceAppendPayload({
          build,
          parent,
          instances,
          createdInstances,
          insertIndex,
          mode,
        });
        return await commit(payload, {
          instanceIds: createdInstances.map((instance) => instance.id),
          removedInstanceIds: replacedInstanceIds,
        });
      }
    ),

    move: buildMutation(
      projectIdInput.extend({
        moves: z
          .array(
            z.object({
              instanceId: z.string(),
              parentInstanceId: z.string(),
              insertIndex: z.number().int().nonnegative().optional(),
            })
          )
          .min(1),
      }),
      async ({ input, build, commit }) => {
        const instances = mapById(build.instances);
        const { errors, payload } = createInstanceMovePayload({
          instances,
          moves: input.moves,
        });
        const error = errors.at(0);
        if (error?.type === "instance-not-found") {
          throwApiError("NOT_FOUND", "Instance not found");
        }
        if (error?.type === "parent-not-found") {
          throwApiError("NOT_FOUND", "Parent instance not found");
        }
        if (error?.type === "target-parent-not-found") {
          throwApiError("NOT_FOUND", "Instance not found");
        }
        if (error?.type === "descendant-target") {
          throwApiError(
            "BAD_REQUEST",
            "Instance cannot be moved into itself or a descendant"
          );
        }
        if (error?.type === "insert-index-outside-parent") {
          throwApiError(
            "BAD_REQUEST",
            "Insert index is outside parent children"
          );
        }
        return await commit(payload, {
          instanceIds: input.moves.map((move) => move.instanceId),
        });
      }
    ),

    clone: buildMutation(
      projectIdInput.extend({
        sourceInstanceId: z.string(),
        targetParentInstanceId: z.string().optional(),
        insertIndex: z.number().int().nonnegative().optional(),
      }),
      async ({ input, build, commit }) => {
        const instances = mapById(build.instances);
        const source = getInstanceOrThrow(instances, input.sourceInstanceId);
        const targetParent =
          input.targetParentInstanceId === undefined
            ? getParentInstanceOrThrow(instances, source.id).instance
            : getInstanceOrThrow(instances, input.targetParentInstanceId);
        const insertIndex = input.insertIndex ?? targetParent.children.length;
        if (insertIndex > targetParent.children.length) {
          throwApiError(
            "BAD_REQUEST",
            "Insert index is outside parent children"
          );
        }
        const clone = createInstanceClonePayload({
          instances,
          sourceInstanceId: source.id,
          targetParent,
          insertIndex,
          props: build.props,
          styleSourceSelections: build.styleSourceSelections,
          styleSources: build.styleSources,
          styles: build.styles,
        });
        if (clone === undefined) {
          return throwApiError(
            "BAD_REQUEST",
            "Source instance could not be cloned"
          );
        }
        return await commit(clone.payload, {
          instanceId: clone.clonedRootId,
          instanceIds: clone.clonedInstanceIds,
        });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({
        instanceIds: z.array(z.string()).min(1),
      }),
      async ({ input, build, commit }) => {
        const pages = getSerializedPages(build);
        const pageRootIds = new Set(
          pages.pages.map((page) => page.rootInstanceId)
        );
        const instances = mapById(build.instances);
        const { errors, payload, instanceIds } = createInstanceDeletePayload({
          instances,
          instanceIds: input.instanceIds,
          pageRootIds,
          props: build.props,
          dataSources: build.dataSources,
          styleSources: build.styleSources,
          styleSourceSelections: build.styleSourceSelections,
          styles: build.styles,
        });
        const error = errors.at(0);
        if (error?.type === "page-root") {
          throwApiError("BAD_REQUEST", "Page root instance cannot be deleted");
        }
        if (error?.type === "instance-not-found") {
          throwApiError("NOT_FOUND", "Instance not found");
        }
        if (error?.type === "parent-not-found") {
          throwApiError("NOT_FOUND", "Parent instance not found");
        }
        return await commit(payload, { instanceIds });
      }
    ),

    updateProps: contentOrBuildMutation(
      projectIdInput.extend({
        updates: z.array(propValueInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const instances = mapById(build.instances);
        const nextProps = input.updates.map((update) => {
          getInstanceOrThrow(instances, update.instanceId);
          const existing = findProp(
            build.props,
            update.instanceId,
            update.name
          );
          const nextProp = validatePropValue({
            ...update,
            propId: update.propId ?? existing?.id,
          });
          return nextProp;
        });
        const { payload, propIds } = createPropUpsertPayload({
          props: build.props,
          nextProps,
        });
        return await commit(payload, { propIds });
      }
    ),

    deleteProps: contentOrBuildMutation(
      projectIdInput.extend({
        deletions: z
          .array(z.object({ instanceId: z.string(), name: z.string() }))
          .min(1),
      }),
      async ({ input, build, commit }) => {
        const { missingInstanceId, payload, propIds } = createPropDeletePayload(
          {
            instances: mapById(build.instances),
            props: build.props,
            deletions: input.deletions,
          }
        );
        if (missingInstanceId !== undefined) {
          throwApiError("NOT_FOUND", "Instance not found");
        }
        if (payload.length === 0) {
          return { version: build.version, propIds: [] };
        }
        return await commit(payload, { propIds });
      }
    ),

    bindProps: buildMutation(
      projectIdInput.extend({
        bindings: z.array(propBindingInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const instances = mapById(build.instances);
        const nextProps = input.bindings.map((binding) => {
          getInstanceOrThrow(instances, binding.instanceId);
          const existing = findProp(
            build.props,
            binding.instanceId,
            binding.name
          );
          const nextProp = validatePropBinding({
            ...binding,
            propId: binding.propId ?? existing?.id,
          });
          return nextProp;
        });
        const { payload, propIds } = createPropUpsertPayload({
          props: build.props,
          nextProps,
        });
        return await commit(payload, { propIds });
      }
    ),

    listTexts: buildQuery(
      projectIdInput.extend({
        pageId: z.string().optional(),
        pagePath: z.string().optional(),
        instanceId: z.string().optional(),
        mode: z.enum(["text", "expression", "all"]).optional(),
        contains: z.string().optional(),
        maxValueLength: z.number().int().nonnegative().optional(),
      }),
      async ({ input, build }) => {
        const pages = getSerializedPages(build);
        const page = getRequiredPageByInput(pages, input);
        const rootInstanceIds =
          page === undefined
            ? undefined
            : new Set(getInstanceDepths(build, [page.rootInstanceId]).keys());
        return {
          texts: serializeTextNodes({
            instances: build.instances,
            rootInstanceIds,
            instanceId: input.instanceId,
            mode: input.mode,
            contains: input.contains,
            maxValueLength: input.maxValueLength,
          }),
        };
      }
    ),

    updateText: contentOrBuildMutation(
      projectIdInput.extend({
        instanceId: z.string(),
        childIndex: z.number().int().nonnegative(),
        text: z.string(),
        mode: z.enum(["text", "expression"]).optional(),
      }),
      async ({ input, build, commit }) => {
        const child = getTextChildOrThrow(build, input);
        const mode = input.mode ?? child.type;
        validateTextValue(mode, input.text);
        if (child.value === input.text) {
          return {
            version: build.version,
            instanceId: input.instanceId,
            childIndex: input.childIndex,
            mode,
          };
        }
        return await commit(
          createTextContentUpdatePayload({
            instanceId: input.instanceId,
            childIndex: input.childIndex,
            child: createTextContentChild({
              type: mode,
              value: input.text,
            }),
          }),
          {
            instanceId: input.instanceId,
            childIndex: input.childIndex,
            mode,
          }
        );
      }
    ),
  }),

  styles: router({
    getDeclarations: buildQuery(
      projectIdInput.extend({
        instanceIds: z.array(z.string()).optional(),
        pageId: z.string().optional(),
        pagePath: z.string().optional(),
        breakpoint: z.string().optional(),
        state: z.string().optional(),
        property: z.string().optional(),
        propertyFilter: z.string().optional(),
        includeTokens: z.boolean().optional(),
      }),
      async ({ input, build }) => {
        const pages = getSerializedPages(build);
        const page = getRequiredPageByInput(pages, input);
        const pageInstanceIds =
          page === undefined
            ? undefined
            : new Set(getInstanceDepths(build, [page.rootInstanceId]).keys());
        const inputInstanceIds =
          input.instanceIds === undefined
            ? undefined
            : new Set(input.instanceIds);
        const instanceIds =
          pageInstanceIds === undefined
            ? inputInstanceIds
            : new Set(
                Array.from(inputInstanceIds ?? pageInstanceIds).filter(
                  (instanceId) => pageInstanceIds.has(instanceId)
                )
              );
        return {
          declarations: serializeStyleDeclarations({
            styles: build.styles,
            styleSources: build.styleSources,
            styleSourceSelections: build.styleSourceSelections,
            instanceIds,
            breakpoint: input.breakpoint,
            state: input.state,
            property: input.property,
            propertyFilter: input.propertyFilter,
            includeTokens: input.includeTokens,
          }),
        };
      }
    ),

    updateDeclarations: buildMutation(
      projectIdInput.extend({
        updates: z.array(styleUpdateInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const instances = mapById(build.instances);
        for (const update of input.updates) {
          getInstanceOrThrow(instances, update.instanceId);
        }
        const { payload, styleKeys, missingLocalStyleSourceInstanceIds } =
          createStyleDeclarationUpdatePayload({
            updates: input.updates,
            styleSources: mapById(build.styleSources),
            styleSourceSelections: build.styleSourceSelections,
            styles: build.styles,
          });
        if (missingLocalStyleSourceInstanceIds.length > 0) {
          throwApiError(
            "NOT_FOUND",
            "Local style source not found for instance"
          );
        }
        return await commit(payload, { styleKeys });
      }
    ),

    deleteDeclarations: buildMutation(
      projectIdInput.extend({
        deletions: z.array(styleDeleteInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const instances = mapById(build.instances);
        const styleSources = mapById(build.styleSources);
        for (const deletion of input.deletions) {
          getInstanceOrThrow(instances, deletion.instanceId);
        }
        const { payload, styleKeys } = createStyleDeclarationDeletePayload({
          deletions: input.deletions,
          styleSources,
          styleSourceSelections: build.styleSourceSelections,
          styles: build.styles,
        });
        if (styleKeys.length === 0) {
          return { version: build.version, styleKeys: [] };
        }
        return await commit(payload, { styleKeys });
      }
    ),

    replaceValues: buildMutation(
      projectIdInput.merge(styleReplaceInput),
      async ({ input, build, commit }) => {
        const pages = getSerializedPages(build);
        const page = getRequiredPageByInput(pages, input);
        const pageInstanceIds =
          page === undefined
            ? undefined
            : new Set(getInstanceDepths(build, [page.rootInstanceId]).keys());
        const { payload, styleKeys } = createStyleValueReplacementPayload({
          styles: build.styles,
          styleSources: build.styleSources,
          styleSourceSelections: build.styleSourceSelections,
          instanceIds: pageInstanceIds,
          property: input.property,
          fromValue: input.fromValue,
          toValue: input.toValue,
        });
        if (styleKeys.length === 0) {
          return { version: build.version, styleKeys: [] };
        }
        return await commit(payload, { styleKeys });
      }
    ),
  }),

  designTokens: router({
    list: buildQuery(
      projectIdInput.extend({
        filter: z.string().optional(),
        withUsage: z.boolean().optional(),
        sort: z.enum(["name", "usage"]).optional(),
      }),
      async ({ input, build }) => {
        return serializeDesignTokens({
          styleSources: build.styleSources,
          styles: build.styles,
          styleSourceSelections: build.styleSourceSelections,
          filter: input.filter,
          withUsage: input.withUsage,
          sort: input.sort,
        });
      }
    ),

    create: buildMutation(
      projectIdInput.extend({
        tokens: z.array(designTokenCreateInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const { payload, tokenIds, errors } = createDesignTokenCreatePayload({
          tokens: input.tokens,
          styleSources: mapById(build.styleSources),
        });
        const error = errors.at(0);
        if (error?.type === "duplicate-id") {
          throwApiError("CONFLICT", "Design token id already exists");
        }
        if (error?.type === "invalid-name") {
          throwApiError(
            "CONFLICT",
            error.error?.type === "minlength"
              ? "Design token name is required"
              : "Design token name already exists"
          );
        }
        return await commit(payload, { tokenIds });
      }
    ),

    updateStyles: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        updates: z.array(designTokenStyleInput).min(1),
      }),
      async ({ input, build, commit }) => {
        getDesignTokenOrThrow(build, input.designTokenId);
        const { payload, styleKeys } = createDesignTokenStyleUpdatePayload({
          designTokenId: input.designTokenId,
          updates: input.updates,
          styles: build.styles,
        });
        return await commit(payload, {
          designTokenId: input.designTokenId,
          styleKeys,
        });
      }
    ),

    deleteStyles: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        deletions: z.array(styleDeleteInput.omit({ instanceId: true })).min(1),
      }),
      async ({ input, build, commit }) => {
        getDesignTokenOrThrow(build, input.designTokenId);
        const { payload, styleKeys } = createDesignTokenStyleDeletePayload({
          designTokenId: input.designTokenId,
          deletions: input.deletions,
          styles: build.styles,
        });
        if (styleKeys.length === 0) {
          return {
            version: build.version,
            designTokenId: input.designTokenId,
            styleKeys,
          };
        }
        return await commit(payload, {
          designTokenId: input.designTokenId,
          styleKeys,
        });
      }
    ),

    attach: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        instanceIds: z.array(z.string()).min(1),
        position: z.enum(["before-local", "after-local"]).optional(),
      }),
      async ({ input, build, commit }) => {
        getDesignTokenOrThrow(build, input.designTokenId);
        const instances = mapById(build.instances);
        const styleSources = mapById(build.styleSources);
        for (const instanceId of input.instanceIds) {
          getInstanceOrThrow(instances, instanceId);
        }
        const payload = createStyleSourceSelectionAttachPayload({
          instanceIds: input.instanceIds,
          styleSourceSelections: build.styleSourceSelections,
          styleSources,
          styleSourceId: input.designTokenId,
          position: input.position,
        });
        if (payload.length === 0) {
          return { version: build.version, designTokenId: input.designTokenId };
        }
        return await commit(payload, { designTokenId: input.designTokenId });
      }
    ),

    detach: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        instanceIds: z.array(z.string()).min(1),
      }),
      async ({ input, build, commit }) => {
        getDesignTokenOrThrow(build, input.designTokenId);
        const instances = mapById(build.instances);
        for (const instanceId of input.instanceIds) {
          getInstanceOrThrow(instances, instanceId);
        }
        const payload = createStyleSourceSelectionDetachPayload({
          instanceIds: input.instanceIds,
          styleSourceSelections: build.styleSourceSelections,
          styleSourceId: input.designTokenId,
        });
        if (payload.length === 0) {
          return { version: build.version, designTokenId: input.designTokenId };
        }
        return await commit(payload, { designTokenId: input.designTokenId });
      }
    ),

    extract: buildMutation(
      projectIdInput.extend({
        instanceIds: z.array(z.string()).min(1),
        name: z.string().min(1),
        removeLocalProps: z.array(z.string()).optional(),
      }),
      async ({ input, build, commit }) => {
        const tokenId = nanoid();
        const instances = mapById(build.instances);
        for (const instanceId of input.instanceIds) {
          getInstanceOrThrow(instances, instanceId);
        }
        const { payload, styleKeys } = createDesignTokenExtractionPayload({
          tokenId,
          tokenName: input.name,
          instanceIds: input.instanceIds,
          styleSources: mapById(build.styleSources),
          styleSourceSelections: build.styleSourceSelections,
          styles: build.styles,
          removeLocalProps: input.removeLocalProps,
        });
        return await commit(payload, {
          designTokenId: tokenId,
          styleKeys,
        });
      }
    ),
  }),

  cssVariables: router({
    list: buildQuery(cssVariableListInput, async ({ input, build }) => {
      return serializeCssVariables({
        styles: build.styles,
        props: build.props,
        styleSourceSelections: build.styleSourceSelections,
        filter: input.filter,
        withUsage: input.withUsage,
      });
    }),

    define: buildMutation(
      cssVariableDefineInput,
      async ({ input, build, commit }) => {
        const rootInstanceId = getHomePageRootInstanceId(build.pages);
        if (rootInstanceId === undefined) {
          return throwApiError("NOT_FOUND", "Home page not found");
        }
        for (const [property] of Object.entries(input.vars)) {
          assertCssVariableName(property);
        }
        const resultPayload = createCssVariableRootDefinePayload({
          rootInstanceId,
          vars: input.vars,
          styleSources: mapById(build.styleSources),
          styleSourceSelections: build.styleSourceSelections,
          styles: build.styles,
          overwrite: input.overwrite,
        });
        if (resultPayload.missingRootStyleSource) {
          throwApiError(
            "NOT_FOUND",
            "Local style source not found for instance"
          );
        }
        const conflict = resultPayload.conflicts.at(0);
        if (conflict !== undefined) {
          throwApiError(
            "CONFLICT",
            `CSS variable "${conflict}" already exists`
          );
        }
        return await commit(resultPayload.payload, {
          names: Object.keys(input.vars),
        });
      }
    ),

    delete: buildMutation(
      cssVariableDeleteInput,
      async ({ input, build, commit }) => {
        for (const name of input.names) {
          assertCssVariableName(name);
        }
        const { payload, styleKeys, referenced } =
          createCssVariableDeletePayload({
            names: input.names,
            styles: build.styles,
            props: build.props,
            force: input.force,
          });
        if (referenced.length > 0) {
          throwApiError(
            "BAD_REQUEST",
            `CSS variables are still referenced: ${referenced.join(", ")}`
          );
        }
        if (styleKeys.length === 0) {
          return { version: build.version, names: input.names, styleKeys };
        }
        return await commit(payload, { names: input.names, styleKeys });
      }
    ),

    rewriteRefs: buildMutation(
      cssVariableRewriteRefsInput,
      async ({ input, build, commit }) => {
        for (const [fromName, toName] of Object.entries(input.map)) {
          assertCssVariableName(fromName);
          assertCssVariableName(toName);
        }
        const scopeRegex = compileOptionalRegex(input.scopeRegex);
        const { payload, styleKeys, propIds } =
          createCssVariableReferenceRewritePayload({
            replacements: input.map,
            scopeRegex,
            styles: build.styles,
            props: build.props,
            styleSourceSelections: build.styleSourceSelections,
          });
        if (payload.length === 0) {
          return {
            version: build.version,
            styleKeys: [],
            propIds: [],
          };
        }
        return await commit(payload, {
          styleKeys,
          propIds,
        });
      }
    ),
  }),

  variables: router({
    list: buildQuery(
      projectIdInput.extend({ scopeInstanceId: z.string().optional() }),
      async ({ input, build }) => {
        return serializeDataVariables({
          dataSources: build.dataSources,
          scopeInstanceId: input.scopeInstanceId,
        });
      }
    ),

    create: buildMutation(
      projectIdInput.extend({
        dataSourceId: z.string().optional(),
        scopeInstanceId: z.string(),
        name: z.string(),
        value: dataVariableValueInput,
      }),
      async ({ input, build, commit }) => {
        const dataSourceId = input.dataSourceId ?? nanoid();
        const { payload, errors } = createDataVariableCreatePayload({
          dataSourceId,
          scopeInstanceId: input.scopeInstanceId,
          name: input.name,
          value: input.value,
          dataSources: build.dataSources,
        });
        const error = errors.at(0);
        if (error?.type === "duplicate-id") {
          throwApiError("CONFLICT", "Variable id already exists");
        }
        if (error) {
          throwApiError(
            "BAD_REQUEST",
            "message" in error ? error.message : "Invalid variable"
          );
        }
        return await commit(payload, { dataSourceId });
      }
    ),

    update: buildMutation(
      projectIdInput.extend({
        dataSourceId: z.string(),
        values: z.object({
          scopeInstanceId: z.string().optional(),
          name: z.string().optional(),
          value: dataVariableValueInput.optional(),
        }),
      }),
      async ({ input, build, commit }) => {
        const variable = findDataVariable(
          build.dataSources,
          input.dataSourceId
        );
        if (variable === undefined) {
          return throwApiError("NOT_FOUND", "Variable not found");
        }
        const { payload, error } = createDataVariableUpdatePayload({
          variable,
          values: input.values,
          dataSources: build.dataSources,
        });
        if (error) {
          throwApiError("BAD_REQUEST", error.message);
        }
        if (payload.length === 0) {
          return { version: build.version, dataSourceId: variable.id };
        }
        return await commit(payload, { dataSourceId: variable.id });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({
        dataSourceId: z.string(),
      }),
      async ({ input, build, commit }) => {
        const { payload, deletedVariable } = createDataVariableDeletePayload({
          variableId: input.dataSourceId,
          pages: build.pages,
          instances: mapById(build.instances),
          props: mapById(build.props),
          dataSources: mapById(build.dataSources),
          resources: mapById(build.resources),
        });
        if (deletedVariable === undefined) {
          return throwApiError("NOT_FOUND", "Variable not found");
        }
        return await commit(payload, { dataSourceId: deletedVariable.id });
      }
    ),
  }),

  resources: router({
    list: buildQuery(
      projectIdInput.extend({ scopeInstanceId: z.string().optional() }),
      async ({ input, build }) => {
        return serializeResources({
          resources: build.resources,
          dataSources: build.dataSources,
          scopeInstanceId: input.scopeInstanceId,
        });
      }
    ),

    create: buildMutation(
      projectIdInput.extend({
        resourceId: z.string().optional(),
        resource: resourceFieldsInput,
        dataSourceId: z.string().optional(),
        scopeInstanceId: z.string().optional(),
        dataSourceName: z.string().optional(),
      }),
      async ({ input, build, commit }) => {
        const resourceId = input.resourceId ?? nanoid();
        validateResourceExpressions(input.resource);
        const dataSourceId =
          input.scopeInstanceId === undefined
            ? undefined
            : (input.dataSourceId ?? nanoid());
        const resultPayload = createResourceCreatePayload({
          resourceId,
          resource: input.resource,
          resources: build.resources,
          dataSources: build.dataSources,
          dataSourceId,
          scopeInstanceId: input.scopeInstanceId,
          dataSourceName: input.dataSourceName,
        });
        const error = resultPayload.errors.at(0);
        if (error?.type === "duplicate-resource-id") {
          throwApiError("CONFLICT", "Resource id already exists");
        }
        if (error?.type === "duplicate-data-source-id") {
          throwApiError("CONFLICT", "Data source id already exists");
        }
        const resourceValue = createResourceValue({
          id: resourceId,
          name: input.resource.name,
          control: input.resource.control,
          method: input.resource.method,
          url: input.resource.url,
          searchParams: input.resource.searchParams,
          headers: input.resource.headers,
          body: input.resource.body,
        });
        const payload = createResourceUpsertPatchPayload({
          build,
          resource: resourceValue,
          dataSourceId,
          scopeInstanceId: input.scopeInstanceId,
          dataSourceName: input.dataSourceName,
        });
        return await commit(payload, { resourceId, dataSourceId });
      }
    ),

    update: buildMutation(
      projectIdInput.extend({
        resourceId: z.string(),
        values: resourceFieldsUpdateInput,
        dataSourceName: z.string().optional(),
        scopeInstanceId: z.string().optional(),
      }),
      async ({ input, build, commit }) => {
        const resourceValue = getResourceOrThrow(
          build.resources,
          input.resourceId
        );
        validateResourceExpressions(input.values);
        const payload = createResourceUpdatePayload({
          resource: resourceValue,
          values: input.values,
          dataSources: build.dataSources,
          dataSourceName: input.dataSourceName,
          scopeInstanceId: input.scopeInstanceId,
        });
        if (payload.length === 0) {
          return { version: build.version, resourceId: resourceValue.id };
        }
        const nextResourceValue = createResourceValue({
          ...resourceValue,
          ...input.values,
        });
        const dataSource = build.dataSources.find(
          (dataSource) =>
            dataSource.type === "resource" &&
            dataSource.resourceId === resourceValue.id
        );
        const nextPayload = createResourceUpsertPatchPayload({
          build,
          resource: nextResourceValue,
          dataSourceId: dataSource?.id,
          scopeInstanceId: input.scopeInstanceId ?? dataSource?.scopeInstanceId,
          dataSourceName: input.dataSourceName ?? dataSource?.name,
        });
        return await commit(nextPayload, { resourceId: resourceValue.id });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({
        resourceId: z.string(),
        force: z.boolean().optional(),
      }),
      async ({ input, build, commit }) => {
        const resourceValue = getResourceOrThrow(
          build.resources,
          input.resourceId
        );
        const resultPayload = createResourceDeletePayload({
          resource: resourceValue,
          dataSources: build.dataSources,
          props: build.props,
          force: input.force,
        });
        if (resultPayload.isUsed) {
          throwApiError(
            "BAD_REQUEST",
            "Resource is used by props. Pass force to remove those prop references."
          );
        }
        return await commit(resultPayload.payload, {
          resourceId: resourceValue.id,
          dataSourceIds: resultPayload.dataSourceIds,
          propIds: resultPayload.propIds,
        });
      }
    ),
  }),

  publish: router({
    list: projectQuery(projectIdInput, "view", async ({ ctx, input }) => {
      const result = await ctx.postgrest.client
        .from("Build")
        .select("id, version, createdAt, deployment")
        .eq("projectId", input.projectId)
        .not("deployment", "is", null)
        .order("createdAt", { ascending: false });

      if (result.error) {
        throw result.error;
      }

      return {
        publishes: result.data.flatMap((build) => {
          const deployment = parseDeployment(build.deployment);
          if (deployment === undefined || deployment.destination === "static") {
            return [];
          }
          return [
            {
              id: build.id,
              jobId: build.id,
              version: build.version,
              target: deployment.domains.length > 1 ? "production" : "staging",
              domains: deployment.domains,
              createdAt: build.createdAt,
            },
          ];
        }),
      };
    }),

    create: projectMutation(
      projectIdInput.extend({
        target: z.enum(["staging", "production"]),
        domains: z.array(z.string()).optional(),
        message: z.string().optional(),
        idempotencyKey: z.string().optional(),
      }),
      "edit",
      async ({ auth, ctx, input }) => {
        const project = await loadById(input.projectId, ctx);
        const domains =
          input.domains ?? getDefaultPublishDomains(project, input.target);
        assertApiPublishDomains({ auth, domains, project });
        const { build, deploymentNotImplemented } = await publishProject(
          { projectId: input.projectId, domains },
          ctx
        );
        return {
          jobId: build.id,
          warning: deploymentNotImplemented
            ? "Publish was recorded locally, but the deployment service is not available in this environment."
            : undefined,
        };
      }
    ),

    getJob: projectQuery(
      projectIdInput.extend({ jobId: z.string() }),
      "view",
      async ({ ctx, input }) => {
        const result = await ctx.postgrest.client
          .from("Build")
          .select("id, version, createdAt, deployment")
          .eq("projectId", input.projectId)
          .eq("id", input.jobId)
          .maybeSingle();

        if (result.error) {
          throw result.error;
        }
        const publishJob = result.data;
        if (publishJob === null) {
          return throwApiError("NOT_FOUND", "Publish job not found");
        }

        const deployment = parseDeployment(publishJob.deployment);
        return {
          id: publishJob.id,
          version: publishJob.version,
          status: deployment === undefined ? "removed" : "success",
          domains:
            deployment !== undefined && deployment.destination !== "static"
              ? deployment.domains
              : [],
          createdAt: publishJob.createdAt,
          completedAt: publishJob.createdAt,
        };
      }
    ),

    unpublish: projectMutation(
      projectIdInput.extend({
        target: z.enum(["staging", "production"]),
        domains: z.array(z.string()).optional(),
        message: z.string().optional(),
        idempotencyKey: z.string().optional(),
        confirm: z.literal(true),
      }),
      "edit",
      async ({ auth, ctx, input }) => {
        const project = await loadById(input.projectId, ctx);
        const domains =
          input.domains ?? getDefaultPublishDomains(project, input.target);
        assertApiPublishDomains({ auth, domains, project });
        await unpublishProjectDomains(
          { projectId: input.projectId, domains },
          ctx
        );
        return { jobId: input.idempotencyKey ?? createUnpublishJobId() };
      }
    ),
  }),

  domains: router({
    list: projectQuery(projectIdInput, "view", async ({ ctx, input }) => {
      return { domains: await listProjectDomains(input.projectId, ctx) };
    }),

    create: projectMutation(
      projectIdInput.extend({ domain: z.string() }),
      "admin",
      async ({ ctx, input }) => {
        return await createProjectDomain(input, ctx);
      }
    ),

    update: projectMutation(
      projectIdInput.extend({
        domainId: z.string(),
        updates: z.object({ domain: z.string().optional() }),
      }),
      "admin",
      async ({ ctx, input }) => {
        return await updateProjectDomain(input, ctx);
      }
    ),

    delete: projectMutation(
      projectIdInput.extend({
        domainId: z.string(),
        confirm: z.literal(true),
      }),
      "admin",
      async ({ ctx, input }) => {
        return await deleteProjectDomain(input, ctx);
      }
    ),

    verify: projectMutation(
      projectIdInput.extend({ domainId: z.string() }),
      "admin",
      async ({ ctx, input }) => {
        return await verifyProjectDomain(input, ctx);
      }
    ),
  }),

  assets: router({
    list: projectQuery(
      projectIdInput.extend({
        type: z.enum(["image", "font"]).optional(),
        withUsage: z.boolean().optional(),
        sort: z.enum(["name", "size", "createdAt", "usage"]).optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).optional(),
      }),
      "view",
      async ({ ctx, input }) => {
        const assets = await loadAssetsByProject(input.projectId, ctx, {
          skipPermissionsCheck: true,
        });
        const build =
          input.withUsage === true || input.sort === "usage"
            ? await loadDevBuildByProjectId(ctx, input.projectId)
            : undefined;
        try {
          return serializeAssetList({ assets, build, input });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "Invalid asset cursor"
          ) {
            throwApiError("BAD_REQUEST", error.message);
          }
          throw error;
        }
      }
    ),

    findUsage: projectQuery(
      projectIdInput.extend({ assetId: z.string() }),
      "view",
      async ({ ctx, input }) => {
        const assets = await loadAssetsByProject(input.projectId, ctx, {
          skipPermissionsCheck: true,
        });
        const asset = getAssetOrThrow(assets, input.assetId);
        const build = await loadDevBuildByProjectId(ctx, input.projectId);
        return { usages: createAssetUsageList({ asset, assets, build }) };
      }
    ),

    replace: buildMutation(
      projectIdInput.extend({
        fromAssetId: z.string(),
        toAssetId: z.string(),
        confirm: z.literal(true),
      }),
      async ({ ctx, input, build, commit }) => {
        const assets = await loadAssetsByProject(input.projectId, ctx, {
          skipPermissionsCheck: true,
        });
        const fromAsset = getAssetOrThrow(assets, input.fromAssetId);
        const toAsset = getAssetOrThrow(assets, input.toAssetId);
        const payload = createAssetReplacementPayload({
          build,
          fromAsset,
          toAsset,
        });
        return await commit(payload, {
          fromAssetId: fromAsset.id,
          toAssetId: toAsset.id,
        });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({
        assetIdsOrPrefixes: z.array(z.string()).min(1),
        force: z.boolean().optional(),
        confirm: z.literal(true),
      }),
      async ({ ctx, input, build, commit }) => {
        const assets = await loadAssetsByProject(input.projectId, ctx, {
          skipPermissionsCheck: true,
        });
        const selectedAssets = assets.filter((asset) =>
          input.assetIdsOrPrefixes.some(
            (value) => asset.id === value || asset.id.startsWith(value)
          )
        );
        if (selectedAssets.length === 0) {
          return { version: build.version, assetIds: [] };
        }
        const usagesByAsset = new Map(
          selectedAssets.map((asset) => [
            asset.id,
            createAssetUsageList({ asset, assets, build }),
          ])
        );
        if (input.force !== true) {
          const usedAssetIds = selectedAssets
            .filter((asset) => (usagesByAsset.get(asset.id)?.length ?? 0) > 0)
            .map((asset) => asset.id);
          if (usedAssetIds.length > 0) {
            throwApiError(
              "BAD_REQUEST",
              `Assets are still referenced: ${usedAssetIds.join(", ")}`
            );
          }
        }
        return await commit(createAssetDeletePayload(selectedAssets), {
          assetIds: selectedAssets.map((asset) => asset.id),
        });
      }
    ),
  }),
});

export const __testing__ = {
  assertApiTokenPermit,
  assertApiProjectPermit,
  createBuildSnapshot,
  getTokenPermits,
  applySemanticBuildPatch,
  serializeProjectSummary,
  serializeCssVariables,
  commitBuildPatch,
  commitBuildTransactions,
  assertContentOrBuildPayload,
  assertApiPublishDomains,
  getParentFolderIdOrThrow,
  getFolderOrThrow,
  getPageOrThrow,
  getInstanceOrThrow,
  getParentInstanceOrThrow,
  getRequiredPageByInput,
  serializeRequiredPageDetails,
  getTextChildOrThrow,
  validateTextValue,
  getResourceOrThrow,
  validateResourceExpressions,
  validatePropValue,
  validatePropBinding,
  getDesignTokenOrThrow,
  assertCssVariableName,
  compileOptionalRegex,
  getAssetOrThrow,
};
