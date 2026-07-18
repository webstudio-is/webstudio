import type { Client } from "@webstudio-is/postgrest/index.server";
import { assertPostgrestSuccess } from "./patch-utils";

export type AssetResourcePublicationIssue = {
  resourceId: string;
  reason:
    | "MISSING_STATE"
    | "QUERY_HASH_MISMATCH"
    | "ASSET_REVISION_MISMATCH"
    | "BUILD_NOT_ACTIVE"
    | "MISSING_ACTIVE_REVISION"
    | "INDEX_QUERY_HASH_MISMATCH"
    | "INDEX_ASSET_REVISION_MISMATCH"
    | "INDEX_CHECKSUM_MISMATCH";
};

const publicationIssueReasons = new Set<AssetResourcePublicationIssue["reason"]>([
  "MISSING_STATE",
  "QUERY_HASH_MISMATCH",
  "ASSET_REVISION_MISMATCH",
  "BUILD_NOT_ACTIVE",
  "MISSING_ACTIVE_REVISION",
  "INDEX_QUERY_HASH_MISMATCH",
  "INDEX_ASSET_REVISION_MISMATCH",
  "INDEX_CHECKSUM_MISMATCH",
]);

const parsePublicationIssues = (value: unknown) => {
  if (Array.isArray(value) === false) {
    throw new Error("Resource index publication check returned invalid data");
  }
  return value.map((issue): AssetResourcePublicationIssue => {
    if (
      typeof issue !== "object" ||
      issue === null ||
      "resourceId" in issue === false ||
      typeof issue.resourceId !== "string" ||
      "reason" in issue === false ||
      typeof issue.reason !== "string" ||
      publicationIssueReasons.has(
        issue.reason as AssetResourcePublicationIssue["reason"]
      ) === false
    ) {
      throw new Error("Resource index publication check returned invalid data");
    }
    return {
      resourceId: issue.resourceId,
      reason: issue.reason as AssetResourcePublicationIssue["reason"],
    };
  });
};

export class AssetResourceIndexPublicationBlockedError extends Error {
  readonly issues: AssetResourcePublicationIssue[];

  constructor(issues: AssetResourcePublicationIssue[]) {
    super("Asset resource indexes are not ready for publication");
    this.name = "AssetResourceIndexPublicationBlockedError";
    this.issues = issues;
  }
}

export const assertAssetResourceIndexesPublishable = async ({
  client,
  projectId,
  resources,
  assetRevision,
}: {
  client: Client;
  projectId: string;
  resources: readonly { resourceId: string; queryHash: string }[];
  assetRevision: string;
}) => {
  const result = await client.rpc("get_unpublishable_asset_resource_indexes", {
    p_project_id: projectId,
    p_resources: resources.map((resource) => ({ ...resource })),
    p_asset_revision: assetRevision,
  });
  assertPostgrestSuccess(result);
  const issues = parsePublicationIssues(result.data);
  if (issues.length > 0) {
    throw new AssetResourceIndexPublicationBlockedError(issues);
  }
};
