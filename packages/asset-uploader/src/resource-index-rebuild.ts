import type { Client } from "@webstudio-is/postgrest/index.server";
import type { AssetClientWithResourceIndexStore } from "./client";
import { synchronizeCanonicalAssets } from "./canonical-metadata-backfill";
import { loadCanonicalAssetFileSnapshot } from "./canonical-metadata-persistence";
import { buildPersistAndActivateAssetResourceIndex } from "./resource-index-build";
import { collectAssetResourceIndexGarbageBestEffort } from "./resource-index-garbage-collection";
import type { AssetResourceIndexBuildSource } from "./resource-index-persistence";

export class AssetResourceIndexNotFoundError extends Error {
  constructor() {
    super("Asset resource index state was not found");
    this.name = "AssetResourceIndexNotFoundError";
  }
}

export const rebuildAssetResourceIndex = async ({
  client,
  assetClient,
  projectId,
  resourceId,
  query,
  source,
  dependencies = {},
}: {
  client: Client;
  assetClient: AssetClientWithResourceIndexStore;
  projectId: string;
  resourceId: string;
  query: string;
  source: AssetResourceIndexBuildSource;
  dependencies?: {
    synchronizeCanonicalAssets?: typeof synchronizeCanonicalAssets;
    loadCanonicalAssetFileSnapshot?: typeof loadCanonicalAssetFileSnapshot;
  };
}) => {
  await (dependencies.synchronizeCanonicalAssets ?? synchronizeCanonicalAssets)(
    { client, assetClient, projectId }
  );
  const { entries, metadataSnapshot } = await (
    dependencies.loadCanonicalAssetFileSnapshot ??
    loadCanonicalAssetFileSnapshot
  )({ client, projectId });
  const result = await buildPersistAndActivateAssetResourceIndex({
    client,
    store: assetClient.resourceIndexStore,
    projectId,
    resourceId,
    query,
    entries,
    metadataSnapshot,
    source,
  });
  if (assetClient.resourceIndexStore.delete !== undefined) {
    await collectAssetResourceIndexGarbageBestEffort({
      client,
      store: { delete: assetClient.resourceIndexStore.delete },
    });
  }
  return result;
};
