import type { ImmutableAssetResourceIndexStore } from "@webstudio-is/asset-resource";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { assertPostgrestSuccess } from "./patch-utils";
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
}: {
  client: Client;
  store: ImmutableAssetResourceIndexStore;
  projectId: string;
  resourceId: string;
}) => {
  const state = await client
    .from("AssetResourceIndexState")
    .select("query")
    .eq("projectId", projectId)
    .eq("resourceId", resourceId)
    .maybeSingle();
  assertPostgrestSuccess(state);
  if (state.data === null) {
    throw new AssetResourceIndexNotFoundError();
  }
  const entries = await loadCanonicalAssetFileEntries({ client, projectId });
  return await buildPersistAndActivateAssetResourceIndex({
    client,
    store,
    projectId,
    resourceId,
    query: state.data.query,
    entries,
  });
};
