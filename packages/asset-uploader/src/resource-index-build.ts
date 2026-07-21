import {
  buildAssetResourceIndex,
  getAssetResourceIndexObjectKey,
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
  type AssetResourceIndexBuildSource,
} from "./resource-index-persistence";
import type { CanonicalAssetMetadataSnapshot } from "./canonical-metadata-persistence";

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
  metadataSnapshot,
  source,
  signal,
}: {
  client: Client;
  store: ImmutableAssetResourceIndexStore;
  projectId: string;
  resourceId: string;
  query: string;
  entries: readonly CanonicalAssetFileEntry[];
  assetRevision?: string;
  metadataSnapshot: CanonicalAssetMetadataSnapshot;
  source?: AssetResourceIndexBuildSource;
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
  const objectKey = getAssetResourceIndexObjectKey({ projectId, index });
  assertNotCancelled(signal);
  const begun = await beginAssetResourceIndexBuild({
    client,
    projectId,
    resourceId,
    query,
    queryHash: index.queryHash,
    assetRevision: index.assetRevision,
    buildAttemptId,
    revision: index.integrity.checksum,
    checksum: index.integrity.checksum,
    objectKey,
    metadataSnapshot,
    source,
  });
  if (begun === false) {
    throw new AssetResourceIndexBuildSupersededError();
  }

  let persisted:
    | Awaited<ReturnType<typeof persistAssetResourceIndex>>
    | undefined;
  try {
    persisted = await persistAssetResourceIndex({
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
      metadataSnapshot,
      source,
    });
    if (activated === false) {
      throw new AssetResourceIndexBuildSupersededError();
    }
    return { index, persisted };
  } catch (error) {
    if (error instanceof AssetResourceIndexBuildCancelledError) {
      try {
        await cancelAssetResourceIndexBuild({
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
          "Resource index build was cancelled but its state could not be updated",
          { cause: error }
        );
      }
      // The immutable object is content-addressed and may already be shared by
      // another concurrent attempt. Deleting it here could break an activated
      // revision. The pre-registered revision remains discoverable by GC.
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
