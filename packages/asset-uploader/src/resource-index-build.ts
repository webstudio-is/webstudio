import {
  buildAssetResourceIndex,
  persistAssetResourceIndex,
  type CanonicalAssetFileEntry,
  type ImmutableAssetResourceIndexStore,
} from "@webstudio-is/asset-resource";
import type { Client } from "@webstudio-is/postgrest/index.server";
import {
  activateAssetResourceIndex,
  beginAssetResourceIndexBuild,
  cancelAssetResourceIndexBuild,
  failAssetResourceIndexBuild,
} from "./resource-index-persistence";

export class AssetResourceIndexBuildSupersededError extends Error {
  constructor() {
    super("Asset resource index build was superseded before activation");
    this.name = "AssetResourceIndexBuildSupersededError";
  }
}

export class AssetResourceIndexBuildCancelledError extends Error {
  constructor() {
    super("Asset resource index build was cancelled");
    this.name = "AssetResourceIndexBuildCancelledError";
  }
}

const assertNotCancelled = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new AssetResourceIndexBuildCancelledError();
  }
};

export const buildPersistAndActivateAssetResourceIndex = async ({
  client,
  store,
  projectId,
  resourceId,
  query,
  entries,
  assetRevision,
  signal,
}: {
  client: Client;
  store: ImmutableAssetResourceIndexStore;
  projectId: string;
  resourceId: string;
  query: string;
  entries: readonly CanonicalAssetFileEntry[];
  assetRevision?: string;
  signal?: AbortSignal;
}) => {
  const buildAttemptId = crypto.randomUUID();
  assertNotCancelled(signal);
  const index = await buildAssetResourceIndex({
    projectId,
    resourceId,
    query,
    entries,
    assetRevision,
  });
  assertNotCancelled(signal);
  await beginAssetResourceIndexBuild({
    client,
    projectId,
    resourceId,
    query,
    queryHash: index.queryHash,
    assetRevision: index.assetRevision,
    buildAttemptId,
  });

  try {
    const persisted = await persistAssetResourceIndex({
      store,
      projectId,
      index,
    });
    assertNotCancelled(signal);
    const activated = await activateAssetResourceIndex({
      client,
      projectId,
      resourceId,
      revision: persisted.revision,
      queryHash: index.queryHash,
      assetRevision: index.assetRevision,
      buildAttemptId,
      checksum: index.integrity.checksum,
      objectKey: persisted.key,
    });
    if (activated === false) {
      throw new AssetResourceIndexBuildSupersededError();
    }
    return { index, persisted };
  } catch (error) {
    if (error instanceof AssetResourceIndexBuildCancelledError) {
      await cancelAssetResourceIndexBuild({
        client,
        projectId,
        resourceId,
        queryHash: index.queryHash,
        assetRevision: index.assetRevision,
        buildAttemptId,
      });
      throw error;
    }
    try {
      await failAssetResourceIndexBuild({
        client,
        projectId,
        resourceId,
        queryHash: index.queryHash,
        assetRevision: index.assetRevision,
        buildAttemptId,
      });
    } catch (stateError) {
      throw new AggregateError(
        [error, stateError],
        "Resource index build failed and its failure state could not be recorded",
        { cause: error }
      );
    }
    throw error;
  }
};
