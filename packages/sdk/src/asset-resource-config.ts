import {
  createQuerySourceCodec,
  createStructuredQuery,
} from "@webstudio-is/query-builder";
import {
  mapQueryWhere,
  type QueryWhereTree,
} from "@webstudio-is/query-builder/runtime";
import {
  generateObjectExpression,
  parseExpressionObject,
  parseJsonExpression,
  parseStringLiteralExpression,
} from "@webstudio-is/expression";
import {
  assetQueryRequest,
  assetQuerySourceDefinition,
  assetResourceContentOptions,
  createContentCompilationPlan,
  defaultAssetResourceOutputSelection,
  hasAssetQueryOutput,
  type AssetObservedFieldType,
  type AssetQueryRequestInput,
  type AssetQueryFieldPath,
  type AssetQueryFilter,
  type AssetQuerySort,
  type AssetResourceContentOptions,
  type AssetResourceOutputSelection,
  type ContentCompilationPlan,
  type ContentCompilationQuery,
  type ContentCompilationWhere,
} from "@webstudio-is/content-engine";
import { assetsResourceUrl } from "./resource-loader";
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

export const hasAssetsResourceUrl = (
  resource: Pick<Resource, "control" | "url">
) =>
  resource.control === "system" &&
  parseStringLiteralExpression(resource.url) === assetsResourceUrl;

export const isAssetsResource = (
  resource: Pick<Resource, "control" | "method" | "url">
) => resource.method === "post" && hasAssetsResourceUrl(resource);

export type StructuredAssetQueryFilterBinding = {
  field: AssetQueryFieldPath;
  operator: AssetQueryFilter["operator"];
  value: string;
};

export type StructuredAssetQueryWhereBinding =
  QueryWhereTree<StructuredAssetQueryFilterBinding>;

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
): ContentCompilationWhere =>
  mapQueryWhere(where, (condition) => {
    const value = parseJsonExpression(condition.value);
    if (value !== undefined) {
      return {
        field: condition.field,
        operator: condition.operator,
        value: {
          type: "literal" as const,
          value,
        },
      };
    }
    return {
      field: condition.field,
      operator: condition.operator,
      value: { type: "dynamic" as const },
    };
  });

const toContentCompilationInteger = (expression: string) => {
  const value = parseJsonExpression(expression);
  if (Number.isSafeInteger(value) && Number(value) >= 0) {
    return { type: "literal", value } as const;
  }
  return { type: "dynamic" } as const;
};

const createAssetContentCompilationQuery = ({
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
      isAssetsResource(resource) === false
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
>(assetQuerySourceDefinition);

export const createDefaultStructuredAssetQueryResourceConfiguration = () =>
  createStructuredQuery<StructuredAssetQueryResourceConfiguration>(
    assetQuerySourceDefinition
  );

export const parseStructuredAssetQueryResourceBody = (
  body: string | undefined
): StructuredAssetQueryResourceConfiguration | undefined => {
  const request = parseExpressionObject(body ?? "");
  if (request === undefined) {
    return;
  }
  const query = request.get("query");
  if (request.size !== 1 || query === undefined) {
    return;
  }
  const parsed = assetQuerySourceCodec.parse(query);
  if (parsed.success === false || hasAssetQueryOutput(parsed.value) === false) {
    return;
  }
  return parsed.value;
};

export const createStructuredAssetQueryResourceBody = ({
  where,
  sort,
  limit,
  offset,
  output = defaultAssetResourceOutputSelection,
  content,
}: StructuredAssetQueryResourceConfiguration) => {
  if (hasAssetQueryOutput({ output, content }) === false) {
    throw new Error("Select at least one asset query output");
  }
  const query = assetQuerySourceCodec.format({
    where,
    sort,
    limit,
    offset,
    output,
    content: assetResourceContentOptions.parse(content),
  });
  return generateObjectExpression(new Map([["query", query]]));
};
