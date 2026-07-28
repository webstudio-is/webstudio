import {
  createQuerySourceCodec,
  mapQueryWhere,
  type QuerySourceDefinition,
  type QueryWhereTree,
} from "@webstudio-is/query-builder";
import {
  generateObjectExpression,
  parseExpressionObject,
  parseStringLiteralExpression,
} from "@webstudio-is/expression";
import {
  assetObservedFieldType,
  assetQueryFieldPath,
  assetQueryOperators,
  assetQueryRequest,
  assetQueryStandardFields,
  assetQueryStandardFieldTypes,
  assetResourceContentOptions,
  assetResourceOutputSelection,
  createContentCompilationPlan,
  getAssetQueryOperatorsForFieldTypes,
  hasAssetQueryOutput,
  type AssetQueryRequestInput,
  type AssetObservedFieldType,
  type AssetQueryFieldPath,
  type AssetQueryFilter,
  type AssetQuerySort,
  type AssetResourceContentOptions,
  type AssetResourceOutputSelection,
  type ContentCompilationPlan,
  type ContentCompilationQuery,
  type ContentCompilationWhere,
} from "@webstudio-is/content-engine";
import { z } from "zod";
import { assetResourceLimits } from "./asset-resource-limits";
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

export const isAssetsResource = (resource: Resource) =>
  resource.control === "system" &&
  (resource.method === "get" || resource.method === "post") &&
  parseStringLiteralExpression(resource.url) === assetsResourceUrl;

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
    try {
      return {
        field: condition.field,
        operator: condition.operator,
        value: {
          type: "literal" as const,
          value: JSON.parse(condition.value) as unknown,
        },
      };
    } catch {
      return {
        field: condition.field,
        operator: condition.operator,
        value: { type: "dynamic" as const },
      };
    }
  });

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

export const isConfiguredAssetsResource = (resource: Resource) =>
  resource.control === "system" &&
  resource.method === "post" &&
  parseStringLiteralExpression(resource.url) === assetsResourceUrl;

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

const getDefaultFilterValue = (operator: AssetQueryFilter["operator"]) =>
  operator === "in"
    ? "[]"
    : operator === "exists" || operator === "isEmpty"
      ? "true"
      : '""';

const assetQuerySourceDefinition = {
  fields: assetQueryStandardFields.map((field) => ({
    path: [field],
    label: field,
    types: assetQueryStandardFieldTypes[field],
  })),
  operators: assetQueryOperators.map((operator) => ({
    value: operator,
    label: operator,
    types: assetObservedFieldType.options.filter((type) =>
      getAssetQueryOperatorsForFieldTypes([type]).includes(operator)
    ),
    input: {
      control:
        operator === "exists" || operator === "isEmpty"
          ? ("none" as const)
          : ("expression" as const),
      defaultValue: getDefaultFilterValue(operator),
    },
  })),
  source: {
    fieldPathSchema: z.toJSONSchema(assetQueryFieldPath, {
      target: "draft-2020-12",
      io: "input",
    }),
    controls: [
      {
        type: "variant" as const,
        key: "output",
        label: "output",
        defaultValue: { mode: "all", includeMetadata: true },
        schema: z.toJSONSchema(assetResourceOutputSelection, {
          target: "draft-2020-12",
          io: "input",
        }),
      },
      {
        type: "variant" as const,
        key: "content",
        label: "content",
        defaultValue: { mode: "none" },
        schema: z.toJSONSchema(assetResourceContentOptions, {
          target: "draft-2020-12",
          io: "input",
        }),
      },
      {
        type: "filter" as const,
        key: "where",
        label: "filters",
        defaultValue: { all: [] },
        combinators: ["all", "any"] as const,
        limits: {
          conditions: assetResourceLimits.filterCount,
          depth: assetResourceLimits.filterDepth,
        },
        defaultCondition: {
          field: ["path"],
          operator: "startsWith" as const,
        },
      },
      {
        type: "sort" as const,
        key: "sort",
        label: "sort",
        defaultValue: [],
        defaultItem: { field: ["name"], direction: "asc" as const },
        max: assetResourceLimits.sortCount,
      },
      {
        type: "expression" as const,
        key: "limit",
        label: "limit",
        defaultValue: String(assetResourceLimits.defaultResultCount),
        input: "number" as const,
        min: 0,
      },
      {
        type: "expression" as const,
        key: "offset",
        label: "offset",
        defaultValue: "0",
        input: "number" as const,
        min: 0,
      },
    ],
  },
} satisfies QuerySourceDefinition<
  AssetObservedFieldType,
  AssetQueryFilter["operator"]
>;

const assetQuerySourceCodec = createQuerySourceCodec<
  AssetObservedFieldType,
  AssetQueryFilter["operator"],
  StructuredAssetQueryResourceConfiguration
>(assetQuerySourceDefinition);

export const parseStructuredAssetQueryResourceBody = (
  body: string | undefined
): StructuredAssetQueryResourceConfiguration | undefined => {
  const request = parseExpressionObject(body ?? "");
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
  output = { mode: "all", includeMetadata: true },
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
