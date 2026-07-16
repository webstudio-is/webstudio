import { nanoid } from "nanoid";
import { z } from "zod";
import { loadById, patchBuild } from "@webstudio-is/project/index.server";
import type { CompactBuild } from "@webstudio-is/project-build";
import {
  loadBuildById,
  loadDevBuildByProjectId,
} from "@webstudio-is/project-build/server";
import {
  buildPatchTransaction,
  publicBuildIncludes,
} from "@webstudio-is/protocol/schema";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import { assertApiProjectPermit } from "./api-permits.server";
import { throwApiError } from "./api-errors.server";

export const loadBuildByProjectVersion = async (
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

export const loadReadableDevBuild = async (
  ctx: AppContext,
  projectId: string
) => {
  await assertApiProjectPermit(ctx, projectId, "view");
  return await loadDevBuildByProjectId(ctx, projectId);
};

const buildInclude = z.enum(publicBuildIncludes);

export type BuildInclude = z.infer<typeof buildInclude>;

export const buildGetInput = z.object({
  projectId: z.string(),
  include: z.array(buildInclude).optional(),
  version: z.number().int().optional(),
});

export const buildPatchInput = z.object({
  projectId: z.string(),
  baseVersion: z.number().int(),
  transactions: z.array(buildPatchTransaction).min(1),
});

export const createBuildSnapshot = ({
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
    if (include.has("pages")) {
      snapshot.redirects = pages.redirects;
      snapshot.pageTemplates = pages.pageTemplates;
    }
    add("pages", pages.pages);
    add("folders", pages.folders);
  }
  add("projectSettings", build.projectSettings);
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

export const serializeProjectSummary = (
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

export const commitBuildTransactions = async ({
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

export const commitBuildPatch = async ({
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
