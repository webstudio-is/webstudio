import type { AssetResourceIndexAuditStore } from "@webstudio-is/asset-resource";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { assertPostgrestSuccess } from "./patch-utils";

const encodeKeySegment = (value: string) =>
  encodeURIComponent(value).replaceAll(".", "%2E");

export const auditAssetResourceIndexObjects = async ({
  client,
  store,
  projectId,
  now = new Date(),
  staleClaimMs = 60 * 60 * 1000,
}: {
  client: Client;
  store: AssetResourceIndexAuditStore;
  projectId: string;
  now?: Date;
  staleClaimMs?: number;
}) => {
  if (Number.isSafeInteger(staleClaimMs) === false || staleClaimMs < 0) {
    throw new Error("Resource index stale-claim threshold is invalid");
  }
  const revisions = await client
    .from("AssetResourceIndexRevision")
    .select("resourceId, revision, objectKey, gcClaimId, gcStartedAt")
    .eq("projectId", projectId)
    .order("resourceId")
    .order("revision");
  assertPostgrestSuccess(revisions);
  const rows = revisions.data ?? [];
  const storedKeys = await store.listKeys(
    `projects/${encodeKeySegment(projectId)}/resources/`
  );
  const databaseKeys = new Set(rows.map(({ objectKey }) => objectKey));
  const objectKeys = new Set(storedKeys);
  const staleBefore = now.getTime() - staleClaimMs;
  const missingObjects = rows
    .filter(({ objectKey }) => objectKeys.has(objectKey) === false)
    .map(({ resourceId, revision, objectKey }) => ({
      resourceId,
      revision,
      objectKey,
    }));
  const orphanObjects = storedKeys.filter(
    (objectKey) => databaseKeys.has(objectKey) === false
  );
  const staleClaims = rows
    .filter(
      ({ gcClaimId, gcStartedAt }) =>
        gcClaimId !== null &&
        gcStartedAt !== null &&
        new Date(gcStartedAt).getTime() <= staleBefore
    )
    .map(({ resourceId, revision, gcClaimId, gcStartedAt }) => ({
      resourceId,
      revision,
      gcClaimId: gcClaimId as string,
      gcStartedAt: gcStartedAt as string,
    }));
  return {
    projectId,
    metrics: {
      databaseObjects: rows.length,
      storedObjects: storedKeys.length,
      missingObjects: missingObjects.length,
      orphanObjects: orphanObjects.length,
      staleClaims: staleClaims.length,
    },
    missingObjects,
    orphanObjects,
    staleClaims,
  };
};
