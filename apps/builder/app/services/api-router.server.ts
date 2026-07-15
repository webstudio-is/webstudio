import { z } from "zod";
import {
  AuthorizationError,
  authorizeProject,
  procedure,
  router,
  type AppContext,
  type AuthPermit,
} from "@webstudio-is/trpc-interface/index.server";
import { loadById } from "@webstudio-is/project/index.server";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import {
  createProjectDomain,
  createUnpublishJobId,
  deleteProjectDomain,
  getDefaultPublishDomains,
  getProjectPublishJob,
  listProjectDomains,
  listProjectPublishes,
  publishProject,
  updateProjectDomain,
  unpublishProjectDomains,
  verifyProjectDomain,
} from "@webstudio-is/domain/index.server";
import { getBuilderRuntimeOperationInputSchema } from "@webstudio-is/project-build/runtime";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import { buildPatchTransaction } from "@webstudio-is/protocol/schema";
import {
  publicApiContractVersion,
  publicApiOperationRequiresServerSupport,
  publicApiOperations,
} from "@webstudio-is/protocol";
import {
  assertApiProjectPermit,
  getTokenPermits,
  loadApiToken,
} from "./api-permits.server";
import { componentMetas } from "~/shared/component-metas.server";
import { type Asset } from "@webstudio-is/sdk";
import {
  applyContentModeTransaction,
  getContentModeCapabilities,
} from "@webstudio-is/project-build/runtime";
import type { CompactBuild } from "@webstudio-is/project-build";
import {
  runtimeOperationContracts,
  type RuntimeOperationId,
} from "@webstudio-is/project-build/contracts";
import { builderNamespaces } from "@webstudio-is/project-build/contracts";
import type { BuilderNamespace } from "@webstudio-is/project-build/contracts";
import type { BuilderApiCapability } from "@webstudio-is/project-build/contracts";
import {
  buildGetInput,
  buildPatchInput,
  commitBuildPatch,
  commitBuildTransactions,
  createBuildSnapshot,
  loadBuildByProjectVersion,
  loadReadableDevBuild,
  serializeProjectSummary,
} from "./api-build.server";
import { throwApiError } from "./api-errors.server";
import {
  createBuilderRuntimeState,
  executeApiRuntimeMutation,
  executeApiRuntimeOperation,
} from "./api-runtime.server";

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

const withProjectId = <Schema extends z.ZodTypeAny>(
  input: Schema
): z.ZodType<z.infer<Schema> & { projectId: string }> =>
  z.intersection(projectIdInput, input) as z.ZodType<
    z.infer<Schema> & { projectId: string }
  >;

const runtimeProjectInput = (id: RuntimeOperationId) =>
  withProjectId(getBuilderRuntimeOperationInputSchema(id));

type ProjectApiCapability = Extract<AuthPermit, BuilderApiCapability>;

type ServerOnlyPublicApiOperationMeta = {
  command: string;
  client: string;
  invalidatesNamespaces?: readonly BuilderNamespace[];
};

const publicApiMeta = (
  permit: BuilderApiCapability,
  operation?: ServerOnlyPublicApiOperationMeta
) => ({
  publicApiPermit: permit,
  publicApiOperation: operation,
});

const applyBuildPayload = async <Result extends Record<string, unknown> = {}>(
  ctx: AppContext,
  build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>,
  projectId: string,
  payload: z.infer<typeof buildPatchTransaction>["payload"],
  result?: Result
) => ({
  ...(await commitBuildPatch({ build, ctx, projectId, payload })),
  ...(result ?? {}),
});

