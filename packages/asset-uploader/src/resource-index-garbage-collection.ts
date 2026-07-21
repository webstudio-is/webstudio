import type { AssetResourceIndexGarbageCollectionStore } from "@webstudio-is/asset-resource";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { assertPostgrestSuccess } from "./patch-utils";
import { runBounded } from "./async-utils";

const garbageCollectionConcurrency = 8;

export const collectAssetResourceIndexGarbage = async ({
  client,
  store,
  limit = 100,
  now = new Date(),
}: {
  client: Client;
  store: AssetResourceIndexGarbageCollectionStore;
  limit?: number;
  now?: Date;
}) => {
  if (Number.isSafeInteger(limit) === false || limit <= 0 || limit > 1000) {
    throw new Error("Resource index garbage collection limit is invalid");
  }
  const candidates = await client.rpc("claim_asset_resource_index_garbage", {
    p_before: now.toISOString(),
    p_limit: limit,
  });
  assertPostgrestSuccess(candidates);

  let deleted = 0;
  let missing = 0;
  const failures: unknown[] = [];
  await runBounded(
    candidates.data ?? [],
    garbageCollectionConcurrency,
    async (candidate) => {
      let objectDeleted = false;
      try {
        const status = await store.delete(candidate.objectKey);
        objectDeleted = true;
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
          throw new Error(
            "Resource index garbage claim could not be finalized"
          );
        }
        if (status === "deleted") {
          deleted += 1;
        } else {
          missing += 1;
        }
      } catch (error) {
        // Once storage deletion succeeds, keep the claim so a later worker can
        // retry the idempotent delete and database finalization. Releasing it
        // would expose a revision row whose object no longer exists.
        if (objectDeleted === false) {
          try {
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
          } catch (releaseError) {
            failures.push(
              new AggregateError(
                [error, releaseError],
                "Resource index object deletion and claim release failed"
              )
            );
            return;
          }
        }
        failures.push(error);
      }
    }
  );
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

export const collectAssetResourceIndexGarbageBestEffort = async ({
  client,
  store,
  limit = 100,
}: {
  client: Client;
  store: AssetResourceIndexGarbageCollectionStore;
  limit?: number;
}) => {
  try {
    while (true) {
      const result = await collectAssetResourceIndexGarbage({
        client,
        store,
        limit,
      });
      if (result.claimed < limit) {
        break;
      }
    }
  } catch (error) {
    console.error("Asset resource index cleanup failed", error);
  }
};
