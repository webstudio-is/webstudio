import { createQuerySourceCodec } from "@webstudio-is/query-builder";
import {
  createContentCompilationPlan,
  type ContentCompilationPlan,
  type ContentCompilationQuery,
  type ContentCompilationWhere,
} from "@webstudio-is/content-engine";
import { createAssetQueryCapabilities } from "./asset-query-capabilities";
import { assetsResourceUrl } from "./resource-loader";
import {
  assetQueryRequest,
  assetResourceContentOptions,
  type AssetQueryRequestInput,
  type AssetObservedFieldType,
  type AssetQueryFieldPath,
  type AssetQueryFilter,
  type AssetQuerySort,
  type AssetResourceContentOptions,
  type AssetResourceOutputSelection,
} from "@webstudio-is/content-engine";
import type { Resource, ResourceRequest } from "./schema/resources";
import type { Prop } from "./schema/props";
import type { DataSource } from "./schema/data-sources";

export const createAssetResourceRequest = (
  request: AssetQueryRequestInput
): ResourceRequest => ({
  name: "assets",
  control: "system",
  method: "post",
  url: assetsResourceUrl,
  searchParams: [],
  headers: [{ name: "content-type", value: "application/json" }],
  body: assetQueryRequest.parse(request),
});

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

export type StructuredAssetQueryWhereBinding =
  | StructuredAssetQueryFilterBinding
  | { all: StructuredAssetQueryWhereBinding[] }
  | { any: StructuredAssetQueryWhereBinding[] };

export type StructuredAssetQueryResourceConfiguration = {
  where: StructuredAssetQueryWhereBinding;
  sort: AssetQuerySort[];
  limit: string;
  offset: string;
  output: AssetResourceOutputSelection;
  content: AssetResourceContentOptions;
};

const toContentCompilationWhere = (
  where: StructuredAssetQueryWhereBinding
): ContentCompilationWhere => {
  if ("field" in where) {
    try {
      return {
        field: where.field,
        operator: where.operator,
        value: { type: "literal", value: JSON.parse(where.value) as unknown },
      };
    } catch {
      return {
        field: where.field,
        operator: where.operator,
        value: { type: "dynamic" },
      };
    }
  }
  if ("all" in where) {
    return { all: where.all.map(toContentCompilationWhere) };
  }
  return { any: where.any.map(toContentCompilationWhere) };
};

const toContentCompilationInteger = (expression: string) => {
  try {
    const value = JSON.parse(expression) as unknown;
    if (Number.isSafeInteger(value) && Number(value) >= 0) {
      return { type: "literal", value } as const;
    }
  } catch {
    // Dynamic expressions are evaluated by the generated page at runtime.
  }
  return { type: "dynamic" } as const;
};

export const createAssetContentCompilationQuery = ({
  resourceId,
  configuration,
}: {
  resourceId: string;
  configuration: StructuredAssetQueryResourceConfiguration;
}): ContentCompilationQuery => ({
  id: resourceId,
  where: toContentCompilationWhere(configuration.where),
  sort: configuration.sort,
  limit: toContentCompilationInteger(configuration.limit),
  offset: toContentCompilationInteger(configuration.offset),
  output: configuration.output,
  content: configuration.content,
});

export const isConfiguredAssetsResource = (resource: Resource) =>
  resource.control === "system" &&
  resource.method === "post" &&
  getStaticStringLiteral(resource.url) === assetsResourceUrl;

export const createReachableAssetContentCompilationPlan = ({
  props,
  dataSources,
  resources,
}: {
  props: Iterable<Prop>;
  dataSources: Iterable<DataSource>;
  resources: Iterable<Resource>;
}): ContentCompilationPlan | undefined => {
  const reachableResourceIds = new Set<string>();
  for (const prop of props) {
    if (prop.type === "resource") {
      reachableResourceIds.add(prop.value);
    }
  }
  for (const dataSource of dataSources) {
    if (dataSource.type === "resource") {
      reachableResourceIds.add(dataSource.resourceId);
    }
  }
  const queries = [];
  for (const resource of resources) {
    if (
      reachableResourceIds.has(resource.id) === false ||
      isConfiguredAssetsResource(resource) === false
    ) {
      continue;
    }
    const configuration = parseStructuredAssetQueryResourceBody(resource.body);
    if (configuration === undefined) {
      throw new Error(
        `Assets resource ${JSON.stringify(resource.id)} has an invalid query configuration`
      );
    }
    queries.push(
      createAssetContentCompilationQuery({
        resourceId: resource.id,
        configuration,
      })
    );
  }
  return createContentCompilationPlan(queries);
};

const assetQuerySourceCodec = createQuerySourceCodec<
  AssetObservedFieldType,
  AssetQueryFilter["operator"],
  StructuredAssetQueryResourceConfiguration
>(createAssetQueryCapabilities({}));

export const parseStructuredAssetQueryResourceBody = (
  body: string | undefined
): StructuredAssetQueryResourceConfiguration | undefined => {
  const parsed = assetQuerySourceCodec.parse(body ?? "");
  if (parsed.success === false) {
    return;
  }
  return parsed.value;
};

export const createStructuredAssetQueryResourceBody = ({
  where,
  sort,
  limit,
  offset,
  output = { mode: "all" },
  content,
}: StructuredAssetQueryResourceConfiguration) =>
  assetQuerySourceCodec.format({
    where,
    sort,
    limit,
    offset,
    output,
    content: assetResourceContentOptions.parse(content),
  });
