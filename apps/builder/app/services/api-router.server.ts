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
import { BuilderRuntimeError } from "@webstudio-is/project-build/runtime/errors";
import {
  cssVariableValueInput,
  designTokenCreateInput,
  designTokenStyleInput,
  styleDeleteInput,
  styleReplaceInput,
  styleUpdateInput,
} from "@webstudio-is/project-build/runtime/styles";
import {
  dataVariableValueInput,
  findResource,
  resourceFieldsInput,
  resourceFieldsUpdateInput,
} from "@webstudio-is/project-build/runtime/data";
import { executeBuilderRuntimeOperation } from "@webstudio-is/project-build/runtime/registry";
import {
  findSerializedPageByInput,
  getParentFolderId,
  getSerializedPages,
  isPathAvailable,
  pageFieldsInput,
  pageMetaInput,
  serializePageDetailsByInput,
} from "@webstudio-is/project-build/runtime/pages";
import {
  findTextContentChild,
  getTextContentErrors,
} from "@webstudio-is/project-build/runtime/instances";
import {
  propBindingInput,
  propValueInput,
} from "@webstudio-is/project-build/runtime/props";
import { type BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime/mutation";
import type { BuilderState } from "@webstudio-is/project-build/state/builder-state";
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
import { findFolder, findPage } from "~/shared/page-utils/tree";
import { findParentInstanceReference } from "@webstudio-is/project-build/runtime/instances";
import {
  coreMetas,
  getStyleDeclKey,
  type Asset,
  type Instance,
  type Pages,
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

const defaultBuilderRuntimeContext = {
  createId: nanoid,
  now: () => new Date(),
};

const createBuilderRuntimeState = (
  build: CompactBuild,
  assets?: Asset[]
): BuilderState => ({
  pages: build.pages,
  breakpoints: mapById(build.breakpoints),
  styles: new Map(
    build.styles.map((styleDecl) => [getStyleDeclKey(styleDecl), styleDecl])
  ),
  styleSources: mapById(build.styleSources),
  styleSourceSelections: new Map(
    build.styleSourceSelections.map((selection) => [
      selection.instanceId,
      selection,
    ])
  ),
  props: mapById(build.props),
  dataSources: mapById(build.dataSources),
  resources: mapById(build.resources),
  instances: mapById(build.instances),
  assets: assets === undefined ? undefined : mapById(assets),
  marketplaceProduct: build.marketplaceProduct,
});

const executeApiRuntimeOperation = <Result>({
  id,
  build,
  assets,
  input,
}: {
  id: string;
  build: CompactBuild;
  assets?: Asset[];
  input: unknown;
}): Result => {
  try {
    return executeBuilderRuntimeOperation<Result>({
      id,
      state: createBuilderRuntimeState(build, assets),
      input,
      context: defaultBuilderRuntimeContext,
    });
  } catch (error) {
    if (error instanceof BuilderRuntimeError) {
      return throwApiError(error.code, error.message);
    }
    throw error;
  }
};

const executeApiRuntimeMutation = <
  Result extends Record<string, unknown> = Record<string, unknown>,
>(args: {
  id: string;
  build: CompactBuild;
  assets?: Asset[];
  input: unknown;
}) => executeApiRuntimeOperation<BuilderRuntimeMutation<Result>>(args);

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
        return executeApiRuntimeOperation({
          id: "pages.list",
          build,
          input,
        });
      }
    ),

    get: buildQuery(
      projectIdInput.extend({ pageId: z.string() }),
      async ({ input, build }) => {
        return executeApiRuntimeOperation({
          id: "pages.get",
          build,
          input,
        });
      }
    ),

    getByPath: buildQuery(
      projectIdInput.extend({ path: z.string() }),
      async ({ input, build }) => {
        return executeApiRuntimeOperation({
          id: "pages.getByPath",
          build,
          input,
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
        const mutation = executeApiRuntimeMutation<{ pageId: string }>({
          id: "pages.create",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
      }
    ),

    update: buildMutation(
      projectIdInput.extend({
        pageId: z.string(),
        values: pageFieldsInput,
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ pageId: string }>({
          id: "pages.update",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({ pageId: z.string() }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ pageId: string }>({
          id: "pages.delete",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
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
        const mutation = executeApiRuntimeMutation<{ pageId: string }>({
          id: "pages.duplicate",
          build,
          input: {
            projectId: input.projectId,
            pageId: sourcePage.id,
            parentFolderId,
            name: input.name,
            path: input.path,
          },
        });
        return await commit(mutation.payload, mutation.result);
      }
    ),
  }),

  folders: router({
    list: buildQuery(
      projectIdInput.extend({ includePages: z.boolean().optional() }),
      async ({ input, build }) => {
        return executeApiRuntimeOperation({
          id: "folders.list",
          build,
          input,
        });
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
        const mutation = executeApiRuntimeMutation<{ folderId: string }>({
          id: "folders.create",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
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
        const mutation = executeApiRuntimeMutation<{ folderId: string }>({
          id: "folders.update",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({ folderId: z.string() }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{
          folderId: string;
          pageIds: string[];
          folderIds: string[];
        }>({
          id: "folders.delete",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
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
        return executeApiRuntimeOperation({
          id: "instances.list",
          build,
          input,
        });
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
        return executeApiRuntimeOperation({
          id: "instances.inspect",
          build,
          input,
        });
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
        const mutation = executeApiRuntimeMutation<{
          instanceIds: string[];
          removedInstanceIds: string[];
        }>({
          id: "instances.append",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
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
        const mutation = executeApiRuntimeMutation<{ instanceIds: string[] }>({
          id: "instances.move",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
      }
    ),

    clone: buildMutation(
      projectIdInput.extend({
        sourceInstanceId: z.string(),
        targetParentInstanceId: z.string().optional(),
        insertIndex: z.number().int().nonnegative().optional(),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{
          instanceId: string;
          instanceIds: string[];
        }>({
          id: "instances.clone",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({
        instanceIds: z.array(z.string()).min(1),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ instanceIds: string[] }>({
          id: "instances.delete",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
      }
    ),

    updateProps: contentOrBuildMutation(
      projectIdInput.extend({
        updates: z.array(propValueInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ propIds: string[] }>({
          id: "instances.updateProps",
          build,
          input,
        });
        if (mutation.noop) {
          return { version: build.version, ...mutation.result };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    deleteProps: contentOrBuildMutation(
      projectIdInput.extend({
        deletions: z
          .array(z.object({ instanceId: z.string(), name: z.string() }))
          .min(1),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ propIds: string[] }>({
          id: "instances.deleteProps",
          build,
          input,
        });
        if (mutation.noop) {
          return { version: build.version, ...mutation.result };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    bindProps: buildMutation(
      projectIdInput.extend({
        bindings: z.array(propBindingInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ propIds: string[] }>({
          id: "instances.bindProps",
          build,
          input,
        });
        if (mutation.noop) {
          return { version: build.version, ...mutation.result };
        }
        return await commit(mutation.payload, mutation.result);
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
        return executeApiRuntimeOperation({
          id: "instances.listTexts",
          build,
          input,
        });
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
        const mutation = executeApiRuntimeMutation<{
          instanceId: string;
          childIndex: number;
          mode: "text" | "expression";
        }>({
          id: "instances.updateText",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
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
        return executeApiRuntimeOperation({
          id: "styles.getDeclarations",
          build,
          input,
        });
      }
    ),

    updateDeclarations: buildMutation(
      projectIdInput.extend({
        updates: z.array(styleUpdateInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ styleKeys: string[] }>({
          id: "styles.updateDeclarations",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    deleteDeclarations: buildMutation(
      projectIdInput.extend({
        deletions: z.array(styleDeleteInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ styleKeys: string[] }>({
          id: "styles.deleteDeclarations",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    replaceValues: buildMutation(
      projectIdInput.merge(styleReplaceInput),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ styleKeys: string[] }>({
          id: "styles.replaceValues",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
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
        return executeApiRuntimeOperation({
          id: "designTokens.list",
          build,
          input,
        });
      }
    ),

    create: buildMutation(
      projectIdInput.extend({
        tokens: z.array(designTokenCreateInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ tokenIds: string[] }>({
          id: "designTokens.create",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    updateStyles: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        updates: z.array(designTokenStyleInput).min(1),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{
          designTokenId: string;
          styleKeys: string[];
        }>({
          id: "designTokens.updateStyles",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
      }
    ),

    deleteStyles: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        deletions: z.array(styleDeleteInput.omit({ instanceId: true })).min(1),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{
          designTokenId: string;
          styleKeys: string[];
        }>({
          id: "designTokens.deleteStyles",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    attach: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        instanceIds: z.array(z.string()).min(1),
        position: z.enum(["before-local", "after-local"]).optional(),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{
          designTokenId: string;
        }>({
          id: "designTokens.attach",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    detach: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        instanceIds: z.array(z.string()).min(1),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{
          designTokenId: string;
        }>({
          id: "designTokens.detach",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    extract: buildMutation(
      projectIdInput.extend({
        instanceIds: z.array(z.string()).min(1),
        name: z.string().min(1),
        removeLocalProps: z.array(z.string()).optional(),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{
          designTokenId: string;
          styleKeys: string[];
        }>({
          id: "designTokens.extract",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
      }
    ),
  }),

  cssVariables: router({
    list: buildQuery(cssVariableListInput, async ({ input, build }) => {
      return executeApiRuntimeOperation({
        id: "cssVariables.list",
        build,
        input,
      });
    }),

    define: buildMutation(
      cssVariableDefineInput,
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ names: string[] }>({
          id: "cssVariables.define",
          build,
          input,
        });
        return await commit(mutation.payload, mutation.result);
      }
    ),

    delete: buildMutation(
      cssVariableDeleteInput,
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{
          names: string[];
          styleKeys: string[];
        }>({
          id: "cssVariables.delete",
          build,
          input,
        });
        if (mutation.noop) {
          return { version: build.version, ...mutation.result };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    rewriteRefs: buildMutation(
      cssVariableRewriteRefsInput,
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{
          styleKeys: string[];
          propIds: string[];
        }>({
          id: "cssVariables.rewriteRefs",
          build,
          input,
        });
        if (mutation.noop) {
          return { version: build.version, ...mutation.result };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),
  }),

  variables: router({
    list: buildQuery(
      projectIdInput.extend({ scopeInstanceId: z.string().optional() }),
      async ({ input, build }) => {
        return executeApiRuntimeOperation({
          id: "variables.list",
          build,
          input,
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
        const mutation = executeApiRuntimeMutation<{ dataSourceId: string }>({
          id: "variables.create",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
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
        const mutation = executeApiRuntimeMutation<{ dataSourceId: string }>({
          id: "variables.update",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({
        dataSourceId: z.string(),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{ dataSourceId: string }>({
          id: "variables.delete",
          build,
          input,
        });
        if (mutation.noop) {
          return {
            version: build.version,
            ...mutation.result,
          };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),
  }),

  resources: router({
    list: buildQuery(
      projectIdInput.extend({ scopeInstanceId: z.string().optional() }),
      async ({ input, build }) => {
        return executeApiRuntimeOperation({
          id: "resources.list",
          build,
          input,
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
        const mutation = executeApiRuntimeMutation<{
          resourceId: string;
          dataSourceId?: string;
        }>({
          id: "resources.create",
          build,
          input,
        });
        if (mutation.noop) {
          return { version: build.version, ...mutation.result };
        }
        return await commit(mutation.payload, mutation.result);
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
        const mutation = executeApiRuntimeMutation<{ resourceId: string }>({
          id: "resources.update",
          build,
          input,
        });
        if (mutation.noop) {
          return { version: build.version, ...mutation.result };
        }
        return await commit(mutation.payload, mutation.result);
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({
        resourceId: z.string(),
        force: z.boolean().optional(),
      }),
      async ({ input, build, commit }) => {
        const mutation = executeApiRuntimeMutation<{
          resourceId: string;
          dataSourceIds: string[];
          propIds: string[];
        }>({
          id: "resources.delete",
          build,
          input,
        });
        if (mutation.noop) {
          return { version: build.version, ...mutation.result };
        }
        return await commit(mutation.payload, mutation.result);
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
        const build = await loadDevBuildByProjectId(ctx, input.projectId);
        return executeApiRuntimeOperation({
          id: "assets.list",
          build,
          assets,
          input,
        });
      }
    ),

    findUsage: projectQuery(
      projectIdInput.extend({ assetId: z.string() }),
      "view",
      async ({ ctx, input }) => {
        const assets = await loadAssetsByProject(input.projectId, ctx, {
          skipPermissionsCheck: true,
        });
        const build = await loadDevBuildByProjectId(ctx, input.projectId);
        return executeApiRuntimeOperation({
          id: "assets.findUsage",
          build,
          assets,
          input,
        });
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
        const mutation = executeApiRuntimeMutation({
          id: "assets.replace",
          build,
          assets,
          input,
        });
        return await commit(mutation.payload, mutation.result);
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
        const mutation = executeApiRuntimeMutation({
          id: "assets.delete",
          build,
          assets,
          input,
        });
        if (mutation.payload.length === 0) {
          return { version: build.version, ...mutation.result };
        }
        return await commit(mutation.payload, mutation.result);
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
};