const projectQuery = <Schema extends z.ZodType<{ projectId: string }>, Result>(
  input: Schema,
  permit: ProjectApiCapability,
  handler: (args: {
    ctx: AppContext;
    input: z.infer<Schema>;
    auth: Awaited<ReturnType<typeof assertApiProjectPermit>>;
  }) => Promise<Result>,
  operation?: ServerOnlyPublicApiOperationMeta
) =>
  procedure
    .meta(publicApiMeta(permit, operation))
    .input(input)
    .query(async ({ ctx, input }) => {
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
  permit: ProjectApiCapability,
  handler: (args: {
    ctx: AppContext;
    input: z.infer<Schema>;
    auth: Awaited<ReturnType<typeof assertApiProjectPermit>>;
  }) => Promise<Result>,
  operation?: ServerOnlyPublicApiOperationMeta
) =>
  procedure
    .meta(publicApiMeta(permit, operation))
    .input(input)
    .mutation(async ({ ctx, input }) => {
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
  procedure
    .meta(publicApiMeta("view"))
    .input(input)
    .query(async ({ ctx, input }) => {
      const parsedInput = input as z.infer<Schema>;
      return await handler({
        ctx,
        input: parsedInput,
        build: await loadReadableDevBuild(ctx, parsedInput.projectId),
      });
    });

const runtimeBuildQuery = <Result = unknown>(id: RuntimeOperationId) =>
  buildQuery(runtimeProjectInput(id), async ({ input, build }) =>
    executeApiRuntimeOperation<Result>({
      id,
      build,
      input,
    })
  );

const buildMutation = <Schema extends z.ZodType<{ projectId: string }>, Result>(
  input: Schema,
  handler: (args: {
    ctx: AppContext;
    input: z.infer<Schema>;
    build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>;
    commit: BuildCommit;
  }) => Promise<Result>
) =>
  procedure
    .meta(publicApiMeta("build"))
    .input(input)
    .mutation(async ({ ctx, input }) => {
      const parsedInput = input as z.infer<Schema>;
      await assertApiProjectPermit(ctx, parsedInput.projectId, "build");
      const build = await loadDevBuildByProjectId(ctx, parsedInput.projectId);
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

const runtimeBuildMutation = <Result extends Record<string, unknown> = {}>(
  id: RuntimeOperationId
) =>
  buildMutation(runtimeProjectInput(id), async ({ input, build, commit }) =>
    commitRuntimeMutation<Result>({
      id,
      build,
      input,
      commit,
    })
  );

type BuildCommit = <CommitResult extends Record<string, unknown> = {}>(
  payload: z.infer<typeof buildPatchTransaction>["payload"],
  result?: CommitResult
) => Promise<{ version: number } & CommitResult>;

const commitRuntimeMutation = async <
  Result extends Record<string, unknown> = Record<string, unknown>,
>({
  id,
  build,
  assets,
  input,
  commit,
}: {
  id: RuntimeOperationId;
  build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>;
  assets?: Asset[];
  input: unknown;
  commit: BuildCommit;
}) => {
  const mutation = await executeApiRuntimeMutation<Result>({
    id,
    build,
    assets,
    input,
  });
  if (mutation.noop || mutation.payload.length === 0) {
    return {
      version: build.version,
      ...mutation.result,
    };
  }
  return await commit(mutation.payload, mutation.result);
};

const createContentModeCapabilitiesFromBuild = (build: CompactBuild) => {
  const state = createBuilderRuntimeState(build);
  return getContentModeCapabilities({
    instances: state.instances!,
    metas: componentMetas,
    props: state.props!,
    styleSources: state.styleSources!,
    styleSourceSelections: state.styleSourceSelections,
    styles: state.styles,
    breakpoints: state.breakpoints,
  });
};

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
    commit: BuildCommit;
  }) => Promise<Result>
) =>
  procedure
    .meta(publicApiMeta("edit"))
    .input(input)
    .mutation(async ({ ctx, input }) => {
      const parsedInput = input as z.infer<Schema>;
      const auth = await assertApiProjectPermit(
        ctx,
        parsedInput.projectId,
        "edit"
      );
      const build = await loadDevBuildByProjectId(ctx, parsedInput.projectId);
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

const runtimeContentOrBuildMutation = <
  Result extends Record<string, unknown> = {},
>(
  id: RuntimeOperationId
) =>
  contentOrBuildMutation(
    runtimeProjectInput(id),
    async ({ input, build, commit }) =>
      commitRuntimeMutation<Result>({
        id,
        build,
        input,
        commit,
      })
  );

const withConfirm = <Schema extends z.ZodTypeAny>(input: Schema) =>
  z.intersection(input, z.object({ confirm: z.literal(true) })) as z.ZodType<
    z.infer<Schema> & { confirm: true }
  >;

const runtimeAssetsQuery = <Result = unknown>(id: RuntimeOperationId) =>
  projectQuery(runtimeProjectInput(id), "view", async ({ ctx, input }) => {
    const assets = await loadAssetsByProject(input.projectId, ctx, {
      skipPermissionsCheck: true,
    });
    const build = await loadDevBuildByProjectId(ctx, input.projectId);
    return executeApiRuntimeOperation<Result>({
      id,
      build,
      assets,
      input,
    });
  });

const runtimeAssetsMutation = <Result extends Record<string, unknown> = {}>(
  id: RuntimeOperationId
) =>
  buildMutation(
    withConfirm(runtimeProjectInput(id)),
    async ({ ctx, input, build, commit }) => {
      const assets = await loadAssetsByProject(input.projectId, ctx, {
        skipPermissionsCheck: true,
      });
      return await commitRuntimeMutation<Result>({
        id,
        build,
        assets,
        input,
        commit,
      });
    }
  );

type RuntimeOperationRouteTree = Record<string, unknown>;
type RouterRecord = Parameters<typeof router>[0];
type RuntimeOperation = (typeof runtimeOperationContracts)[number];

const addRuntimeOperationRoute = (
  tree: RuntimeOperationRouteTree,
  operation: RuntimeOperation
) => {
  const path = operation.id.split(".");
  const routeName = path.at(-1);
  if (routeName === undefined || path.length < 2) {
    throw new Error(`Runtime operation "${operation.id}" must be namespaced.`);
  }
  let namespace = tree;
  for (const segment of path.slice(0, -1)) {
    const existing = namespace[segment];
    if (existing === undefined) {
      namespace[segment] = {};
    }
    namespace = namespace[segment] as RuntimeOperationRouteTree;
  }
  if (namespace[routeName] !== undefined) {
    throw new Error(`Duplicate runtime operation route "${operation.id}".`);
  }
  namespace[routeName] = createRuntimeOperationProcedure(operation);
};

const createRuntimeOperationProcedure = (operation: RuntimeOperation) => {
  const { id } = operation;
  if (operation.requiresAssets) {
    return operation.kind === "read"
      ? runtimeAssetsQuery(id)
      : runtimeAssetsMutation(id);
  }
  if (operation.requiresConfirm) {
    return buildMutation(
      withConfirm(runtimeProjectInput(id)),
      async ({ input, build, commit }) =>
        commitRuntimeMutation({
          id,
          build,
          input,
          commit,
        })
    );
  }
  if (operation.kind === "read") {
    return runtimeBuildQuery(id);
  }
  if (operation.permit === "edit") {
    return runtimeContentOrBuildMutation(id);
  }
  return runtimeBuildMutation(id);
};

const createRuntimeOperationRouters = () => {
  const tree: RuntimeOperationRouteTree = {};
  for (const operation of runtimeOperationContracts) {
    addRuntimeOperationRoute(tree, operation);
  }
  const createRouters = (routes: RuntimeOperationRouteTree): RouterRecord =>
    Object.fromEntries(
      Object.entries(routes).map(([name, value]) => {
        if (
          typeof value === "object" &&
          value !== null &&
          "_def" in value === false
        ) {
          return [
            name,
            router(createRouters(value as RuntimeOperationRouteTree)),
          ];
        }
        return [name, value];
      })
    ) as RouterRecord;
  return createRouters(tree);
};

// Runtime routes are generated from contracts; api-router tests verify their
// concrete paths against the public operation catalog.
const runtimeOperationRouters = createRuntimeOperationRouters();

export const apiRouter = router({
  auth: router({
    me: procedure
      .meta(
        publicApiMeta("view", {
          command: "whoami",
          client: "getApiTokenInfo",
        })
      )
      .query(async ({ ctx }) => {
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
      .meta(
        publicApiMeta("view", {
          command: "permissions",
          client: "getProjectPermissions",
        })
      )
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
          apiContract: {
            version: publicApiContractVersion,
            operationIds: publicApiOperations.flatMap((operation) =>
              publicApiOperationRequiresServerSupport(operation)
                ? [operation.id]
                : []
            ),
          },
        };
      }),

    get: projectQuery(
      projectIdInput,
      "view",
      async ({ ctx, input }) => {
        const project = await loadById(input.projectId, ctx);
        const build = await loadDevBuildByProjectId(ctx, input.projectId);
        return {
          ...serializeProjectSummary(project),
          buildId: build.id,
          version: build.version,
          homePageId: build.pages.homePageId,
          features: ctx.planFeatures,
        };
      },
      { command: "inspect", client: "getProjectInfo" }
    ),
  }),

  build: router({
    get: projectQuery(
      buildGetInput,
      "view",
      async ({ ctx, input }) => {
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
      },
      { command: "snapshot", client: "getBuildSnapshot" }
    ),

    patch: projectMutation(
      buildPatchInput,
      "build",
      async ({ ctx, input }) => {
        const build = await loadDevBuildByProjectId(ctx, input.projectId);
        return commitBuildTransactions({
          ctx,
          projectId: input.projectId,
          buildId: build.id,
          clientVersion: input.baseVersion,
          transactions: input.transactions,
        });
      },
      {
        command: "apply-patch",
        client: "applyBuildPatch",
        invalidatesNamespaces: builderNamespaces,
      }
    ),
  }),

  ...runtimeOperationRouters,

  publish: router({
    list: projectQuery(
      projectIdInput,
      "view",
      async ({ ctx, input }) => {
        return await listProjectPublishes(input.projectId, ctx);
      },
      { command: "list-publishes", client: "listPublishes" }
    ),

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
          { project, domains },
          ctx
        );
        return {
          jobId: build.id,
          warning: deploymentNotImplemented
            ? "Publish was recorded locally, but the deployment service is not available in this environment."
            : undefined,
        };
      },
      { command: "publish", client: "publish" }
    ),

    getJob: projectQuery(
      projectIdInput.extend({ jobId: z.string() }),
      "view",
      async ({ ctx, input }) => {
        const publishJob = await getProjectPublishJob(input, ctx);
        if (publishJob === undefined) {
          return throwApiError("NOT_FOUND", "Publish job not found");
        }
        return publishJob;
      },
      { command: "get-publish-job", client: "getPublishJob" }
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
      },
      { command: "unpublish", client: "unpublish" }
    ),
  }),

  domains: router({
    list: projectQuery(
      projectIdInput,
      "view",
      async ({ ctx, input }) => {
        return { domains: await listProjectDomains(input.projectId, ctx) };
      },
      { command: "list-domains", client: "listDomains" }
    ),

    create: projectMutation(
      projectIdInput.extend({ domain: z.string() }),
      "admin",
      async ({ ctx, input }) => {
        return await createProjectDomain(input, ctx);
      },
      { command: "create-domain", client: "createDomain" }
    ),

    update: projectMutation(
      projectIdInput.extend({
        domainId: z.string(),
        updates: z.object({ domain: z.string().optional() }),
      }),
      "admin",
      async ({ ctx, input }) => {
        return await updateProjectDomain(input, ctx);
      },
      { command: "update-domain", client: "updateDomain" }
    ),

    delete: projectMutation(
      projectIdInput.extend({
        domainId: z.string(),
        confirm: z.literal(true),
      }),
      "admin",
      async ({ ctx, input }) => {
        return await deleteProjectDomain(input, ctx);
      },
      { command: "delete-domain", client: "deleteDomain" }
    ),

    verify: projectMutation(
      projectIdInput.extend({ domainId: z.string() }),
      "admin",
      async ({ ctx, input }) => {
        return await verifyProjectDomain(input, ctx);
      },
      { command: "verify-domain", client: "verifyDomain" }
    ),
  }),
});

export const __testing__ = {
  assertContentOrBuildPayload,
  assertApiPublishDomains,
};
