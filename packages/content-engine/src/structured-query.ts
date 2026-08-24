import {
  evaluateQueryWhere,
  getQueryConditions,
} from "@webstudio-is/query-builder/runtime";
import {
  assetQuery,
  isAssetQueryMetadataField,
  isAssetQueryRuntimeField,
  assetQueryStandardFieldTypes,
  getAssetQueryOperatorsForFieldTypes,
  type ContentDatabaseDocument,
  type AssetQuery,
  type AssetObservedFieldType,
  type AssetQueryInput,
  type AssetQueryFieldPath,
  type AssetQueryFilter,
  type AssetQueryCollectionResult,
  type AssetQueryExecutionResult,
  type AssetQueryItem,
  type AssetQuerySingleResult,
  type AssetQueryWhere,
  type AssetResourceContentOptions,
  type AssetResourceOutputSelection,
  type BuilderAssetFieldCatalog,
} from "./schema";
import { contentEngineLimits } from "./limits";
import {
  areJsonValuesEqual,
  compareStrings,
  serializeJsonDeterministically,
} from "./canonical-json";
import {
  hydrateAssetResourceResult,
  type AssetResourceContentReader,
} from "./hydration";
import { getDocumentFormatByContentType } from "./document-graph/document-format";
import { appendAssetFieldPath } from "./canonical";
import { selectAssetDocumentFields, selectAssetProperties } from "./projection";
import { getUtf8ByteLength } from "./byte-stream";
import type { MarkdownAssetReferences } from "./markdown-references";
import {
  getRuntimeAssetUrls,
  resolveAssetValueReferences,
  type AssetRuntimeData,
  type AssetValueReferences,
} from "./asset-value-references";

export type { AssetRuntimeData } from "./asset-value-references";

export class AssetQueryExecutionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AssetQueryExecutionError";
  }
}

export class AssetQueryMultipleResultsError extends AssetQueryExecutionError {
  readonly code = "MULTIPLE_RESULTS";

  readonly matchedCount: number;

  constructor(matchedCount: number) {
    super(`Expected at most one asset, but the query matched ${matchedCount}.`);
    this.matchedCount = matchedCount;
    this.name = "AssetQueryMultipleResultsError";
  }
}

export class AssetIndexRevisionError extends Error {
  constructor() {
    super("The requested asset index revision is stale");
    this.name = "AssetIndexRevisionError";
  }
}

const getCatalogPath = (path: AssetQueryFieldPath) => {
  if (path[0] !== "properties") {
    return path[0];
  }
  let catalogPath = "properties";
  for (const segment of path.slice(1)) {
    catalogPath = appendAssetFieldPath(catalogPath, segment);
  }
  return catalogPath;
};

const isFilterOperatorCompatible = ({
  filter,
  fieldTypes,
}: {
  filter: AssetQueryFilter;
  fieldTypes: readonly AssetObservedFieldType[];
}) => getAssetQueryOperatorsForFieldTypes(fieldTypes).includes(filter.operator);

const getCatalogField = (
  catalog: BuilderAssetFieldCatalog | undefined,
  path: string
) =>
  catalog !== undefined && Object.hasOwn(catalog.fields, path)
    ? catalog.fields[path]
    : undefined;

