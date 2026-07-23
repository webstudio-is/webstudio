import { createAssetResourceIndexBuilder } from "@webstudio-is/asset-resource";
import { getAssetResourceQuery, type Resource } from "@webstudio-is/sdk";
export { getAssetResourceQuery } from "@webstudio-is/sdk";
import type { Client } from "@webstudio-is/postgrest/index.server";
import type { AssetClientWithResourceIndexStore } from "./client";
import { synchronizeCanonicalAssets } from "./canonical-metadata-backfill";
import { loadCanonicalAssetFileSnapshot } from "./canonical-metadata-persistence";
import { buildPersistAndActivateAssetResourceIndex } from "./resource-index-build";
import { deleteAssetResourceIndexQuery } from "./resource-index-persistence";
import { collectAssetResourceIndexGarbageBestEffort } from "./resource-index-garbage-collection";
import type { AssetResourceIndexBuildSource } from "./resource-index-persistence";
import { assertPostgrestSuccess } from "./patch-utils";

const loadOwnedAssetResourceIndexIds = async ({
  client,
  projectId,
}: {
  client: Client;
  projectId: string;
}) => {
  const result = await client
    .from("AssetResourceIndexState")
    .select("resourceId")
    .eq("projectId", projectId)
    .is("deletedAt", null)
    .order("resourceId");
  assertPostgrestSuccess(result);
  return (result.data ?? []).map(({ resourceId }) => resourceId);
};

export const synchronizeAssetResourceIndexQueries = async ({
  client,
  assetClient,
  projectId,
  previousResources,
  resources,
  source,
  dependencies = {},
}: {
  client: Client;
  assetClient: AssetClientWithResourceIndexStore;
  projectId: string;
  previousResources: readonly Resource[];
  resources: readonly Resource[];
  source: AssetResourceIndexBuildSource;
  dependencies?: {
    synchronizeCanonicalAssets?: typeof synchronizeCanonicalAssets;
    loadCanonicalAssetFileSnapshot?: typeof loadCanonicalAssetFileSnapshot;
    buildPersistAndActivateAssetResourceIndex?: typeof buildPersistAndActivateAssetResourceIndex;
    deleteAssetResourceIndexQuery?: typeof deleteAssetResourceIndexQuery;
    collectAssetResourceIndexGarbageBestEffort?: typeof collectAssetResourceIndexGarbageBestEffort;
    loadOwnedAssetResourceIndexIds?: typeof loadOwnedAssetResourceIndexIds;
  };
}) => {
  const synchronize =
    dependencies.synchronizeCanonicalAssets ?? synchronizeCanonicalAssets;
  const loadSnapshot =
    dependencies.loadCanonicalAssetFileSnapshot ??
    loadCanonicalAssetFileSnapshot;
  const buildIndex =
    dependencies.buildPersistAndActivateAssetResourceIndex ??
    buildPersistAndActivateAssetResourceIndex;
  const deleteQuery =
    dependencies.deleteAssetResourceIndexQuery ?? deleteAssetResourceIndexQuery;
  const collectGarbage =
    dependencies.collectAssetResourceIndexGarbageBestEffort ??
    collectAssetResourceIndexGarbageBestEffort;
  const loadOwnedResourceIds =
    dependencies.loadOwnedAssetResourceIndexIds ??
    loadOwnedAssetResourceIndexIds;
  const previous = new Map(
    previousResources.map((resource) => [resource.id, resource])
  );
  const current = new Map(resources.map((resource) => [resource.id, resource]));
  const currentQueryResourceIds = new Set(
    [...current]
      .filter(([, resource]) => getAssetResourceQuery(resource) !== undefined)
      .map(([resourceId]) => resourceId)
  );
  const explicitlyDeletedResourceIds = [...previous]
    .filter(([resourceId, resource]) => {
      const currentResource = current.get(resourceId);
      return (
        getAssetResourceQuery(resource) !== undefined &&
        (currentResource === undefined ||
          getAssetResourceQuery(currentResource) === undefined)
      );
    })
    .map(([resourceId]) => resourceId);
  // A failed best-effort synchronization happens after the Build patch has
  // committed, so the next patch may no longer contain the deleted resource in
  // `previousResources`. Reconcile persisted ownership as well so a later
  // resource edit repairs that failure instead of retaining an orphan forever.
  const ownedResourceIds = await loadOwnedResourceIds({ client, projectId });
  const deletedResourceIds = [
    ...new Set([
      ...explicitlyDeletedResourceIds,
      ...ownedResourceIds.filter(
        (resourceId) => currentQueryResourceIds.has(resourceId) === false
      ),
    ]),
  ].sort();
  const changed = [...current]
    .flatMap(([resourceId, resource]) => {
      const query = getAssetResourceQuery(resource);
      if (query === undefined) {
        return [];
      }
      const previousResource = previous.get(resourceId);
      if (
        previousResource !== undefined &&
        previousResource.control === resource.control &&
        previousResource.method === resource.method &&
        previousResource.url === resource.url &&
        previousResource.body === resource.body
      ) {
        return [];
      }
      return [{ resourceId, query }];
    })
    .sort((left, right) => left.resourceId.localeCompare(right.resourceId));

  const failures: unknown[] = [];
  for (const resourceId of deletedResourceIds) {
    try {
      await deleteQuery({ client, projectId, resourceId, source });
    } catch (error) {
      failures.push(error);
    }
  }
  if (changed.length === 0) {
    if (
      deletedResourceIds.length > 0 &&
      assetClient.resourceIndexStore.delete !== undefined
    ) {
      await collectGarbage({
        client,
        store: { delete: assetClient.resourceIndexStore.delete },
        projectId,
        resourceIds: deletedResourceIds,
      });
    }
    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        `Failed to synchronize ${failures.length} asset resource index queries`
      );
    }
    return { deletedResourceIds, updatedResourceIds: [] };
  }
  const updatedResourceIds: string[] = [];
  try {
    await synchronize({ projectId, client, assetClient });
    const { entries, metadataSnapshot } = await loadSnapshot({
      client,
      projectId,
    });
    const indexBuilder = await createAssetResourceIndexBuilder({
      projectId,
      entries,
    });
    for (const { resourceId, query } of changed) {
      try {
        await buildIndex({
          client,
          store: assetClient.resourceIndexStore,
          projectId,
          resourceId,
          query,
          entries,
          metadataSnapshot,
          source,
          indexBuilder,
        });
        updatedResourceIds.push(resourceId);
      } catch (error) {
        failures.push(error);
      }
    }
  } catch (error) {
    failures.push(error);
  }
  if (assetClient.resourceIndexStore.delete !== undefined) {
    await collectGarbage({
      client,
      store: { delete: assetClient.resourceIndexStore.delete },
      projectId,
      resourceIds: [
        ...new Set([
          ...deletedResourceIds,
          ...changed.map(({ resourceId }) => resourceId),
        ]),
      ],
    });
  }
  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      `Failed to synchronize ${failures.length} asset resource index queries`
    );
  }
  return { deletedResourceIds, updatedResourceIds };
};
