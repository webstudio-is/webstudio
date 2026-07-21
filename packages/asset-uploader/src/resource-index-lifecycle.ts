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
  const previous = new Map(
    previousResources.map((resource) => [
      resource.id,
      getAssetResourceQuery(resource),
    ])
  );
  const current = new Map(
    resources.map((resource) => [resource.id, getAssetResourceQuery(resource)])
  );
  const deletedResourceIds = [...previous]
    .filter(
      ([resourceId, query]) =>
        query !== undefined && current.get(resourceId) === undefined
    )
    .map(([resourceId]) => resourceId)
    .sort();
  const changed = [...current]
    .filter(([, query]) => query !== undefined)
    .map(([resourceId, query]) => ({ resourceId, query: query as string }))
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