export const validateAssetQueryAgainstCatalog = ({
  query: input,
  catalog,
}: {
  query: AssetQueryInput;
  catalog?: BuilderAssetFieldCatalog;
}) => {
  const query = assetQuery.parse(input);
  const referencedFieldPaths = new Map<string, AssetQueryFieldPath>();
  const warnings: string[] = [];
  for (const filter of getQueryConditions(query.where)) {
    const catalogPath = getCatalogPath(filter.field);
    referencedFieldPaths.set(catalogPath, filter.field);
    if (filter.field[0] === "properties") {
      const field = getCatalogField(catalog, catalogPath);
      // Dynamic fields are schemaless. The catalog describes the currently
      // observed documents for authoring assistance, but deleting the last
      // matching file must not invalidate an otherwise valid saved query.
      if (catalog !== undefined && field === undefined) {
        warnings.push(`Asset field ${catalogPath} is not currently observed`);
      } else if (
        field !== undefined &&
        isFilterOperatorCompatible({ filter, fieldTypes: field.types }) ===
          false
      ) {
        warnings.push(
          `Operator ${filter.operator} is not compatible with the currently observed types of ${catalogPath}`
        );
      }
    } else {
      if (
        isFilterOperatorCompatible({
          filter,
          fieldTypes:
            assetQueryStandardFieldTypes[
              filter.field[0] as keyof typeof assetQueryStandardFieldTypes
            ],
        }) === false
      ) {
        throw new AssetQueryExecutionError(
          `Operator ${filter.operator} is incompatible with ${catalogPath}`
        );
      }
    }
  }
  for (const order of query.sort) {
    const catalogPath = getCatalogPath(order.field);
    referencedFieldPaths.set(catalogPath, order.field);
    // Sorting is defined for every JSON value by compareSortValues below.
    // Do not let an absent field or an unrelated mixed-type document make a
    // previously valid schemaless query fail at runtime.
    if (order.field[0] === "properties") {
      const field = getCatalogField(catalog, catalogPath);
      if (catalog !== undefined && field === undefined) {
        warnings.push(`Asset field ${catalogPath} is not currently observed`);
      } else if (
        field !== undefined &&
        field.types.some((type) => type === "object" || type === "array")
      ) {
        warnings.push(
          `Asset field ${catalogPath} currently includes structured values that use deterministic JSON sort order`
        );
      }
    }
  }
  return {
    query,
    referencedFieldPaths: [...referencedFieldPaths.values()],
    warnings: [...new Set(warnings)],
  };
};

export const getAssetQueryFieldValue = (
  document: ContentDatabaseDocument,
  path: AssetQueryFieldPath,
  runtimeAsset?: AssetRuntimeData
) => {
  let value: unknown =
    path[0] === "id"
      ? document._id
      : isAssetQueryRuntimeField(path[0])
        ? runtimeAsset?.[path[0]]
        : (document as Readonly<Record<string, unknown>>)[path[0]];
  for (const segment of path.slice(1)) {
    if (
      typeof value !== "object" ||
      value === null ||
      Object.hasOwn(value, segment) === false
    ) {
      return;
    }
    value = (value as Readonly<Record<string, unknown>>)[segment];
  }
  return value;
};

const isEmpty = (value: unknown) => {
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length === 0;
  }
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 0
  );
};

const compareFilterValues = (left: unknown, right: unknown) => {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "string" && typeof right === "string") {
    return compareStrings(left, right);
  }
};

export const matchesAssetQueryFilter = (
  document: ContentDatabaseDocument,
  filter: AssetQueryFilter,
  runtimeAsset?: AssetRuntimeData
) => {
  const value = getAssetQueryFieldValue(document, filter.field, runtimeAsset);
  if (filter.operator === "exists") {
    return (value !== undefined && value !== null) === filter.value;
  }
  if (filter.operator === "isEmpty") {
    return isEmpty(value) === filter.value;
  }
  if (filter.operator === "eq") {
    return areJsonValuesEqual(value, filter.value);
  }
  if (filter.operator === "ne") {
    return areJsonValuesEqual(value, filter.value) === false;
  }
  if (filter.operator === "in") {
    return filter.value.some((candidate) =>
      areJsonValuesEqual(value, candidate)
    );
  }
  if (filter.operator === "contains") {
    if (typeof value === "string" && typeof filter.value === "string") {
      return value.includes(filter.value);
    }
    return (
      Array.isArray(value) &&
      value.some((candidate) => areJsonValuesEqual(candidate, filter.value))
    );
  }
  if (filter.operator === "startsWith") {
    return (
      typeof value === "string" &&
      typeof filter.value === "string" &&
      value.startsWith(filter.value)
    );
  }
  if (filter.operator === "endsWith") {
    return (
      typeof value === "string" &&
      typeof filter.value === "string" &&
      value.endsWith(filter.value)
    );
  }
  const compared = compareFilterValues(value, filter.value);
  if (compared === undefined) {
    return false;
  }
  if (filter.operator === "gt") {
    return compared > 0;
  }
  if (filter.operator === "gte") {
    return compared >= 0;
  }
  if (filter.operator === "lt") {
    return compared < 0;
  }
  return compared <= 0;
};

