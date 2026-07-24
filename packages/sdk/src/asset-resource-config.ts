import {
  generateObjectExpression,
  parseArrayExpression,
  parseObjectExpression,
} from "./expression";
import { assetsResourceUrl } from "./resource-loader";
import {
  assetQueryFieldPath,
  assetQueryFilter,
  assetQuerySort,
  assetResourceContentOptions,
  type AssetQueryFieldPath,
  type AssetQueryFilter,
  type AssetQuerySort,
  type AssetResourceContentOptions,
} from "./schema/asset-resource";
import type { Resource } from "./schema/resources";

const getStaticStringLiteral = (expression: string) => {
  try {
    const value = JSON.parse(expression);
    return typeof value === "string" && JSON.stringify(value) === expression
      ? value
      : undefined;
  } catch {
    return;
  }
};

export const isAssetsResource = (resource: Resource) =>
  resource.control === "system" &&
  (resource.method === "get" || resource.method === "post") &&
  getStaticStringLiteral(resource.url) === assetsResourceUrl;

export type StructuredAssetQueryFilterBinding = {
  field: AssetQueryFieldPath;
  operator: AssetQueryFilter["operator"];
  value: string;
};

export type StructuredAssetQueryResourceConfiguration = {
  filters: StructuredAssetQueryFilterBinding[];
  sort: AssetQuerySort[];
  limit: string;
  offset: string;
  content: AssetResourceContentOptions;
};

export const isConfiguredAssetsResource = (resource: Resource) =>
  resource.control === "system" &&
  resource.method === "post" &&
  getStaticStringLiteral(resource.url) === assetsResourceUrl;

const parseJsonExpression = (expression: string | undefined) => {
  if (expression === undefined) {
    return;
  }
  try {
    return JSON.parse(expression) as unknown;
  } catch {
    return;
  }
};

const getFilterPlaceholder = (operator: AssetQueryFilter["operator"]) =>
  operator === "in"
    ? []
    : operator === "exists" || operator === "isEmpty"
      ? false
      : null;

const parseStructuredFilter = (
  expression: string
): StructuredAssetQueryFilterBinding | undefined => {
  const fields = parseObjectExpression(expression);
  const field = assetQueryFieldPath.safeParse(
    parseJsonExpression(fields.get("field"))
  );
  const operator = parseJsonExpression(fields.get("operator"));
  const value = fields.get("value");
  if (
    field.success === false ||
    typeof operator !== "string" ||
    value === undefined
  ) {
    return;
  }
  const parsed = assetQueryFilter.safeParse({
    field: field.data,
    operator,
    value: getFilterPlaceholder(operator as AssetQueryFilter["operator"]),
  });
  if (parsed.success === false) {
    return;
  }
  return { field: field.data, operator: parsed.data.operator, value };
};

export const parseStructuredAssetQueryResourceBody = (
  body: string | undefined
): StructuredAssetQueryResourceConfiguration | undefined => {
  const root = parseObjectExpression(body ?? "");
  const queryExpression = root.get("query");
  if (queryExpression === undefined) {
    return;
  }
  const query = parseObjectExpression(queryExpression);
  const filterExpressions = parseArrayExpression(query.get("filters") ?? "");
  const sortExpressions = parseArrayExpression(query.get("sort") ?? "");
  if (filterExpressions === undefined || sortExpressions === undefined) {
    return;
  }
  const filters = filterExpressions.map(parseStructuredFilter);
  const sort = sortExpressions.map((expression) =>
    assetQuerySort.safeParse(parseJsonExpression(expression))
  );
  const limit = query.get("limit");
  const offset = query.get("offset");
  const content = assetResourceContentOptions.safeParse(
    parseJsonExpression(query.get("content"))
  );
  if (
    filters.some((filter) => filter === undefined) ||
    sort.some((item) => item.success === false) ||
    limit === undefined ||
    offset === undefined ||
    content.success === false
  ) {
    return;
  }
  return {
    filters: filters as StructuredAssetQueryFilterBinding[],
    sort: sort.map((item) => item.data as AssetQuerySort),
    limit,
    offset,
    content: content.data,
  };
};

export const createStructuredAssetQueryResourceBody = ({
  filters,
  sort,
  limit,
  offset,
  content,
}: StructuredAssetQueryResourceConfiguration) => {
  const filterExpressions = filters.map(({ field, operator, value }) => {
    const parsedField = assetQueryFieldPath.parse(field);
    if (value.trim().length === 0) {
      throw new Error("Asset query filter value expression cannot be empty");
    }
    assetQueryFilter.parse({
      field: parsedField,
      operator,
      value: getFilterPlaceholder(operator),
    });
    return generateObjectExpression(
      new Map([
        ["field", JSON.stringify(parsedField)],
        ["operator", JSON.stringify(operator)],
        ["value", value],
      ])
    );
  });
  const query = generateObjectExpression(
    new Map([
      ["filters", `[${filterExpressions.join(",")}]`],
      ["sort", JSON.stringify(sort.map((item) => assetQuerySort.parse(item)))],
      ["limit", limit],
      ["offset", offset],
      ["content", JSON.stringify(assetResourceContentOptions.parse(content))],
    ])
  );
  return generateObjectExpression(new Map([["query", query]]));
};
