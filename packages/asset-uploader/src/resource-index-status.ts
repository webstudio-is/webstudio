import type { Database } from "@webstudio-is/postgrest/index.server";
import { assetResourceIndexStatus } from "@webstudio-is/sdk";
import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { assertPostgrestSuccess } from "./patch-utils";

type StatusRow = Pick<
  Database["public"]["Tables"]["AssetResourceIndexState"]["Row"],
  | "resourceId"
  | "queryHash"
  | "assetRevision"
  | "buildStatus"
  | "activeRevision"
  | "buildError"
  | "updatedAt"
>;

const stateByBuildStatus = {
  PENDING: "indexing",
  BUILDING: "indexing",
  ACTIVE: "active",
  STALE: "stale",
  FAILED: "failed",
} as const satisfies Record<StatusRow["buildStatus"], string>;

const defaultDependencies = {
  hasProjectPermit: authorizeProject.hasProjectPermit,
};

export const toAssetResourceIndexStatus = (row: StatusRow) =>
  assetResourceIndexStatus.parse({
    resourceId: row.resourceId,
    state: stateByBuildStatus[row.buildStatus],
    queryHash: row.queryHash,
    assetRevision: row.assetRevision,
    ...(row.activeRevision === null
      ? {}
      : { activeRevision: row.activeRevision }),
    ...(row.buildError !== null &&
    typeof row.buildError === "object" &&
    Array.isArray(row.buildError) === false
      ? { error: row.buildError }
      : {}),
    updatedAt: row.updatedAt,
  });

export const loadAssetResourceIndexStatus = async (
  {
    projectId,
    resourceId,
    context,
  }: {
    projectId: string;
    resourceId: string;
    context: AppContext;
  },
  dependencies = defaultDependencies
) => {
  const canView = await dependencies.hasProjectPermit(
    { projectId, permit: "view" },
    context
  );
  if (canView === false) {
    throw new AuthorizationError(
      "You don't have access to this project's asset resource index"
    );
  }

  const result = await context.postgrest.client
    .from("AssetResourceIndexState")
    .select(
      "resourceId, queryHash, assetRevision, buildStatus, activeRevision, buildError, updatedAt"
    )
    .eq("projectId", projectId)
    .eq("resourceId", resourceId)
    .is("deletedAt", null)
    .maybeSingle();
  assertPostgrestSuccess(result);
  return result.data === null
    ? undefined
    : toAssetResourceIndexStatus(result.data);
};
