import {
  assetResourceLimits,
  assetResourceIndexV1,
  type AssetResourceIndexV1,
} from "@webstudio-is/sdk";
import {
  compareStrings,
  serializeJsonDeterministically,
} from "@webstudio-is/project-store";
import type { CanonicalAssetFileEntry } from "./canonical";
import { computeCanonicalAssetRevision } from "./field-catalog";
import { compileAssetGraphqlQuery } from "./graphql-compiler";
import {
  AssetResourceQueryValidationError,
  validateAssetResourceQuery,
} from "./query-validation";
import type { AssetQueryPlanV1 } from "./query-plan";
import { computeAssetResourceQueryHash } from "./query-hash";
import {
  checksumAssetResourceIndex,
  verifyPublishedAssetResourceIndex,
} from "./runtime-index";

export type AssetResourceIndexInput = Omit<
  AssetResourceIndexV1,
  "documents" | "plan"
> & {
  documents: readonly AssetResourceIndexV1["documents"][number][];
  plan: AssetQueryPlanV1;
};

export const normalizeAssetResourceIndex = (
  input: AssetResourceIndexInput
): AssetResourceIndexV1 =>
  assetResourceIndexV1.parse({
    ...input,
    documents: [...input.documents].sort((left, right) =>
      compareStrings(left._id, right._id)
    ),
  });

export const serializeAssetResourceIndex = (index: unknown) =>
  serializeJsonDeterministically(assetResourceIndexV1.parse(index));

type CreateAssetResourceIndexInput = Omit<
  AssetResourceIndexInput,
  "queryHash" | "integrity" | "plan"
> & {
  query: string;
};

type ValidatedAssetResourceQuery = string & {
  readonly __validatedAssetResourceQuery: unique symbol;
};

const validateQuery = (query: string): ValidatedAssetResourceQuery => {
  validateAssetResourceQuery(query);
  return query as ValidatedAssetResourceQuery;
};

const assertIndexSize = (serialized: string) => {
  if (
    new TextEncoder().encode(serialized).byteLength >
    assetResourceLimits.indexBytes
  ) {
    throw new Error("Resource index exceeds the byte limit");
  }
};

export { computeAssetResourceQueryHash } from "./query-hash";

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

const createAssetResourceIndexFromValidatedQuery = async ({
  query,
  ...input
}: Omit<CreateAssetResourceIndexInput, "query"> & {
  query: ValidatedAssetResourceQuery;
}): Promise<AssetResourceIndexV1> => {
  const queryHash = await computeAssetResourceQueryHash(query);
  let plan: AssetQueryPlanV1;
  try {
    plan = await compileAssetGraphqlQuery({
      query,
      documents: input.documents,
      assetRevision: input.assetRevision,
    });
  } catch (error) {
    throw new AssetResourceQueryValidationError({
      code: "INVALID_QUERY",
      message:
        error instanceof Error
          ? error.message
          : "Asset GraphQL query cannot be compiled",
    });
  }
  const unsigned = normalizeAssetResourceIndex({
    ...input,
    queryHash,
    plan,
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

export const createAssetResourceIndex = async ({
  query,
  ...input
}: CreateAssetResourceIndexInput): Promise<AssetResourceIndexV1> =>
  await createAssetResourceIndexFromValidatedQuery({
    ...input,
    query: validateQuery(query),
  });

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
}: {
  resourceId: string;
  query: ValidatedAssetResourceQuery;
  prepared: PreparedAssetResourceEntries;
}) => {
  return await createAssetResourceIndexFromValidatedQuery({
    format: "webstudio-resource-index",
    version: 1,
    resourceId,
    query,
    assetRevision: prepared.assetRevision,
    documents: prepared.documents,
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
      await buildPreparedAssetResourceIndex({
        resourceId,
        query: validateQuery(query),
        prepared,
      }),
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
  const validatedQuery = validateQuery(query);
  const prepared = await prepareAssetResourceEntries({
    projectId,
    entries,
    assetRevision,
  });
  return await buildPreparedAssetResourceIndex({
    resourceId,
    query: validatedQuery,
    prepared,
  });
};

export const verifyAssetResourceIndex = async (value: unknown) => {
  const index = assetResourceIndexV1.parse(value);
  return await verifyPublishedAssetResourceIndex(index);
};
