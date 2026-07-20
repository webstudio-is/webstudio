import {
  assetResourceLimits,
  assetResourceIndexV1,
  type AssetResourceIndexV1,
} from "@webstudio-is/sdk";
import type { CanonicalAssetFileEntry } from "./canonical";
import { computeCanonicalAssetRevision } from "./field-catalog";
import { selectAssetResourceCandidates } from "./candidate-selection";
import { validateAssetResourceQuery } from "./query-validation";
import { serializeJsonDeterministically } from "./stable-json";
import { sha256 } from "./sha256";

const compareStrings = (left: string, right: string) => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

export type AssetResourceIndexInput = Omit<
  AssetResourceIndexV1,
  "parameterNames" | "documents"
> & {
  parameterNames: readonly string[];
  documents: readonly AssetResourceIndexV1["documents"][number][];
};

export const normalizeAssetResourceIndex = (
  input: AssetResourceIndexInput
): AssetResourceIndexV1 =>
  assetResourceIndexV1.parse({
    ...input,
    parameterNames: [...input.parameterNames].sort(compareStrings),
    documents: [...input.documents].sort((left, right) =>
      compareStrings(left._id, right._id)
    ),
  });

export const serializeAssetResourceIndex = (index: unknown) =>
  serializeJsonDeterministically(assetResourceIndexV1.parse(index));

type CreateAssetResourceIndexInput = Omit<
  AssetResourceIndexInput,
  "queryHash" | "integrity"
> & {
  query: string;
};

const checksumAssetResourceIndex = async (index: AssetResourceIndexV1) => {
  const { integrity: _integrity, ...payload } = index;
  return await sha256(serializeJsonDeterministically(payload));
};

const assertIndexSize = (serialized: string) => {
  if (
    new TextEncoder().encode(serialized).byteLength >
    assetResourceLimits.indexBytes
  ) {
    throw new Error("Resource index exceeds the byte limit");
  }
};

export const computeAssetResourceQueryHash = async (query: string) =>
  await sha256(query);

export const createAssetResourceIndex = async ({
  query,
  ...input
}: CreateAssetResourceIndexInput): Promise<AssetResourceIndexV1> => {
  const queryHash = await computeAssetResourceQueryHash(query);
  const unsigned = normalizeAssetResourceIndex({
    ...input,
    queryHash,
    integrity: {
      algorithm: "sha256",
      checksum: `sha256:${"0".repeat(64)}`,
    },
  });
  const index = assetResourceIndexV1.parse({
    ...unsigned,
    integrity: {
      algorithm: "sha256",
      checksum: await checksumAssetResourceIndex(unsigned),
    },
  });
  assertIndexSize(serializeAssetResourceIndex(index));
  return index;
};

export const buildAssetResourceIndex = async ({
  projectId,
  resourceId,
  query,
  entries,
  assetRevision,
}: {
  projectId: string;
  resourceId: string;
  query: string;
  entries: readonly CanonicalAssetFileEntry[];
  assetRevision?: string;
}) => {
  const validatedQuery = validateAssetResourceQuery(query);
  const assetIds = new Set<string>();
  for (const entry of entries) {
    if (entry.projectId !== projectId) {
      throw new Error("Resource index cannot combine multiple projects");
    }
    if (
      entry.assetId !== entry.document._id ||
      entry.revision !== entry.document.revision
    ) {
      throw new Error("Canonical asset metadata identity is inconsistent");
    }
    if (assetIds.has(entry.assetId)) {
      throw new Error("Resource index contains duplicate canonical assets");
    }
    assetIds.add(entry.assetId);
  }

  const selection = await selectAssetResourceCandidates({
    tree: validatedQuery.tree,
    documents: entries.map(({ document }) => document),
  });
  return await createAssetResourceIndex({
    format: "webstudio-resource-index",
    version: 1,
    resourceId,
    query,
    assetRevision:
      assetRevision ?? (await computeCanonicalAssetRevision(entries)),
    queryMode: selection.queryMode,
    parameterNames: selection.parameterNames,
    documents: selection.documents,
  });
};

export const verifyAssetResourceIndex = async (value: unknown) => {
  const index = assetResourceIndexV1.parse(value);
  const expected = await checksumAssetResourceIndex(index);
  if (index.integrity.checksum !== expected) {
    throw new Error("Resource index checksum is invalid");
  }
  assertIndexSize(serializeAssetResourceIndex(index));
  return index;
};
