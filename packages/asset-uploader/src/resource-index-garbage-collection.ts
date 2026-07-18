import type { AssetResourceIndexGarbageCollectionStore } from "@webstudio-is/asset-resource";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { assertPostgrestSuccess } from "./patch-utils";

export const collectAssetResourceIndexGarbage = async ({
  client,
  store,
  now = new Date(),
  gracePeriodMs,
  limit = 100,
}: {
  client: Client;
  store: AssetResourceIndexGarbageCollectionStore;
  now?: Date;
  gracePeriodMs: number;
  limit?: number;
}) => {
  if (
    Number.isSafeInteger(gracePeriodMs) === false ||
    gracePeriodMs < 0 ||
    Number.isSafeInteger(limit) === false ||
    limit <= 0 ||
    limit > 1000
  ) {
    throw new Error("Resource index garbage collection options are invalid");
  }
  const candidates = await client.rpc("claim_asset_resource_index_garbage", {
    p_before: new Date(now.getTime() - gracePeriodMs).toISOString(),
    p_limit: limit,
  });
  assertPostgrestSuccess(candidates);
  let deleted = 0;
  let missing = 0;
  const failures: unknown[] = [];
  for (const candidate of candidates.data ?? []) {
    try {
      const status = await store.delete(candidate.objectKey);
      const finalized = await client.rpc(
        "finalize_asset_resource_index_garbage",
        {
          p_project_id: candidate.projectId,
          p_resource_id: candidate.resourceId,
          p_revision: candidate.revision,
          p_gc_claim_id: candidate.gcClaimId,
        }
      );
      assertPostgrestSuccess(finalized);
      if (finalized.data !== true) {
        throw new Error("Resource index garbage claim could not be finalized");
      }
      status === "deleted" ? (deleted += 1) : (missing += 1);
    } catch (error) {
      const released = await client.rpc(
        "release_asset_resource_index_garbage_claim",
        {
          p_project_id: candidate.projectId,
          p_resource_id: candidate.resourceId,
          p_revision: candidate.revision,
          p_gc_claim_id: candidate.gcClaimId,
        }
      );
      assertPostgrestSuccess(released);
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      `Failed to collect ${failures.length} resource index objects`
    );
  }
  return {
    claimed: (candidates.data ?? []).length,
    deleted,
    missing,
  };
};
