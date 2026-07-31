import {
  getQueryConditions,
  mapQueryWhere,
} from "@webstudio-is/query-builder/runtime";
import { serializeJsonDeterministically, sha256 } from "./canonical-json";
import type { ContentCompilationQuery } from "./compilation-plan";
import {
  assetQuery,
  assetQueryResult,
  isAssetQueryRuntimeField,
  materializedAssetQuery,
  type AssetQuery,
  type AssetQueryFieldPath,
  type AssetQueryInput,
  type AssetQueryItem,
  type AssetQueryResult,
  type BuilderAssetFieldCatalog,
  type ContentDatabaseDocument,
  type MaterializedAssetQuery,
} from "./schema";
import {
  AssetQueryExecutionError,
  executeAssetQuery,
} from "./structured-query";

const hasOverlappingFields = (fields: readonly AssetQueryFieldPath[]) =>
  fields.some((field, index) =>
    fields.some(
      (candidate, candidateIndex) =>
        index !== candidateIndex &&
        candidate.length < field.length &&
        candidate.every((segment, position) => segment === field[position])
    )
  );

const getMaterializedFields = (
  query: ContentCompilationQuery
): AssetQueryFieldPath[] | undefined => {
  if (
    query.content.mode !== "none" ||
    query.output.mode !== "fields" ||
    query.output.includeMetadata
  ) {
    return;
  }
  const fields = [
    ["id"] as AssetQueryFieldPath,
    ...query.output.fields.filter(
      (field) => field.length !== 1 || field[0] !== "id"
    ),
  ];
  if (
    fields.some((field) => isAssetQueryRuntimeField(field[0])) ||
    hasOverlappingFields(fields)
  ) {
    return;
  }
  return fields;
};

const toLiteralAssetQuery = (
  query: ContentCompilationQuery
): AssetQuery | undefined => {
  if (
    query.limit.type !== "literal" ||
    query.offset.type !== "literal" ||
    getQueryConditions(query.where).some(
      ({ field, value }) =>
        value.type !== "literal" || isAssetQueryRuntimeField(field[0])
    ) ||
    query.sort.some(({ field }) => isAssetQueryRuntimeField(field[0]))
  ) {
    return;
  }
  return assetQuery.parse({
    where: mapQueryWhere(query.where, (condition) => ({
      field: condition.field,
      operator: condition.operator,
      value:
        condition.value.type === "literal" ? condition.value.value : undefined,
    })),
    sort: query.sort,
    limit: query.limit.value,
    offset: query.offset.value,
    output: query.output,
    content: query.content,
  });
};

export const canMaterializeContentCompilationQuery = (
  query: ContentCompilationQuery
) =>
  getMaterializedFields(query) !== undefined &&
  toLiteralAssetQuery(query) !== undefined;

export const getAssetQueryHash = async (query: AssetQuery) =>
  await sha256(serializeJsonDeterministically(assetQuery.parse(query)));

const getItemFieldValue = (
  item: AssetQueryItem,
  field: AssetQueryFieldPath
) => {
  let value: unknown = item;
  for (const segment of field) {
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

const materializeQuery = async ({
  query,
  catalog,
  documents,
}: {
  query: ContentCompilationQuery;
  catalog: BuilderAssetFieldCatalog;
  documents: readonly ContentDatabaseDocument[];
}): Promise<
  | {
      hash: string;
      value: MaterializedAssetQuery;
    }
  | undefined
> => {
  if (canMaterializeContentCompilationQuery(query) === false) {
    return;
  }
  const fields = getMaterializedFields(query);
  const literalQuery = toLiteralAssetQuery(query);
  if (fields === undefined || literalQuery === undefined) {
    return;
  }
  let result: AssetQueryResult;
  try {
    result = await executeAssetQuery({
      query: literalQuery,
      catalog,
      documents,
    });
  } catch (error) {
    if (error instanceof AssetQueryExecutionError) {
      return;
    }
    throw error;
  }
  const rows = result.items.map((item) =>
    fields.map((field) => getItemFieldValue(item, field))
  );
  if (rows.some((row) => row.some((value) => value === undefined))) {
    return;
  }
  return {
    hash: await getAssetQueryHash(literalQuery),
    value: materializedAssetQuery.parse({
      fields,
      rows,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
    }),
  };
};

export const materializeContentCompilationQueries = async ({
  queries,
  catalog,
  documents,
}: {
  queries: readonly ContentCompilationQuery[];
  catalog: BuilderAssetFieldCatalog;
  documents: readonly ContentDatabaseDocument[];
}) => {
  const values: Record<string, MaterializedAssetQuery> = {};
  const materializedQueries = new Set<ContentCompilationQuery>();
  for (const query of queries) {
    const materialized = await materializeQuery({
      query,
      catalog,
      documents,
    });
    if (materialized === undefined) {
      continue;
    }
    values[materialized.hash] = materialized.value;
    materializedQueries.add(query);
  }
  return { values, materializedQueries };
};

const setItemFieldValue = ({
  item,
  field,
  value,
}: {
  item: Record<string, unknown>;
  field: AssetQueryFieldPath;
  value: unknown;
}) => {
  let target = item;
  for (const [index, segment] of field.entries()) {
    if (index === field.length - 1) {
      Object.defineProperty(target, segment, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
      return;
    }
    const current = Object.hasOwn(target, segment)
      ? target[segment]
      : undefined;
    if (typeof current === "object" && current !== null) {
      target = current as Record<string, unknown>;
      continue;
    }
    const nested: Record<string, unknown> = {};
    Object.defineProperty(target, segment, {
      value: nested,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    target = nested;
  }
};

const hydrateMaterializedQuery = (
  query: MaterializedAssetQuery
): AssetQueryResult =>
  assetQueryResult.parse({
    items: query.rows.map((row) => {
      const item: Record<string, unknown> = {};
      for (const [index, field] of query.fields.entries()) {
        setItemFieldValue({ item, field, value: row[index] });
      }
      return item;
    }),
    totalCount: query.totalCount,
    hasMore: query.hasMore,
  });

export const getMaterializedAssetQueryResult = async ({
  queries,
  query,
}: {
  queries: Readonly<Record<string, MaterializedAssetQuery>> | undefined;
  query: AssetQueryInput;
}): Promise<AssetQueryResult | undefined> => {
  if (queries === undefined) {
    return;
  }
  const value = queries[await getAssetQueryHash(assetQuery.parse(query))];
  return value === undefined ? undefined : hydrateMaterializedQuery(value);
};
