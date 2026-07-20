import type { ImmutableAssetResourceIndexStore } from "@webstudio-is/asset-resource";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import { buildPersistAndActivateAssetResourceIndex } from "./resource-index-build";

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
  return await buildPersistAndActivateAssetResourceIndex({
    client,
    store,
    projectId,
    resourceId,
    query,
    entries,
  });
};
