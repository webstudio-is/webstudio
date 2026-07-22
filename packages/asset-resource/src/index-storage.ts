import type { AssetResourceIndexV1 } from "@webstudio-is/sdk";
import {
  serializeAssetResourceIndex,
  verifyAssetResourceIndex,
} from "./resource-index";

export type ImmutableAssetResourceIndexStore = {
  putIfAbsent: (object: {
    key: string;
    data: Uint8Array;
    checksum: string;
    contentType: "application/json";
  }) => Promise<{
    status: "created" | "exists";
    checksum: string;
  }>;
  read?: (key: string) => Promise<{
    data: AsyncIterable<Uint8Array>;
    contentLength?: number;
  }>;
  delete?: (key: string) => Promise<"deleted" | "missing">;
};

const encodeKeySegment = (value: string) => {
  if (value.length === 0) {
    throw new Error("Resource index key segment cannot be empty");
  }
  return encodeURIComponent(value).replaceAll(".", "%2E");
};

export const getAssetResourceIndexObjectKey = ({
  projectId,
  index,
}: {
  projectId: string;
  index: AssetResourceIndexV1;
}) =>
  [
    "resource-indexes",
    "projects",
    encodeKeySegment(projectId),
    "resources",
    encodeKeySegment(index.resourceId),
    "indexes",
    encodeKeySegment(index.queryHash),
    encodeKeySegment(index.assetRevision),
    `${encodeKeySegment(index.integrity.checksum)}.json`,
  ].join("/");

export const persistAssetResourceIndex = async ({
  store,
  projectId,
  index: value,
}: {
  store: ImmutableAssetResourceIndexStore;
  projectId: string;
  index: unknown;
}) => {
  const index = await verifyAssetResourceIndex(value);
  const key = getAssetResourceIndexObjectKey({ projectId, index });
  const result = await store.putIfAbsent({
    key,
    data: new TextEncoder().encode(serializeAssetResourceIndex(index)),
    checksum: index.integrity.checksum,
    contentType: "application/json",
  });
  if (result.checksum !== index.integrity.checksum) {
    throw new Error("Immutable resource index object already has other bytes");
  }
  return {
    key,
    revision: index.integrity.checksum,
    status: result.status,
  };
};

export type AssetResourceIndexGarbageCollectionStore = {
  delete: NonNullable<ImmutableAssetResourceIndexStore["delete"]>;
};
