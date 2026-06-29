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
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/index.server";
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
  resourceFieldsInput,
  resourceFieldsUpdateInput,
} from "@webstudio-is/project-build/runtime/data";
import {
  pageFieldsInput,
  pageMetaInput,
} from "@webstudio-is/project-build/runtime/pages";
import {
  propBindingInput,
  propValueInput,
} from "@webstudio-is/project-build/runtime/props";
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
import {
  breakpointFieldsInput,
  breakpointUpdateFieldsInput,
  projectSettingsUpdateInput as projectSettingsRuntimeUpdateInput,
  redirectFieldsInput,
  redirectUpdateFieldsInput,
} from "@webstudio-is/project-build/runtime/project-settings";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import { buildPatchTransaction } from "@webstudio-is/protocol";
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
} from "@webstudio-is/project/content-mode-permissions";
import type { CompactBuild } from "@webstudio-is/project-build";
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

const projectSettingsUpdateInput = projectIdInput.merge(
  projectSettingsRuntimeUpdateInput
);

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
    commit: BuildCommit;
  }) => Promise<Result>
) =>
  procedure.input(input).mutation(async ({ ctx, input }) => {
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
  id: string;
  build: Awaited<ReturnType<typeof loadDevBuildByProjectId>>;
  assets?: Asset[];
  input: unknown;
  commit: BuildCommit;
}) => {
  const mutation = executeApiRuntimeMutation<Result>({
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
  procedure.input(input).mutation(async ({ ctx, input }) => {
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
        return await commitRuntimeMutation<{ pageId: string }>({
          id: "pages.create",
          build,
          input,
          commit,
        });
      }
    ),

    update: buildMutation(
      projectIdInput.extend({
        pageId: z.string(),
        values: pageFieldsInput,
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ pageId: string }>({
          id: "pages.update",
          build,
          input,
          commit,
        });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({ pageId: z.string() }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ pageId: string }>({
          id: "pages.delete",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{ pageId: string }>({
          id: "pages.duplicate",
          build,
          input,
          commit,
        });
      }
    ),
  }),

  pageTemplates: router({
    list: buildQuery(projectIdInput, async ({ build }) => {
      return executeApiRuntimeOperation({
        id: "pageTemplates.list",
        build,
        input: {},
      });
    }),

    createPage: buildMutation(
      projectIdInput.extend({
        templateId: z.string(),
        parentFolderId: z.string().optional(),
        name: z.string().min(1),
        path: z.string(),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ pageId: string }>({
          id: "pageTemplates.createPage",
          build,
          input,
          commit,
        });
      }
    ),
  }),

  projectSettings: router({
    get: buildQuery(projectIdInput, async ({ build }) => {
      return executeApiRuntimeOperation({
        id: "projectSettings.get",
        build,
        input: {},
      });
    }),

    update: buildMutation(
      projectSettingsUpdateInput,
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ updated: boolean }>({
          id: "projectSettings.update",
          build,
          input,
          commit,
        });
      }
    ),
  }),

  redirects: router({
    list: buildQuery(projectIdInput, async ({ build }) => {
      return executeApiRuntimeOperation({
        id: "redirects.list",
        build,
        input: {},
      });
    }),

    create: buildMutation(
      projectIdInput.merge(redirectFieldsInput),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ old: string }>({
          id: "redirects.create",
          build,
          input,
          commit,
        });
      }
    ),

    update: buildMutation(
      projectIdInput.extend({
        old: z.string(),
        values: redirectUpdateFieldsInput,
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ old: string }>({
          id: "redirects.update",
          build,
          input,
          commit,
        });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({ old: z.string() }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ old: string }>({
          id: "redirects.delete",
          build,
          input,
          commit,
        });
      }
    ),
  }),

  breakpoints: router({
    list: buildQuery(projectIdInput, async ({ build }) => {
      return executeApiRuntimeOperation({
        id: "breakpoints.list",
        build,
        input: {},
      });
    }),

    create: buildMutation(
      projectIdInput.merge(breakpointFieldsInput),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ breakpointId: string }>({
          id: "breakpoints.create",
          build,
          input,
          commit,
        });
      }
    ),

    update: buildMutation(
      projectIdInput.extend({
        breakpointId: z.string(),
        values: breakpointUpdateFieldsInput,
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ breakpointId: string }>({
          id: "breakpoints.update",
          build,
          input,
          commit,
        });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({ breakpointId: z.string() }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ breakpointId: string }>({
          id: "breakpoints.delete",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{ folderId: string }>({
          id: "folders.create",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{ folderId: string }>({
          id: "folders.update",
          build,
          input,
          commit,
        });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({ folderId: z.string() }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{
          folderId: string;
          pageIds: string[];
          folderIds: string[];
        }>({
          id: "folders.delete",
          build,
          input,
          commit,
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
        return await commitRuntimeMutation<{
          instanceIds: string[];
          removedInstanceIds: string[];
        }>({
          id: "instances.append",
          build,
          input,
          commit,
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
        return await commitRuntimeMutation<{ instanceIds: string[] }>({
          id: "instances.move",
          build,
          input,
          commit,
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
        return await commitRuntimeMutation<{
          instanceId: string;
          instanceIds: string[];
        }>({
          id: "instances.clone",
          build,
          input,
          commit,
        });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({
        instanceIds: z.array(z.string()).min(1),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ instanceIds: string[] }>({
          id: "instances.delete",
          build,
          input,
          commit,
        });
      }
    ),

    updateProps: contentOrBuildMutation(
      projectIdInput.extend({
        updates: z.array(propValueInput).min(1),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ propIds: string[] }>({
          id: "instances.updateProps",
          build,
          input,
          commit,
        });
      }
    ),

    deleteProps: contentOrBuildMutation(
      projectIdInput.extend({
        deletions: z
          .array(z.object({ instanceId: z.string(), name: z.string() }))
          .min(1),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ propIds: string[] }>({
          id: "instances.deleteProps",
          build,
          input,
          commit,
        });
      }
    ),

    bindProps: buildMutation(
      projectIdInput.extend({
        bindings: z.array(propBindingInput).min(1),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ propIds: string[] }>({
          id: "instances.bindProps",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{
          instanceId: string;
          childIndex: number;
          mode: "text" | "expression";
        }>({
          id: "instances.updateText",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{ styleKeys: string[] }>({
          id: "styles.updateDeclarations",
          build,
          input,
          commit,
        });
      }
    ),

    deleteDeclarations: buildMutation(
      projectIdInput.extend({
        deletions: z.array(styleDeleteInput).min(1),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ styleKeys: string[] }>({
          id: "styles.deleteDeclarations",
          build,
          input,
          commit,
        });
      }
    ),

    replaceValues: buildMutation(
      projectIdInput.merge(styleReplaceInput),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ styleKeys: string[] }>({
          id: "styles.replaceValues",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{ tokenIds: string[] }>({
          id: "designTokens.create",
          build,
          input,
          commit,
        });
      }
    ),

    updateStyles: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        updates: z.array(designTokenStyleInput).min(1),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{
          designTokenId: string;
          styleKeys: string[];
        }>({
          id: "designTokens.updateStyles",
          build,
          input,
          commit,
        });
      }
    ),

    deleteStyles: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        deletions: z.array(styleDeleteInput.omit({ instanceId: true })).min(1),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{
          designTokenId: string;
          styleKeys: string[];
        }>({
          id: "designTokens.deleteStyles",
          build,
          input,
          commit,
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
        return await commitRuntimeMutation<{
          designTokenId: string;
        }>({
          id: "designTokens.attach",
          build,
          input,
          commit,
        });
      }
    ),

    detach: buildMutation(
      projectIdInput.extend({
        designTokenId: z.string(),
        instanceIds: z.array(z.string()).min(1),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{
          designTokenId: string;
        }>({
          id: "designTokens.detach",
          build,
          input,
          commit,
        });
      }
    ),

    extract: buildMutation(
      projectIdInput.extend({
        instanceIds: z.array(z.string()).min(1),
        name: z.string().min(1),
        removeLocalProps: z.array(z.string()).optional(),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{
          designTokenId: string;
          styleKeys: string[];
        }>({
          id: "designTokens.extract",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{ names: string[] }>({
          id: "cssVariables.define",
          build,
          input,
          commit,
        });
      }
    ),

    delete: buildMutation(
      cssVariableDeleteInput,
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{
          names: string[];
          styleKeys: string[];
        }>({
          id: "cssVariables.delete",
          build,
          input,
          commit,
        });
      }
    ),

    rewriteRefs: buildMutation(
      cssVariableRewriteRefsInput,
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{
          styleKeys: string[];
          propIds: string[];
        }>({
          id: "cssVariables.rewriteRefs",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{ dataSourceId: string }>({
          id: "variables.create",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{ dataSourceId: string }>({
          id: "variables.update",
          build,
          input,
          commit,
        });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({
        dataSourceId: z.string(),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{ dataSourceId: string }>({
          id: "variables.delete",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{
          resourceId: string;
          dataSourceId?: string;
        }>({
          id: "resources.create",
          build,
          input,
          commit,
        });
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
        return await commitRuntimeMutation<{ resourceId: string }>({
          id: "resources.update",
          build,
          input,
          commit,
        });
      }
    ),

    delete: buildMutation(
      projectIdInput.extend({
        resourceId: z.string(),
        force: z.boolean().optional(),
      }),
      async ({ input, build, commit }) => {
        return await commitRuntimeMutation<{
          resourceId: string;
          dataSourceIds: string[];
          propIds: string[];
        }>({
          id: "resources.delete",
          build,
          input,
          commit,
        });
      }
    ),
  }),

  publish: router({
    list: projectQuery(projectIdInput, "view", async ({ ctx, input }) => {
      return await listProjectPublishes(input.projectId, ctx);
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
          { project, domains },
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
        const publishJob = await getProjectPublishJob(input, ctx);
        if (publishJob === undefined) {
          return throwApiError("NOT_FOUND", "Publish job not found");
        }
        return publishJob;
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
        return await commitRuntimeMutation({
          id: "assets.replace",
          build,
          assets,
          input,
          commit,
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
        return await commitRuntimeMutation({
          id: "assets.delete",
          build,
          assets,
          input,
          commit,
        });
      }
    ),
  }),
});

export const __testing__ = {
  assertContentOrBuildPayload,
  assertApiPublishDomains,
};
