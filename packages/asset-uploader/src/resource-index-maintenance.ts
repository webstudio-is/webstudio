import {
  buildAssetResourceIndex,
  type CanonicalAssetFileEntry,
  type ImmutableAssetResourceIndexStore,
} from "@webstudio-is/asset-resource";
import type { Client } from "@webstudio-is/postgrest/index.server";
import type { AssetClient } from "./client";
import { assertPostgrestSuccess } from "./patch-utils";
import { synchronizeCanonicalAsset } from "./canonical-metadata-backfill";
import {
  loadCanonicalAssetFileSnapshot,
  type CanonicalAssetMetadataSnapshot,
} from "./canonical-metadata-persistence";
import {
  AssetResourceIndexBuildSupersededError,
  buildPersistAndActivateAssetResourceIndex,
} from "./resource-index-build";
import {
  loadAssetResourceIndexSnapshots,
  type AssetResourceIndexSnapshot,
} from "./resource-index-snapshot";
import { collectAssetResourceIndexGarbageBestEffort } from "./resource-index-garbage-collection";

export const synchronizeAssetResourceStateAfterAssetChange = async ({
  client,
  assetClient,
  projectId,
  assetId,
}: {
  client: Client;
  assetClient: AssetClient;
  projectId: string;
  assetId: string;
}) => {
  await synchronizeCanonicalAsset({
    projectId,
    assetId,
    client,
    assetClient,
  });
  if (assetClient.resourceIndexStore !== undefined) {
    await updateAssetResourceIndexesAfterCanonicalChange({
      client,
      store: assetClient.resourceIndexStore,
      projectId,
      changedAssetIds: [assetId],
    });
  }
};

export const updateAssetResourceIndexesAfterCanonicalChange = async ({
  client,
  store,
  projectId,
  changedAssetIds,
  excludedResourceIds = [],
}: {
  client: Client;
  store: ImmutableAssetResourceIndexStore;
  projectId: string;
  changedAssetIds: readonly string[];
  excludedResourceIds?: readonly string[];
}) => {
  const changedIds = [...new Set(changedAssetIds)].sort();
  if (changedIds.length === 0) {
    return { changedAssetIds: [], updatedResourceIds: [] };
  }
  const stateResult = await client
    .from("AssetResourceIndexState")
    .select("resourceId, query")
    .eq("projectId", projectId)
    .is("deletedAt", null)
    .order("resourceId");
  assertPostgrestSuccess(stateResult);
  const excluded = new Set(excludedResourceIds);
  const resources = (stateResult.data ?? []).filter(
    ({ resourceId }) => excluded.has(resourceId) === false
  );
  if (resources.length === 0) {
    return { changedAssetIds: changedIds, updatedResourceIds: [] };
  }

  // Every GROQ query may depend on collection cardinality, ordering, or any
  // schema-less field. V1 therefore treats all query resources in this project
  // as affected, but rebuilds them from compact canonical rows loaded once.
  const { entries, metadataSnapshot } = await loadCanonicalAssetFileSnapshot({
    client,
    projectId,
  });
  const updatedResourceIds: string[] = [];
  const errors: unknown[] = [];
  for (const resource of resources) {
    try {
      await buildPersistAndActivateAssetResourceIndex({
        client,
        store,
        projectId,
        resourceId: resource.resourceId,
        query: resource.query,
        entries,
        metadataSnapshot,
      });
      updatedResourceIds.push(resource.resourceId);
    } catch (error) {
      errors.push(error);
    }
  }
  if (store.delete !== undefined) {
    await collectAssetResourceIndexGarbageBestEffort({
      client,
      store: { delete: store.delete },
      projectId,
      resourceIds: resources.map(({ resourceId }) => resourceId),
    });
  }
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `Failed to update ${errors.length} affected resource indexes`
    );
  }
  return { changedAssetIds: changedIds, updatedResourceIds };
};

