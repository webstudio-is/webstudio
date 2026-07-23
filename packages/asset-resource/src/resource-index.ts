import {
  assetResourceLimits,
  assetResourceIndexV1,
  type AssetResourceIndexV1,
} from "@webstudio-is/sdk";
import type { CanonicalAssetFileEntry } from "./canonical";
import { computeCanonicalAssetRevision } from "./field-catalog";
import { selectAssetResourceCandidates } from "./candidate-selection";
import { validateAssetResourceQuery } from "./query-validation";
import { compareStrings, serializeJsonDeterministically } from "./stable-json";
import { sha256 } from "./sha256";

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

type PreparedAssetResourceEntries = {
  assetRevision: string;
  documents: AssetResourceIndexV1["documents"];
};

export type AssetResourceIndexBuilder = {
  projectId: string;
  assetRevision: string;
  build: (input: {
    resourceId: string;
    query: string;
  }) => Promise<AssetResourceIndexV1>;
};

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

const prepareAssetResourceEntries = async ({
  projectId,
  entries,
  assetRevision,
}: {
  projectId: string;
  entries: readonly CanonicalAssetFileEntry[];
  assetRevision?: string;
}): Promise<PreparedAssetResourceEntries> => {
  const preparedAssetRevision = await computeCanonicalAssetRevision(entries);
  if (assetRevision !== undefined && assetRevision !== preparedAssetRevision) {
    throw new Error(
      "Prepared canonical entries do not match the supplied asset revision"
    );
  }
  const assetIds = new Set<string>();
  const documents: AssetResourceIndexV1["documents"] = [];
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
    documents.push(entry.document);
  }
  return { assetRevision: preparedAssetRevision, documents };
};

const buildPreparedAssetResourceIndex = async ({
  resourceId,
  query,
  prepared,
  validatedQuery = validateAssetResourceQuery(query),
}: {
  resourceId: string;
  query: string;
  prepared: PreparedAssetResourceEntries;
  validatedQuery?: ReturnType<typeof validateAssetResourceQuery>;
}) => {
  const selection = await selectAssetResourceCandidates({
    tree: validatedQuery.tree,
    documents: prepared.documents,
  });
  return await createAssetResourceIndex({
    format: "webstudio-resource-index",
    version: 1,
    resourceId,
    query,
    assetRevision: prepared.assetRevision,
    queryMode: selection.queryMode,
    parameterNames: selection.parameterNames,
    documents: selection.documents,
  });
};

/**
 * Prepares one canonical snapshot for any number of resource queries. This
 * keeps validation and revision hashing proportional to the asset count, not
 * the number of Assets resources that consume the same snapshot.
 */
export const createAssetResourceIndexBuilder = async ({
  projectId,
  entries,
  assetRevision,
}: {
  projectId: string;
  entries: readonly CanonicalAssetFileEntry[];
  assetRevision?: string;
}): Promise<AssetResourceIndexBuilder> => {
  const prepared = await prepareAssetResourceEntries({
    projectId,
    entries,
    assetRevision,
  });
  return {
    projectId,
    assetRevision: prepared.assetRevision,
    build: async ({ resourceId, query }) =>
      await buildPreparedAssetResourceIndex({ resourceId, query, prepared }),
  };
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
  const prepared = await prepareAssetResourceEntries({
    projectId,
    entries,
    assetRevision,
  });
  return await buildPreparedAssetResourceIndex({
    resourceId,
    query,
    prepared,
    validatedQuery,
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