const matchesAssetQueryWhere = ({
  document,
  where,
  runtimeAsset,
  filterKeys,
  filterResults,
}: {
  document: ContentDatabaseDocument;
  where: AssetQueryWhere;
  runtimeAsset?: AssetRuntimeData;
  filterKeys: ReadonlyMap<AssetQueryFilter, string>;
  filterResults: Map<string, boolean>;
}): boolean =>
  evaluateQueryWhere(where, (filter) => {
    const key =
      filterKeys.get(filter) ?? serializeJsonDeterministically(filter);
    const cached = filterResults.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const matched = matchesAssetQueryFilter(document, filter, runtimeAsset);
    filterResults.set(key, matched);
    return matched;
  }) === true;

export const supportsAssetQueryContent = ({
  document,
  content,
}: {
  document: ContentDatabaseDocument;
  content: AssetResourceContentOptions;
}) => {
  if (content.mode !== "markdown-body-ref") {
    return true;
  }
  const format =
    document.mimeType === undefined
      ? undefined
      : getDocumentFormatByContentType(document.mimeType);
  if (format === "markdown" || format === "mdx") {
    return true;
  }
  // Preserve extension fallback for legacy documents with missing MIME metadata.
  return document.extension === "md" || document.extension === "mdx";
};

const compareAssetQuerySortValues = (left: unknown, right: unknown) => {
  const leftMissing = left === undefined || left === null;
  const rightMissing = right === undefined || right === null;
  if (leftMissing || rightMissing) {
    return leftMissing === rightMissing ? 0 : leftMissing ? 1 : -1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (
    (typeof left === "string" || typeof left === "boolean") &&
    (typeof right === "string" || typeof right === "boolean")
  ) {
    return compareStrings(String(left), String(right));
  }
  return compareStrings(
    serializeJsonDeterministically(left),
    serializeJsonDeterministically(right)
  );
};

const compareAssetQueryDocumentsWithRuntime = ({
  left,
  right,
  sort,
  runtimeAssets,
}: {
  left: ContentDatabaseDocument;
  right: ContentDatabaseDocument;
  sort: AssetQuery["sort"];
  runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
}) => {
  for (const order of sort) {
    const compared = compareAssetQuerySortValues(
      getAssetQueryFieldValue(left, order.field, runtimeAssets?.[left._id]),
      getAssetQueryFieldValue(right, order.field, runtimeAssets?.[right._id])
    );
    if (compared !== 0) {
      return order.direction === "asc" ? compared : -compared;
    }
  }
  return compareStrings(left._id, right._id);
};

export const compareAssetQueryDocuments = (
  left: ContentDatabaseDocument,
  right: ContentDatabaseDocument,
  sort: AssetQuery["sort"]
) => compareAssetQueryDocumentsWithRuntime({ left, right, sort });

const selectProperties = (
  document: ContentDatabaseDocument,
  output: AssetResourceOutputSelection
) => {
  if (document.properties === undefined) {
    return;
  }
  if (output.mode === "all") {
    return Object.keys(document.properties).length === 0
      ? undefined
      : document.properties;
  }
  if (
    output.mode !== "fields" ||
    output.fields.some((field) => field[0] === "properties") === false
  ) {
    return;
  }
  const properties = selectAssetProperties({
    properties: document.properties,
    fields: output.fields,
  });
  return Object.keys(properties).length === 0 ? undefined : properties;
};

const includesOutputField = (
  output: AssetResourceOutputSelection,
  field: string
) =>
  (output.includeMetadata && isAssetQueryMetadataField(field)) ||
  (output.mode === "fields" &&
    output.fields.some((path) => path.length === 1 && path[0] === field));

const includesExcerpt = (output: AssetResourceOutputSelection) =>
  output.mode === "all" ||
  (output.mode === "fields" &&
    output.fields.some(
      (field) => field.length === 1 && field[0] === "excerpt"
    ));

const toQueryItem = (
  document: ContentDatabaseDocument,
  output: AssetResourceOutputSelection,
  runtimeAsset?: AssetRuntimeData
) => {
  if (includesOutputField(output, "url") && runtimeAsset === undefined) {
    throw new Error(`Asset URL is unavailable for ${document._id}`);
  }
  const properties = selectProperties(document, output);
  const hasDimensions =
    runtimeAsset?.width !== undefined && runtimeAsset.height !== undefined;
  return {
    ...(runtimeAsset !== undefined && includesOutputField(output, "url")
      ? { url: runtimeAsset.url }
      : {}),
    ...(hasDimensions && includesOutputField(output, "width")
      ? { width: runtimeAsset.width }
      : {}),
    ...(hasDimensions && includesOutputField(output, "height")
      ? { height: runtimeAsset.height }
      : {}),
    ...selectAssetDocumentFields({
      document,
      includes: (field) => includesOutputField(output, field),
    }),
    ...(properties === undefined ? {} : { properties }),
    ...(document.excerpt === undefined || includesExcerpt(output) === false
      ? {}
      : { excerpt: document.excerpt }),
    ...(document.metadataError === undefined || output.includeMetadata === false
      ? {}
      : { metadataError: document.metadataError }),
  };
};

export const assertAssetQueryResultSize = (
  result: AssetQueryExecutionResult
) => {
  if (
    getUtf8ByteLength(serializeJsonDeterministically(result)) >
    contentEngineLimits.resultBytes
  ) {
    throw new AssetQueryExecutionError(
      "Asset query result exceeds the byte limit"
    );
  }
};

type AssetQueryMatch = {
  document: ContentDatabaseDocument;
  item: AssetQueryItem;
};

type AssetQuerySortGroup = {
  sort: AssetQuery["sort"];
  documents: Set<ContentDatabaseDocument>;
  sorted: readonly ContentDatabaseDocument[];
};

type PreparedAssetQuery = {
  index: number;
  query: AssetQuery;
  matches: Map<ContentDatabaseDocument, AssetQueryMatch>;
  sortGroup: AssetQuerySortGroup;
};

type AssetQuerySettlements = Array<
  PromiseSettledResult<AssetQueryExecutionResult> | undefined
>;

const rejectAssetQuery = (
  results: AssetQuerySettlements,
  index: number,
  reason: unknown
) => {
  results[index] = { status: "rejected", reason };
};

const prepareAssetQueries = ({
  inputs,
  catalog,
  results,
}: {
  inputs: readonly AssetQueryInput[];
  catalog?: BuilderAssetFieldCatalog;
  results: AssetQuerySettlements;
}) => {
  // Canonical keys share pure filter evaluation and sorting work only. Matches,
  // pagination, hydration, and settlement remain owned by each query.
  const sortGroups = new Map<string, AssetQuerySortGroup>();
  const filterKeys = new Map<AssetQueryFilter, string>();
  const preparedQueries: PreparedAssetQuery[] = [];

  for (const [index, input] of inputs.entries()) {
    let query: AssetQuery;
    try {
      query = validateAssetQueryAgainstCatalog({ query: input, catalog }).query;
    } catch (error) {
      rejectAssetQuery(results, index, error);
      continue;
    }

    for (const filter of getQueryConditions(query.where)) {
      filterKeys.set(filter, serializeJsonDeterministically(filter));
    }

    const sortKey = serializeJsonDeterministically(query.sort);
    let sortGroup = sortGroups.get(sortKey);
    if (sortGroup === undefined) {
      sortGroup = { sort: query.sort, documents: new Set(), sorted: [] };
      sortGroups.set(sortKey, sortGroup);
    }
    preparedQueries.push({
      index,
      query,
      matches: new Map(),
      sortGroup,
    });
  }

  return { filterKeys, preparedQueries, sortGroups };
};

const rejectPreparedAssetQueries = ({
  preparedQueries,
  results,
  createReason,
}: {
  preparedQueries: readonly PreparedAssetQuery[];
  results: AssetQuerySettlements;
  createReason: () => unknown;
}) => {
  for (const { index } of preparedQueries) {
    rejectAssetQuery(results, index, createReason());
  }
};

const requireSettledAssetQueryResults = (results: AssetQuerySettlements) =>
  results.map((result) => {
    if (result === undefined) {
      throw new Error("Asset query result was not settled");
    }
    return result;
  });

const scanAndSortAssetQueryDocuments = ({
  preparedQueries,
  documents,
  filterKeys,
  sortGroups,
  results,
  runtimeAssets,
}: {
  preparedQueries: readonly PreparedAssetQuery[];
  documents: readonly ContentDatabaseDocument[];
  filterKeys: ReadonlyMap<AssetQueryFilter, string>;
  sortGroups: ReadonlyMap<string, AssetQuerySortGroup>;
  results: AssetQuerySettlements;
  runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
}) => {
  for (const document of documents) {
    const runtimeAsset = runtimeAssets?.[document._id];
    const filterResults = new Map<string, boolean>();
    for (const state of preparedQueries) {
      if (results[state.index] !== undefined) {
        continue;
      }
      const { query } = state;
      try {
        if (
          supportsAssetQueryContent({ document, content: query.content }) ===
            false ||
          matchesAssetQueryWhere({
            document,
            where: query.where,
            runtimeAsset,
            filterKeys,
            filterResults,
          }) === false
        ) {
          continue;
        }
        const projected = toQueryItem(document, query.output, runtimeAsset);
        if (
          query.content.mode === "none" &&
          Object.keys(projected).length === 0 &&
          includesOutputField(query.output, "id") === false
        ) {
          continue;
        }
        const match = {
          document,
          item: { id: document._id, ...projected },
        } satisfies AssetQueryMatch;
        state.matches.set(document, match);
        state.sortGroup.documents.add(document);
      } catch (error) {
        rejectAssetQuery(results, state.index, error);
      }
    }
  }

  for (const group of sortGroups.values()) {
    group.sorted = [...group.documents].sort((left, right) =>
      compareAssetQueryDocumentsWithRuntime({
        left,
        right,
        sort: group.sort,
        runtimeAssets,
      })
    );
  }
};

const finalizeAssetQueries = async ({
  preparedQueries,
  results,
  read,
  assetReferences,
  assetUrls,
}: {
  preparedQueries: readonly PreparedAssetQuery[];
  results: AssetQuerySettlements;
  read?: AssetResourceContentReader;
  assetReferences?: MarkdownAssetReferences;
  assetUrls: Readonly<Record<string, string>>;
}) => {
  await Promise.all(
    preparedQueries.map(async (state) => {
      if (results[state.index] !== undefined) {
        return;
      }
      const { query } = state;
      try {
        const matched = state.sortGroup.sorted.flatMap((document) => {
          const match = state.matches.get(document);
          return match === undefined ? [] : [match];
        });
        const resultMode = query.result ?? "many";
        if (resultMode === "one" && matched.length > 1) {
          throw new AssetQueryMultipleResultsError(matched.length);
        }
        const selected =
          resultMode === "many"
            ? matched.slice(query.offset, query.offset + query.limit)
            : resultMode === "last"
              ? matched.slice(-1)
              : matched.slice(0, 1);
        const selectedDocuments = selected.map(({ document }) => document);
        let items = selected.map(({ item }) => item);
        if (query.content.mode !== "none") {
          const contentOptions = query.content;
          if (read === undefined) {
            throw new AssetQueryExecutionError(
              "Asset content reader is unavailable"
            );
          }
          const hydrated = await hydrateAssetResourceResult({
            result: selectedDocuments,
            documents: selectedDocuments,
            options: contentOptions,
            read,
            assetReferences,
            assetUrls: assetReferences === undefined ? undefined : assetUrls,
          });
          items = selectedDocuments.map((document, index) => {
            const content = hydrated.content[document._id];
            if (content === undefined) {
              throw new AssetQueryExecutionError(
                "Selected asset content could not be read"
              );
            }
            return {
              ...items[index],
              content: {
                encoding: content.encoding,
                text: content.text,
                ...(content.range === undefined
                  ? {}
                  : { range: content.range }),
              },
            };
          });
        }
        const result: AssetQueryExecutionResult =
          resultMode === "many"
            ? {
                items,
                totalCount: matched.length,
                hasMore: query.offset + selected.length < matched.length,
              }
            : {
                item: items[0] ?? null,
                totalCount: matched.length,
              };
        assertAssetQueryResultSize(result);
        results[state.index] = { status: "fulfilled", value: result };
      } catch (error) {
        rejectAssetQuery(results, state.index, error);
      }
    })
  );
};

export const executeAssetQueries = async ({
  queries: inputs,
  catalog,
  documents,
  read,
  runtimeAssets,
  assetReferences,
  assetValueReferences,
}: {
  queries: readonly AssetQueryInput[];
  catalog?: BuilderAssetFieldCatalog;
  documents: readonly ContentDatabaseDocument[];
  read?: AssetResourceContentReader;
  runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
  assetReferences?: MarkdownAssetReferences;
  assetValueReferences?: AssetValueReferences;
}): Promise<PromiseSettledResult<AssetQueryExecutionResult>[]> => {
  const results: AssetQuerySettlements = Array.from({ length: inputs.length });
  const { filterKeys, preparedQueries, sortGroups } = prepareAssetQueries({
    inputs,
    catalog,
    results,
  });

  if (documents.length > contentEngineLimits.candidateDocuments) {
    rejectPreparedAssetQueries({
      preparedQueries,
      results,
      createReason: () =>
        new AssetQueryExecutionError("Asset query document limit was exceeded"),
    });
    return requireSettledAssetQueryResults(results);
  }

  let resolvedDocuments: readonly ContentDatabaseDocument[];
  try {
    resolvedDocuments = documents.map((document) =>
      resolveAssetValueReferences({
        value: document,
        references: assetValueReferences?.[document._id],
        runtimeAssets: runtimeAssets ?? {},
      })
    );
  } catch (error) {
    rejectPreparedAssetQueries({
      preparedQueries,
      results,
      createReason: () => error,
    });
    return requireSettledAssetQueryResults(results);
  }

  scanAndSortAssetQueryDocuments({
    preparedQueries,
    documents: resolvedDocuments,
    filterKeys,
    sortGroups,
    results,
    runtimeAssets,
  });
  const assetUrls = getRuntimeAssetUrls(runtimeAssets);
  await finalizeAssetQueries({
    preparedQueries,
    results,
    read,
    assetReferences,
    assetUrls,
  });
  return requireSettledAssetQueryResults(results);
};

type ExecuteAssetQueryInput = {
  query: AssetQueryInput;
  catalog?: BuilderAssetFieldCatalog;
  documents: readonly ContentDatabaseDocument[];
  read?: AssetResourceContentReader;
  runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
  assetReferences?: MarkdownAssetReferences;
  assetValueReferences?: AssetValueReferences;
};

export function executeAssetQuery(
  input: Omit<ExecuteAssetQueryInput, "query"> & {
    query: AssetQueryInput & { result: "one" | "first" | "last" };
  }
): Promise<AssetQuerySingleResult>;
export function executeAssetQuery(
  input: Omit<ExecuteAssetQueryInput, "query"> & {
    query: AssetQueryInput & { result?: "many" };
  }
): Promise<AssetQueryCollectionResult>;
export function executeAssetQuery(
  input: ExecuteAssetQueryInput
): Promise<AssetQueryExecutionResult>;
export async function executeAssetQuery({
  query,
  ...input
}: ExecuteAssetQueryInput): Promise<AssetQueryExecutionResult> {
  const [result] = await executeAssetQueries({
    ...input,
    queries: [query],
  });
  if (result.status === "rejected") {
    throw result.reason;
  }
  return result.value;
}
