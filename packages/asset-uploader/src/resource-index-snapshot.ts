import {
  assetResourceLimits,
  type AssetResourceIndexV1,
} from "@webstudio-is/sdk";
import {
  verifyAssetResourceIndex,
  type AssetResourceIndexGarbageCollectionStore,
} from "@webstudio-is/asset-resource";
import type { Client, Database } from "@webstudio-is/postgrest/index.server";
import { assertPostgrestSuccess } from "./patch-utils";
import {
  addAssetResourceIndexReference,
  removeAssetResourceIndexReferences,
} from "./resource-index-persistence";
import { collectAssetResourceIndexGarbageBestEffort } from "./resource-index-garbage-collection";
import { mapBounded } from "./async-utils";

type StateRow = Pick<
  Database["public"]["Tables"]["AssetResourceIndexState"]["Row"],
  | "resourceId"
  | "queryHash"
  | "assetRevision"
  | "activeRevision"
  | "buildStatus"
  | "deletedAt"
>;
type RevisionRow = Pick<
  Database["public"]["Tables"]["AssetResourceIndexRevision"]["Row"],
  "resourceId" | "revision" | "queryHash" | "assetRevision" | "objectKey"
>;

export type AssetResourceIndexSnapshot = {
  resourceId: string;
  revision: string;
  index: AssetResourceIndexV1;
};

export class AssetResourceIndexSnapshotError extends Error {
  readonly resourceId: string;

  constructor(resourceId: string, message: string) {
    super(message);
    this.name = "AssetResourceIndexSnapshotError";
    this.resourceId = resourceId;
  }
}

const readIndex = async ({
  objectKey,
  read,
}: {
  objectKey: string;
  read: (name: string) => Promise<{ data: AsyncIterable<Uint8Array> }>;
}) => {
  const response = await read(objectKey);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.data) {
    size += chunk.byteLength;
    if (size > assetResourceLimits.indexBytes) {
      throw new Error("Resource index snapshot exceeds the byte limit");
    }
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return await verifyAssetResourceIndex(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
  );
};

export const loadAssetResourceIndexSnapshots = async ({
  client,
  projectId,
  resources,
  read,
  expectedAssetRevision,
  referenceId,
  garbageCollectionStore,
}: {
  client: Client;
  projectId: string;
  resources: readonly { resourceId: string; queryHash: string }[];
  read: (name: string) => Promise<{ data: AsyncIterable<Uint8Array> }>;
  expectedAssetRevision: string;
  referenceId: string;
  garbageCollectionStore?: AssetResourceIndexGarbageCollectionStore;
}): Promise<AssetResourceIndexSnapshot[]> => {
  const operationReferenceId = `${referenceId}:${crypto.randomUUID()}`;
  const expectedQueryHashes = new Map(
    resources.map(({ resourceId, queryHash }) => [resourceId, queryHash])
  );
  const uniqueResourceIds = [...expectedQueryHashes.keys()].sort();
  if (uniqueResourceIds.length === 0) {
    return [];
  }
  const statesResult = await client
    .from("AssetResourceIndexState")
    .select(
      "resourceId,queryHash,assetRevision,activeRevision,buildStatus,deletedAt"
    )
    .eq("projectId", projectId)
    .in("resourceId", uniqueResourceIds);
  assertPostgrestSuccess(statesResult);
  const states = (statesResult.data ?? []) as StateRow[];
  const statesByResource = new Map(states.map((row) => [row.resourceId, row]));
  for (const resourceId of uniqueResourceIds) {
    const state = statesByResource.get(resourceId);
    if (
      state === undefined ||
      state.deletedAt !== null ||
      state.buildStatus !== "ACTIVE" ||
      state.activeRevision === null ||
      state.queryHash !== expectedQueryHashes.get(resourceId) ||
      state.assetRevision !== expectedAssetRevision
    ) {
      throw new AssetResourceIndexSnapshotError(
        resourceId,
        "Asset resource index is not active"
      );
    }
  }

  const revisionsResult = await client
    .from("AssetResourceIndexRevision")
    .select("resourceId,revision,queryHash,assetRevision,objectKey")
    .eq("projectId", projectId)
    .in(
      "revision",
      states.map((state) => state.activeRevision as string)
    );
  assertPostgrestSuccess(revisionsResult);
  const revisions = (revisionsResult.data ?? []) as RevisionRow[];
  const revisionByIdentity = new Map(
    revisions.map((row) => [`${row.resourceId}:${row.revision}`, row])
  );

  let snapshots: AssetResourceIndexSnapshot[] = [];
  let operationFailure: { error: unknown } | undefined;
  try {
    for (const resourceId of uniqueResourceIds) {
      const state = statesByResource.get(resourceId) as StateRow & {
        activeRevision: string;
      };
      await addAssetResourceIndexReference({
        client,
        projectId,
        resourceId,
        revision: state.activeRevision,
        type: "BUILD",
        referenceId: operationReferenceId,
      });
    }
    snapshots = await mapBounded(
      uniqueResourceIds,
      assetResourceLimits.concurrentContentReads,
      async (resourceId) => {
        const state = statesByResource.get(resourceId) as StateRow & {
          activeRevision: string;
        };
        const revision = revisionByIdentity.get(
          `${resourceId}:${state.activeRevision}`
        );
        if (revision === undefined) {
          throw new AssetResourceIndexSnapshotError(
            resourceId,
            "Active asset resource index revision is missing"
          );
        }
        const index = await readIndex({ objectKey: revision.objectKey, read });
        if (
          index.resourceId !== resourceId ||
          index.queryHash !== state.queryHash ||
          index.queryHash !== revision.queryHash ||
          index.assetRevision !== state.assetRevision ||
          index.assetRevision !== revision.assetRevision ||
          index.integrity.checksum !== state.activeRevision ||
          revision.revision !== state.activeRevision
        ) {
          throw new AssetResourceIndexSnapshotError(
            resourceId,
            "Active asset resource index identity is inconsistent"
          );
        }
        return { resourceId, revision: state.activeRevision, index };
      }
    );
  } catch (error) {
    operationFailure = { error };
  }

  let cleanupFailure: { error: unknown } | undefined;
  try {
    await removeAssetResourceIndexReferences({
      client,
      projectId,
      type: "BUILD",
      referenceId: operationReferenceId,
    });
    if (garbageCollectionStore !== undefined) {
      await collectAssetResourceIndexGarbageBestEffort({
        client,
        store: garbageCollectionStore,
        projectId,
        resourceIds: uniqueResourceIds,
      });
    }
  } catch (error) {
    cleanupFailure = { error };
  }

  if (operationFailure !== undefined && cleanupFailure !== undefined) {
    throw new AggregateError(
      [operationFailure.error, cleanupFailure.error],
      "Asset resource index snapshot loading and reference cleanup failed",
      { cause: operationFailure.error }
    );
  }
  if (operationFailure !== undefined) {
    throw operationFailure.error;
  }
  if (cleanupFailure !== undefined) {
    throw cleanupFailure.error;
  }
  return snapshots;
};
