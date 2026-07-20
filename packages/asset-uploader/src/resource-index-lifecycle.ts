import { computeCanonicalAssetRevision } from "@webstudio-is/asset-resource";
import { getAssetResourceQuery, type Resource } from "@webstudio-is/sdk";
export { getAssetResourceQuery } from "@webstudio-is/sdk";
import type { Client } from "@webstudio-is/postgrest/index.server";
import type { AssetClientWithResourceIndexStore } from "./client";
import { synchronizeCanonicalAssets } from "./canonical-metadata-backfill";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import { buildPersistAndActivateAssetResourceIndex } from "./resource-index-build";
import { deleteAssetResourceIndexQuery } from "./resource-index-persistence";
import { collectAssetResourceIndexGarbageBestEffort } from "./resource-index-garbage-collection";

export const synchronizeAssetResourceIndexQueries = async ({
  client,
  assetClient,
  projectId,
  previousResources,
  resources,
  dependencies = {},
}: {
  client: Client;
  assetClient: AssetClientWithResourceIndexStore;
  projectId: string;
  previousResources: readonly Resource[];
  resources: readonly Resource[];
  dependencies?: {
    synchronizeCanonicalAssets?: typeof synchronizeCanonicalAssets;
    loadCanonicalAssetFileEntries?: typeof loadCanonicalAssetFileEntries;
    buildPersistAndActivateAssetResourceIndex?: typeof buildPersistAndActivateAssetResourceIndex;
    deleteAssetResourceIndexQuery?: typeof deleteAssetResourceIndexQuery;
    collectAssetResourceIndexGarbageBestEffort?: typeof collectAssetResourceIndexGarbageBestEffort;
  };
}) => {
  const synchronize =
    dependencies.synchronizeCanonicalAssets ?? synchronizeCanonicalAssets;
  const loadEntries =
    dependencies.loadCanonicalAssetFileEntries ?? loadCanonicalAssetFileEntries;
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
    .filter(
      ([resourceId, query]) =>
        query !== undefined && query !== previous.get(resourceId)
    )
    .map(([resourceId, query]) => ({ resourceId, query: query as string }))
    .sort((left, right) => left.resourceId.localeCompare(right.resourceId));

  for (const resourceId of deletedResourceIds) {
    await deleteQuery({ client, projectId, resourceId });
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
    return { deletedResourceIds, updatedResourceIds: [] };
  }
  await synchronize({ projectId, client, assetClient });
  const entries = await loadEntries({ client, projectId });
  const assetRevision = await computeCanonicalAssetRevision(entries);
  const updatedResourceIds: string[] = [];
  for (const { resourceId, query } of changed) {
    await buildIndex({
      client,
      store: assetClient.resourceIndexStore,
      projectId,
      resourceId,
      query,
      entries,
      assetRevision,
    });
    updatedResourceIds.push(resourceId);
  }
  if (assetClient.resourceIndexStore.delete !== undefined) {
    await collectGarbage({
      client,
      store: { delete: assetClient.resourceIndexStore.delete },
    });
  }
  return { deletedResourceIds, updatedResourceIds };
};
