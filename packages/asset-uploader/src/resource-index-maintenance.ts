import type { ImmutableAssetResourceIndexStore } from "@webstudio-is/asset-resource";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { assertPostgrestSuccess } from "./patch-utils";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import { buildPersistAndActivateAssetResourceIndex } from "./resource-index-build";

export const updateAssetResourceIndexesAfterCanonicalChange = async ({
  client,
  store,
  projectId,
  changedAssetIds,
}: {
  client: Client;
  store: ImmutableAssetResourceIndexStore;
  projectId: string;
  changedAssetIds: readonly string[];
}) => {
  const changedIds = [...new Set(changedAssetIds)].sort();
  if (changedIds.length === 0) {
    return { changedAssetIds: [], updatedResourceIds: [] };
  }
  const stateResult = await client
    .from("AssetResourceIndexState")
    .select("resourceId, query")
    .eq("projectId", projectId)
    .order("resourceId");
  assertPostgrestSuccess(stateResult);
  const resources = stateResult.data ?? [];
  if (resources.length === 0) {
    return { changedAssetIds: changedIds, updatedResourceIds: [] };
  }

  // Every GROQ query may depend on collection cardinality, ordering, or any
  // schema-less field. V1 therefore treats all query resources in this project
  // as affected, but rebuilds them from compact canonical rows loaded once.
  const entries = await loadCanonicalAssetFileEntries({ client, projectId });
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
      });
      updatedResourceIds.push(resource.resourceId);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `Failed to update ${errors.length} affected resource indexes`
    );
  }
  return { changedAssetIds: changedIds, updatedResourceIds };
};