export const reconcileAssetResourceIndexesForPublication = async ({
  client,
  store,
  projectId,
  resources,
  entries,
  assetRevision,
  metadataSnapshot,
}: {
  client: Client;
  store: ImmutableAssetResourceIndexStore;
  projectId: string;
  resources: readonly {
    resourceId: string;
    query: string;
    queryHash: string;
  }[];
  entries: readonly CanonicalAssetFileEntry[];
  assetRevision: string;
  metadataSnapshot: CanonicalAssetMetadataSnapshot;
}) => {
  if (resources.length === 0) {
    return [];
  }
  const statesResult = await client
    .from("AssetResourceIndexState")
    .select(
      "resourceId, queryHash, assetRevision, buildStatus, activeRevision, deletedAt"
    )
    .eq("projectId", projectId)
    .in(
      "resourceId",
      [...new Set(resources.map(({ resourceId }) => resourceId))].sort()
    );
  assertPostgrestSuccess(statesResult);
  const states = new Map(
    (statesResult.data ?? []).map((state) => [state.resourceId, state])
  );
  const rebuilt: string[] = [];
  for (const resource of resources) {
    const state = states.get(resource.resourceId);
    // A different query belongs to a historical build and must not replace the
    // Builder's current active query.
    if (
      state !== undefined &&
      (state.deletedAt !== null || state.queryHash !== resource.queryHash)
    ) {
      continue;
    }
    if (
      state !== undefined &&
      state.buildStatus === "ACTIVE" &&
      state.activeRevision !== null &&
      state.assetRevision === assetRevision
    ) {
      continue;
    }
    try {
      await buildPersistAndActivateAssetResourceIndex({
        client,
        store,
        projectId,
        resourceId: resource.resourceId,
        query: resource.query,
        entries,
        assetRevision,
        metadataSnapshot,
      });
    } catch (error) {
      // A concurrent build of the same identity may activate first. The
      // snapshot validation immediately after reconciliation remains the
      // authority for whether publication can proceed.
      if (error instanceof AssetResourceIndexBuildSupersededError === false) {
        throw error;
      }
    }
    rebuilt.push(resource.resourceId);
  }
  return rebuilt;
};

export const prepareAssetResourceIndexSnapshotsForPublication = async ({
  client,
  store,
  projectId,
  resources,
  entries,
  assetRevision,
  metadataSnapshot,
  read,
  referenceId,
  currentResourceIds = [],
}: {
  client: Client;
  store: ImmutableAssetResourceIndexStore;
  projectId: string;
  resources: readonly {
    resourceId: string;
    query: string;
    queryHash: string;
  }[];
  entries: readonly CanonicalAssetFileEntry[];
  assetRevision: string;
  metadataSnapshot: CanonicalAssetMetadataSnapshot;
  read: (name: string) => Promise<{ data: AsyncIterable<Uint8Array> }>;
  referenceId: string;
  currentResourceIds?: readonly string[];
}): Promise<AssetResourceIndexSnapshot[]> => {
  if (resources.length === 0) {
    return [];
  }
  const statesResult = await client
    .from("AssetResourceIndexState")
    .select("resourceId, queryHash, deletedAt")
    .eq("projectId", projectId)
    .in(
      "resourceId",
      [...new Set(resources.map(({ resourceId }) => resourceId))].sort()
    );
  assertPostgrestSuccess(statesResult);
  const states = new Map(
    (statesResult.data ?? []).map((state) => [state.resourceId, state])
  );
  const explicitlyCurrent = new Set(currentResourceIds);
  const currentResources = resources.filter((resource) => {
    const state = states.get(resource.resourceId);
    return (
      explicitlyCurrent.has(resource.resourceId) ||
      (state !== undefined &&
        state.deletedAt === null &&
        state.queryHash === resource.queryHash)
    );
  });
  await reconcileAssetResourceIndexesForPublication({
    client,
    store,
    projectId,
    resources: currentResources,
    entries,
    assetRevision,
    metadataSnapshot,
  });
  const currentSnapshots = await loadAssetResourceIndexSnapshots({
    client,
    projectId,
    resources: currentResources,
    read,
    expectedAssetRevision: assetRevision,
    referenceId,
    garbageCollectionStore:
      store.delete === undefined ? undefined : { delete: store.delete },
  });
  const snapshots = new Map(
    currentSnapshots.map((snapshot) => [snapshot.resourceId, snapshot])
  );
  for (const resource of resources) {
    if (snapshots.has(resource.resourceId)) {
      continue;
    }
    const index = await buildAssetResourceIndex({
      projectId,
      resourceId: resource.resourceId,
      query: resource.query,
      entries,
      assetRevision,
    });
    snapshots.set(resource.resourceId, {
      resourceId: resource.resourceId,
      revision: index.integrity.checksum,
      index,
    });
  }
  return resources.map(({ resourceId }) => snapshots.get(resourceId)!);
};
