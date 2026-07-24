import { assetIndexV1, type AssetIndexV1 } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  compareStrings,
  serializeJsonDeterministically,
  sha256,
} from "@webstudio-is/project-store";
import type { CanonicalAssetFileEntry } from "./canonical";
import {
  computeCanonicalAssetRevision,
  createAssetFieldCatalog,
  toBuilderAssetFieldCatalog,
} from "./field-catalog";

export const checksumAssetIndex = async (index: AssetIndexV1) => {
  const { integrity: _integrity, ...payload } = index;
  return await sha256(serializeJsonDeterministically(payload));
};

export const serializeAssetIndex = (value: unknown) =>
  serializeJsonDeterministically(assetIndexV1.parse(value));

const assertAssetIndexSize = (index: AssetIndexV1) => {
  if (
    new TextEncoder().encode(serializeAssetIndex(index)).byteLength >
    assetResourceLimits.indexBytes
  ) {
    throw new Error("Asset index exceeds the byte limit");
  }
};

export const createAssetIndex = async ({
  projectId,
  entries,
}: {
  projectId: string;
  entries: readonly CanonicalAssetFileEntry[];
}): Promise<AssetIndexV1> => {
  const assetIds = new Set<string>();
  for (const entry of entries) {
    if (entry.projectId !== projectId) {
      throw new Error("Asset index cannot combine multiple projects");
    }
    if (
      entry.assetId !== entry.document._id ||
      entry.revision !== entry.document.revision
    ) {
      throw new Error("Canonical asset metadata identity is inconsistent");
    }
    if (assetIds.has(entry.assetId)) {
      throw new Error("Asset index contains duplicate canonical assets");
    }
    assetIds.add(entry.assetId);
  }
  const documents = entries
    .map(({ document }) => document)
    .sort((left, right) => compareStrings(left._id, right._id));
  const assetRevision = await computeCanonicalAssetRevision(entries);
  const fieldCatalog = toBuilderAssetFieldCatalog(
    await createAssetFieldCatalog(entries)
  );
  const unsigned = assetIndexV1.parse({
    format: "webstudio-asset-index",
    version: 1,
    assetRevision,
    documents,
    fieldCatalog,
    integrity: {
      algorithm: "sha256",
      checksum: `sha256:${"0".repeat(64)}`,
    },
  });
  const index = assetIndexV1.parse({
    ...unsigned,
    integrity: {
      algorithm: "sha256",
      checksum: await checksumAssetIndex(unsigned),
    },
  });
  assertAssetIndexSize(index);
  return index;
};

export const verifyAssetIndex = async (value: unknown) => {
  const index = assetIndexV1.parse(value);
  assertAssetIndexSize(index);
  if (index.integrity.checksum !== (await checksumAssetIndex(index))) {
    throw new Error("Asset index checksum is invalid");
  }
  return index;
};
