import { z } from "zod";
import {
  AuthorizationError,
  authorizeProject,
} from "@webstudio-is/trpc-interface/index.server";
import {
  procedure,
  router,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { publicStaticEnv } from "~/env/env.static";
import env from "~/env/env.server";
import { createAccessToken } from "~/services/token.server";
import {
  applyPatchRequest,
  loadAuthorizedPatchState,
  toPatchResult,
} from "~/shared/sync/patch/patch-service.server";
import { normalizePatchRequest } from "~/shared/sync/patch/patch-normalize.server";
import { loadById } from "@webstudio-is/project/index.server";
import type { BuildPatchTransaction } from "@webstudio-is/project/index.server";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import { parseWebstudioJsxFragment } from "@webstudio-is/project-build/transfer/server";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import {
  checkProjectBuildPermissionInput,
  importProjectBundleInput,
  bundleVersion,
  publishedProjectBundle,
} from "@webstudio-is/protocol";
import { removeAgentInstructionsFromProjectSettings } from "@webstudio-is/project-build";
import {
  loadProjectBundleByBuildId,
  loadPublishedProjectBundleByProjectId,
} from "~/shared/db";
import {
  assertProjectBuildPermit,
  importPublishedProjectBundle,
} from "./project-import.server";
import {
  readStagedUploadText,
  removeStagedUpload,
} from "./staged-upload.server";
import { throwApiClientUpdateRequired } from "./api-compatibility.server";

const projectBundleInput = z.object({
  projectId: z.string(),
  bundleVersion: z.union([z.string(), z.number()]).optional(),
});

const buildBundleInput = z.object({
  buildId: z.string(),
  bundleVersion: z.union([z.string(), z.number()]).optional(),
});

const assertCliBundleVersion = (
  ctx: AppContext,
  clientBundleVersion: string | number | undefined
) => {
  if (ctx.apiClient?.type === "cli" && clientBundleVersion !== bundleVersion) {
    throwApiClientUpdateRequired("cli");
  }
};

const prepareProjectBundleForClient = async (
  ctx: AppContext,
  bundle: z.infer<typeof publishedProjectBundle>
) => {
  if (ctx.apiClient?.type === "cli") {
    const canView = await authorizeProject.hasProjectPermit(
      { projectId: bundle.build.projectId, permit: "view" },
      ctx
    );
    if (canView === false) {
      throw new AuthorizationError("You don't have access to this project");
    }
    return bundle;
  }
  return {
    ...bundle,
    build: {
      ...bundle.build,
      projectSettings:
        bundle.build.projectSettings === undefined
          ? undefined
          : removeAgentInstructionsFromProjectSettings(
              bundle.build.projectSettings
            ),
    },
  };
};

type ImportProjectBundleDependencies = {
  importPublishedProjectBundle: typeof importPublishedProjectBundle;
  readStagedUploadText: typeof readStagedUploadText;
  removeStagedUpload: typeof removeStagedUpload;
};

const createImportProjectBundleHandler =
  ({
    importPublishedProjectBundle,
    readStagedUploadText,
    removeStagedUpload,
  }: ImportProjectBundleDependencies) =>
  async ({
    ctx,
    input,
  }: {
    ctx: AppContext;
    input: z.infer<typeof importProjectBundleInput>;
  }) => {
    if (input.uploadId !== undefined) {
      try {
        const text = await readStagedUploadText({
          projectId: input.projectId,
          uploadId: input.uploadId,
        });
        return await importPublishedProjectBundle({
          ctx,
          data: publishedProjectBundle.parse(JSON.parse(text)),
          ignoreVersionCheck: input.ignoreVersionCheck,
          projectId: input.projectId,
        });
      } finally {
        await removeStagedUpload(input.uploadId).catch(console.error);
      }
    }

    if (input.data === undefined) {
      throw new Error("Project bundle data is required.");
    }

    return await importPublishedProjectBundle({
      ctx,
      data: input.data,
      ignoreVersionCheck: input.ignoreVersionCheck,
      projectId: input.projectId,
    });
  };

const patchEntryInput = z.object({
  seq: z.number().optional(),
  transaction: z.custom<BuildPatchTransaction>(),
});

const browserPatchInput = z.object({
  source: z.literal("browser"),
  appVersion: z.string(),
  authToken: z.string().optional(),
  buildId: z.string(),
  projectId: z.string(),
  version: z.number(),
  entries: z.array(patchEntryInput),
});

const relayPatchInput = z.object({
  source: z.literal("relay"),
  buildId: z.string(),
  projectId: z.string(),
  version: z.number(),
  entries: z.array(
    patchEntryInput.extend({
      authToken: z.string(),
    })
  ),
});

const loadBuildProjectId = async (ctx: AppContext, buildId: string) => {
  const build = await ctx.postgrest.client
    .from("Build")
    .select("projectId")
    .eq("id", buildId)
    .single();

  if (build.error) {
    throw build.error;
  }

  return String(build.data.projectId);
};

const assertBrowserPatchContext = ({
  appVersion,
  authorization,
}: {
  appVersion: string;
  authorization: AppContext["authorization"];
}) => {
  if (authorization.type === "service") {
    throw new AuthorizationError("Service calls are not allowed");
  }
  if (authorization.type === "anonymous") {
    throw new AuthorizationError(
      "Due to a recent update or a possible logout, you may need to log in again. Please reload the page and sign in to continue."
    );
  }
  if (publicStaticEnv.VERSION !== appVersion) {
    return {
      status: "version_mismatched" as const,
      errors:
        "The client and server versions do not match. Please reload to continue.",
    };
  }
};

const assertRelayPatchContext = (
  authorization: AppContext["authorization"]
) => {
  if (authorization.type !== "service") {
    throw new AuthorizationError("Collab relay is not authorized");
  }
};

export const loadBuilderDataByProjectId = async (
  projectId: string,
  ctx: AppContext
) => {
  const project = await loadById(projectId, ctx);
  if (project === null) {
    throw new Error(`Project "${projectId}" not found`);
  }
  if (project.userId === null) {
    throw new Error("Project must have project userId defined");
  }

  const build = await loadDevBuildByProjectId(ctx, project.id);
  const assets = await loadAssetsByProject(project.id, ctx);

  return {
    ...build,
    pages: serializePages(build.pages),
    assets,
    project,
    publisherHost: env.PUBLISHER_HOST,
  };
};

export const buildRouter = router({
  createJsxFragment: procedure
    .input(z.object({ projectId: z.string(), source: z.string() }))
    .query(async ({ ctx, input }) => {
      const canView = await authorizeProject.hasProjectPermit(
        { projectId: input.projectId, permit: "view" },
        ctx
      );
      if (canView === false) {
        throw new AuthorizationError("You don't have access to this project");
      }
      return await parseWebstudioJsxFragment(input.source);
    }),

  loadData: procedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await loadBuilderDataByProjectId(input.projectId, ctx);
    }),

  loadProjectBundleByBuildId: procedure
    .input(buildBundleInput)
    .query(async ({ ctx, input }) => {
      assertCliBundleVersion(ctx, input.bundleVersion);
      return await prepareProjectBundleForClient(
        ctx,
        await loadProjectBundleByBuildId(input.buildId, ctx)
      );
    }),

  loadProjectBundleByProjectId: procedure
    .input(projectBundleInput)
    .query(async ({ ctx, input }) => {
      assertCliBundleVersion(ctx, input.bundleVersion);
      return await prepareProjectBundleForClient(
        ctx,
        await loadPublishedProjectBundleByProjectId(input.projectId, ctx)
      );
    }),

  checkProjectBuildPermission: procedure
    .input(checkProjectBuildPermissionInput)
    .query(async ({ ctx, input }) => {
      await assertProjectBuildPermit({ ctx, projectId: input.projectId });
    }),

  importProjectBundle: procedure.input(importProjectBundleInput).mutation(
    createImportProjectBundleHandler({
      importPublishedProjectBundle,
      readStagedUploadText,
      removeStagedUpload,
    })
  ),

  createCollabToken: procedure
    .input(
      z.object({
        buildId: z.string(),
        projectId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (env.AUTH_WS_CLIENT_SECRET.length === 0) {
        throw new Error("Collaboration token signing is not configured");
      }
      if (ctx.authorization.type !== "user") {
        throw new AuthorizationError(
          "Collaboration token requires a user session"
        );
      }

      const buildProjectId = await loadBuildProjectId(ctx, input.buildId);
      if (buildProjectId !== input.projectId) {
        throw new Error("Build does not belong to project");
      }

      const canEdit = await authorizeProject.hasProjectPermit(
        { projectId: input.projectId, permit: "edit" },
        ctx
      );
      if (canEdit === false) {
        throw new AuthorizationError(
          "You don't have permission to edit this project."
        );
      }

      return {
        token: await createAccessToken(
          { userId: ctx.authorization.userId, projectId: input.projectId },
          env.AUTH_WS_CLIENT_SECRET,
          { maxAge: 5 * 60 * 1000 }
        ),
      };
    }),

  getPatchState: procedure
    .input(
      z.object({
        authToken: z.string(),
        buildId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertRelayPatchContext(ctx.authorization);
      return await loadAuthorizedPatchState({
        authToken: input.authToken,
        buildId: input.buildId,
        context: ctx,
      });
    }),

  patch: procedure
    .input(z.discriminatedUnion("source", [browserPatchInput, relayPatchInput]))
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.source === "browser") {
          const patchContext =
            input.authToken === undefined
              ? ctx
              : await ctx.createTokenContext(input.authToken);
          const versionResult = assertBrowserPatchContext({
            appVersion: input.appVersion,
            authorization: patchContext.authorization,
          });
          if (versionResult !== undefined) {
            return versionResult;
          }
          return await applyPatchRequest(
            patchContext,
            normalizePatchRequest(input, () => ({
              type: "context",
              context: patchContext,
            }))
          );
        }

        assertRelayPatchContext(ctx.authorization);
        return await applyPatchRequest(
          ctx,
          normalizePatchRequest(input, (entry) => ({
            type: "token",
            authToken: entry.authToken,
          }))
        );
      } catch (error) {
        return await toPatchResult(error);
      }
    }),
});

export const __testing__ = {
  createImportProjectBundleHandler,
  assertCliBundleVersion,
  prepareProjectBundleForClient,
};
