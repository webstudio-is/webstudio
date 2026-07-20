import type { ImmutableAssetResourceIndexStore } from "@webstudio-is/asset-resource";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import { buildPersistAndActivateAssetResourceIndex } from "./resource-index-build";
import { collectAssetResourceIndexGarbageBestEffort } from "./resource-index-garbage-collection";

export class AssetResourceIndexNotFoundError extends Error {
  constructor() {
    super("Asset resource index state was not found");
    this.name = "AssetResourceIndexNotFoundError";
  }
}

export const rebuildAssetResourceIndex = async ({
  client,
  store,
  projectId,
  resourceId,
  query,
}: {
  client: Client;
  store: ImmutableAssetResourceIndexStore;
  projectId: string;
  resourceId: string;
  query: string;
}) => {
  const entries = await loadCanonicalAssetFileEntries({ client, projectId });
  const result = await buildPersistAndActivateAssetResourceIndex({
    client,
    store,
    projectId,
    resourceId,
    query,
    entries,
  });
  if (store.delete !== undefined) {
    await collectAssetResourceIndexGarbageBestEffort({
      client,
      store: { delete: store.delete },
    });
  }
  return result;
};
