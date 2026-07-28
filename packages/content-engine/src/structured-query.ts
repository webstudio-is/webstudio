import { getQueryConditions } from "@webstudio-is/query-builder";
import {
  assetQuery,
  assetQueryStandardFieldTypes,
  getAssetQueryOperatorsForFieldTypes,
  type ContentDatabaseDocument,
  type AssetQuery,
  type AssetObservedFieldType,
  type AssetQueryInput,
  type AssetQueryFieldPath,
  type AssetQueryFilter,
  type AssetQueryResult,
  type AssetQueryWhere,
  type AssetResourceOutputSelection,
  type BuilderAssetFieldCatalog,
} from "./schema";
import { contentEngineLimits } from "./limits";
import {
  compareStrings,
  serializeJsonDeterministically,
} from "./canonical-json";
import {
  hydrateAssetResourceResult,
  type AssetResourceContentReader,
} from "./hydration";
import { appendAssetFieldPath } from "./canonical";
import { selectAssetProperties } from "./projection";
import { getUtf8ByteLength } from "./byte-stream";

export type AssetRuntimeData = {
  url: string;
  width?: number;
  height?: number;
};

export class AssetQueryExecutionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AssetQueryExecutionError";
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

const getCatalogField = (catalog: BuilderAssetFieldCatalog, path: string) =>
  Object.hasOwn(catalog.fields, path) ? catalog.fields[path] : undefined;

