import {
  assetQuery,
  assetQueryResult,
  assetQueryStandardFieldTypes,
  getAssetQueryOperatorsForFieldTypes,
  type AssetFileDocument,
  type AssetObservedFieldType,
  type AssetQueryInput,
  type AssetQueryFieldPath,
  type AssetQueryFilter,
  type AssetQueryItem,
  type AssetQueryResult,
  type BuilderAssetFieldCatalog,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  compareStrings,
  serializeJsonDeterministically,
} from "@webstudio-is/project-store/json";
import {
  AssetResourceHydrationError,
  type AssetResourceContentReader,
} from "./hydration";
import { createAssetContentHydrator } from "./content-hydrator";
import { appendAssetFieldPath } from "./canonical";

export class AssetQueryExecutionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AssetQueryExecutionError";
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

const validateFilterOperator = ({
  filter,
  fieldTypes,
}: {
  filter: AssetQueryFilter;
  fieldTypes: readonly AssetObservedFieldType[];
}) => {
  const compatible = getAssetQueryOperatorsForFieldTypes(fieldTypes).includes(
    filter.operator
  );
  if (compatible === false) {
    throw new AssetQueryExecutionError(
      `Operator ${filter.operator} is incompatible with ${getCatalogPath(filter.field)}`
    );
  }
};

export const validateAssetQueryAgainstCatalog = ({
  query: input,
  catalog,
}: {
  query: AssetQueryInput;
  catalog: BuilderAssetFieldCatalog;
}) => {
  const query = assetQuery.parse(input);
  const referencedFieldPaths = new Map<string, AssetQueryFieldPath>();
  for (const filter of query.filters) {
    const catalogPath = getCatalogPath(filter.field);
    referencedFieldPaths.set(catalogPath, filter.field);
    if (filter.field[0] === "properties") {
      const field = catalog.fields[catalogPath];
      if (field === undefined) {
        throw new AssetQueryExecutionError(
          `Asset field ${catalogPath} was not found`
        );
      }
      validateFilterOperator({ filter, fieldTypes: field.types });
    } else {
      validateFilterOperator({
        filter,
        fieldTypes:
          assetQueryStandardFieldTypes[
            filter.field[0] as keyof typeof assetQueryStandardFieldTypes
          ],
      });
    }
  }
  for (const order of query.sort) {
    const catalogPath = getCatalogPath(order.field);
    referencedFieldPaths.set(catalogPath, order.field);
    if (order.field[0] === "properties") {
      const field = catalog.fields[catalogPath];
      if (field === undefined) {
        throw new AssetQueryExecutionError(
          `Asset field ${catalogPath} was not found`
        );
      }
      if (field.types.some((type) => type === "object" || type === "array")) {
        throw new AssetQueryExecutionError(
          `Asset field ${catalogPath} cannot be sorted`
        );
      }
    }
  }
  return {
    query,
    referencedFieldPaths: [...referencedFieldPaths.values()],
  };
};

const getFieldValue = (
  document: AssetFileDocument,
  path: AssetQueryFieldPath
) => {
  let value: unknown =
    path[0] === "id"
      ? document._id
      : (document as Readonly<Record<string, unknown>>)[path[0]];
  for (const segment of path.slice(1)) {
    if (typeof value !== "object" || value === null) {
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
  document: AssetFileDocument,
  filter: AssetQueryFilter
) => {
  const value = getFieldValue(document, filter.field);
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

const compareSortValues = (left: unknown, right: unknown) => {
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

const toQueryItem = (document: AssetFileDocument): AssetQueryItem => ({
  id: document._id,
  name: document.name,
  path: document.path,
  key: document.key,
  ...(document.folderId === undefined ? {} : { folderId: document.folderId }),
  extension: document.extension,
  mimeType: document.mimeType,
  size: document.size,
  revision: document.revision,
  properties: document.properties,
  ...(document.excerpt === undefined ? {} : { excerpt: document.excerpt }),
  ...(document.metadataError === undefined
    ? {}
    : { metadataError: document.metadataError }),
});

const assertResultSize = (result: AssetQueryResult) => {
  if (
    new TextEncoder().encode(serializeJsonDeterministically(result))
      .byteLength > assetResourceLimits.resultBytes
  ) {
    throw new AssetQueryExecutionError(
      "Asset query result exceeds the byte limit"
    );
  }
};

export const executeAssetQuery = async ({
  query: input,
  documents,
  read,
}: {
  query: AssetQueryInput;
  documents: readonly AssetFileDocument[];
  read?: AssetResourceContentReader;
}): Promise<AssetQueryResult> => {
  const query = assetQuery.parse(input);
  if (documents.length > assetResourceLimits.candidateDocuments) {
    throw new AssetQueryExecutionError(
      "Asset query document limit was exceeded"
    );
  }
  const matched = documents.filter((document) =>
    query.filters.every((filter) => matchesAssetQueryFilter(document, filter))
  );
  const sorted = [...matched].sort((left, right) => {
    for (const order of query.sort) {
      const compared = compareSortValues(
        getFieldValue(left, order.field),
        getFieldValue(right, order.field)
      );
      if (compared !== 0) {
        return order.direction === "asc" ? compared : -compared;
      }
    }
    return compareStrings(left._id, right._id);
  });
  const selected = sorted.slice(query.offset, query.offset + query.limit);
  let items = selected.map(toQueryItem);
  if (query.content.mode !== "none") {
    const contentOptions = query.content;
    if (read === undefined) {
      throw new AssetQueryExecutionError("Asset content reader is unavailable");
    }
    if (selected.length > assetResourceLimits.hydratedFileCount) {
      throw new AssetResourceHydrationError({
        code: "CONTENT_LIMIT_EXCEEDED",
        message: "Too many selected assets requested content hydration",
        details: {
          fileCount: selected.length,
          fileCountLimit: assetResourceLimits.hydratedFileCount,
        },
      });
    }
    const hydrate = createAssetContentHydrator(read);
    items = await Promise.all(
      selected.map(async (document, index) => {
        const content = await hydrate(document, contentOptions);
        return {
          ...items[index],
          content: {
            encoding: content.encoding,
            text: content.text,
            ...(content.range === undefined ? {} : { range: content.range }),
          },
        };
      })
    );
  }
  const result = assetQueryResult.parse({
    items,
    totalCount: matched.length,
    hasMore: query.offset + selected.length < matched.length,
  });
  assertResultSize(result);
  return result;
};
