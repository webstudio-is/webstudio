import { parseObjectExpression, type Resource } from "@webstudio-is/sdk";
import type { Client } from "@webstudio-is/postgrest/index.server";
import type { ImmutableAssetResourceIndexStore } from "@webstudio-is/asset-resource";
import type { AssetClient } from "./client";
import { synchronizeCanonicalAssets } from "./canonical-metadata-backfill";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import { buildPersistAndActivateAssetResourceIndex } from "./resource-index-build";
import { deleteAssetResourceIndexQuery } from "./resource-index-persistence";

const assetQueryUrl = "/$resources/assets/query";

export const getAssetResourceQuery = (resource: Resource) => {
  try {
    if (JSON.parse(resource.url) !== assetQueryUrl) {
      return;
    }
    const body = parseObjectExpression(resource.body ?? "");
    const queryExpression = body.get("query");
    if (queryExpression === undefined) {
      return;
    }
    const query = JSON.parse(queryExpression);
    return typeof query === "string" && query.trim() !== "" ? query : undefined;
  } catch {
    return;
  }
};

export const synchronizeAssetResourceIndexQueries = async ({
  client,
  assetClient,
  store,
  projectId,
  previousResources,
  resources,
}: {
  client: Client;
  assetClient: AssetClient;
  store: ImmutableAssetResourceIndexStore;
  projectId: string;
  previousResources: readonly Resource[];
  resources: readonly Resource[];
}) => {
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
    await deleteAssetResourceIndexQuery({ client, projectId, resourceId });
  }
  if (changed.length === 0) {
    return { deletedResourceIds, updatedResourceIds: [] };
  }
  await synchronizeCanonicalAssets({ projectId, client, assetClient });
  const entries = await loadCanonicalAssetFileEntries({ client, projectId });
  const updatedResourceIds: string[] = [];
  for (const { resourceId, query } of changed) {
    await buildPersistAndActivateAssetResourceIndex({
      client,
      store,
      projectId,
      resourceId,
      query,
      entries,
    });
    updatedResourceIds.push(resourceId);
  }
  return { deletedResourceIds, updatedResourceIds };
};