export const validateAssetQueryAgainstCatalog = ({
  query: input,
  catalog,
}: {
  query: AssetQueryInput;
  catalog: BuilderAssetFieldCatalog;
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
      if (field === undefined) {
        warnings.push(`Asset field ${catalogPath} is not currently observed`);
      } else if (
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
      if (field === undefined) {
        warnings.push(`Asset field ${catalogPath} is not currently observed`);
      } else if (
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
  path: AssetQueryFieldPath
) => {
  let value: unknown =
    path[0] === "id"
      ? document._id
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

const equalJson = (left: unknown, right: unknown) => {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return (
    serializeJsonDeterministically(left) ===
    serializeJsonDeterministically(right)
  );
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
  filter: AssetQueryFilter
) => {
  const value = getAssetQueryFieldValue(document, filter.field);
  if (filter.operator === "exists") {
    return (value !== undefined && value !== null) === filter.value;
  }
  if (filter.operator === "isEmpty") {
    return isEmpty(value) === filter.value;
  }
  if (filter.operator === "eq") {
    return equalJson(value, filter.value);
  }
  if (filter.operator === "ne") {
    return equalJson(value, filter.value) === false;
  }
  if (filter.operator === "in") {
    return filter.value.some((candidate) => equalJson(value, candidate));
  }
  if (filter.operator === "contains") {
    if (typeof value === "string" && typeof filter.value === "string") {
      return value.includes(filter.value);
    }
    return (
      Array.isArray(value) &&
      value.some((candidate) => equalJson(candidate, filter.value))
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

const matchesAssetQueryWhere = (
  document: ContentDatabaseDocument,
  where: AssetQueryWhere
): boolean => {
  if ("field" in where) {
    return matchesAssetQueryFilter(document, where);
  }
  if ("all" in where) {
    return where.all.every((child) => matchesAssetQueryWhere(document, child));
  }
  return where.any.some((child) => matchesAssetQueryWhere(document, child));
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

export const compareAssetQueryDocuments = (
  left: ContentDatabaseDocument,
  right: ContentDatabaseDocument,
  sort: AssetQuery["sort"]
) => {
  for (const order of sort) {
    const compared = compareAssetQuerySortValues(
      getAssetQueryFieldValue(left, order.field),
      getAssetQueryFieldValue(right, order.field)
    );
    if (compared !== 0) {
      return order.direction === "asc" ? compared : -compared;
    }
  }
  return compareStrings(left._id, right._id);
};

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
  output.includeMetadata ||
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
  const properties = selectProperties(document, output);
  const hasDimensions =
    runtimeAsset?.width !== undefined && runtimeAsset.height !== undefined;
  return {
    ...(includesOutputField(output, "id") ? { id: document._id } : {}),
    ...(runtimeAsset !== undefined && includesOutputField(output, "url")
      ? { url: runtimeAsset.url }
      : {}),
    ...(hasDimensions && includesOutputField(output, "width")
      ? { width: runtimeAsset.width }
      : {}),
    ...(hasDimensions && includesOutputField(output, "height")
      ? { height: runtimeAsset.height }
      : {}),
    ...(includesOutputField(output, "name") ? { name: document.name } : {}),
    ...(document.description === undefined ||
    includesOutputField(output, "description") === false
      ? {}
      : { description: document.description }),
    ...(includesOutputField(output, "path") ? { path: document.path } : {}),
    ...(includesOutputField(output, "key") ? { key: document.key } : {}),
    ...(document.folderId === undefined ||
    includesOutputField(output, "folderId") === false
      ? {}
      : { folderId: document.folderId }),
    ...(includesOutputField(output, "extension")
      ? { extension: document.extension }
      : {}),
    ...(includesOutputField(output, "mimeType")
      ? { mimeType: document.mimeType }
      : {}),
    ...(includesOutputField(output, "size") ? { size: document.size } : {}),
    ...(document.createdAt === undefined ||
    includesOutputField(output, "createdAt") === false
      ? {}
      : { createdAt: document.createdAt }),
    ...(includesOutputField(output, "revision")
      ? { revision: document.revision }
      : {}),
    ...(properties === undefined ? {} : { properties }),
    ...(document.excerpt === undefined || includesExcerpt(output) === false
      ? {}
      : { excerpt: document.excerpt }),
    ...(document.metadataError === undefined || output.includeMetadata === false
      ? {}
      : { metadataError: document.metadataError }),
  };
};

const getFallbackRuntimeAsset = (
  document: ContentDatabaseDocument
): AssetRuntimeData | undefined => {
  if (document.contentRef === undefined) {
    return;
  }
  const route = document.mimeType?.startsWith("image/") ? "image" : "asset";
  return { url: `/cgi/${route}/${document.contentRef}?format=raw` };
};

const assertResultSize = (result: AssetQueryResult) => {
  if (
    getUtf8ByteLength(serializeJsonDeterministically(result)) >
    contentEngineLimits.resultBytes
  ) {
    throw new AssetQueryExecutionError(
      "Asset query result exceeds the byte limit"
    );
  }
};

export const executeAssetQuery = async ({
  query: input,
  catalog,
  documents,
  read,
  runtimeAssets,
}: {
  query: AssetQueryInput;
  catalog: BuilderAssetFieldCatalog;
  documents: readonly ContentDatabaseDocument[];
  read?: AssetResourceContentReader;
  runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
}): Promise<AssetQueryResult> => {
  const { query } = validateAssetQueryAgainstCatalog({ query: input, catalog });
  if (documents.length > contentEngineLimits.candidateDocuments) {
    throw new AssetQueryExecutionError(
      "Asset query document limit was exceeded"
    );
  }
  const matched = documents.flatMap((document) => {
    if (matchesAssetQueryWhere(document, query.where) === false) {
      return [];
    }
    const item = toQueryItem(
      document,
      query.output,
      runtimeAssets?.[document._id] ?? getFallbackRuntimeAsset(document)
    );
    if (query.content.mode === "none" && Object.keys(item).length === 0) {
      return [];
    }
    return [{ document, item: { id: document._id, ...item } }];
  });
  const sorted = [...matched].sort((left, right) =>
    compareAssetQueryDocuments(left.document, right.document, query.sort)
  );
  const selected = sorted.slice(query.offset, query.offset + query.limit);
  const selectedDocuments = selected.map(({ document }) => document);
  let items = selected.map(({ item }) => item);
  if (query.content.mode !== "none") {
    const contentOptions = query.content;
    if (read === undefined) {
      throw new AssetQueryExecutionError("Asset content reader is unavailable");
    }
    const hydrated = await hydrateAssetResourceResult({
      result: selectedDocuments,
      documents: selectedDocuments,
      options: contentOptions,
      read,
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
          ...(content.range === undefined ? {} : { range: content.range }),
        },
      };
    });
  }
  const result = {
    items,
    totalCount: matched.length,
    hasMore: query.offset + selected.length < matched.length,
  } satisfies AssetQueryResult;
  assertResultSize(result);
  return result;
};
