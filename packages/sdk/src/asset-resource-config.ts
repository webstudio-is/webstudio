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
  type AssetQueryResultMode,
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
  result: AssetQueryResultMode;
  where: StructuredAssetQueryWhereBinding;
  sort: AssetQuerySort[];
  limit: string;
  offset: string;
  output: AssetResourceOutputSelection;
  content: AssetResourceContentOptions;
};

type StructuredAssetQueryResourceConfigurationInput = Omit<
  StructuredAssetQueryResourceConfiguration,
  "result"
> & { result?: AssetQueryResultMode };

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
  result: configuration.result,
  where: toContentCompilationWhere(configuration.where),
  sort: configuration.sort,
  limit: toContentCompilationInteger(configuration.limit),
  offset: toContentCompilationInteger(configuration.offset),
  output: configuration.output,
  content: configuration.content,
});

type ReachableAssetContentCompilationPlanInput = {
  props: Iterable<Prop>;
  dataSources: Iterable<DataSource>;
  resources: Iterable<Resource>;
};

export const createReachableAssetContentCompilationPlanResult = ({
  props,
  dataSources,
  resources,
}: ReachableAssetContentCompilationPlanInput): {
  plan: ContentCompilationPlan | undefined;
  issues: readonly Readonly<{ resourceId: string; message: string }>[];
} => {
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
  const issues: Array<{ resourceId: string; message: string }> = [];
  for (const resource of resources) {
    if (
      reachableResourceIds.has(resource.id) === false ||
      isAssetsResource(resource) === false
    ) {
      continue;
    }
    const parsedConfiguration = parseStructuredAssetQueryResourceBodyResult(
      resource.body
    );
    if (parsedConfiguration.success === false) {
      issues.push({
        resourceId: resource.id,
        message: parsedConfiguration.message,
      });
      continue;
    }
    const configuration = parsedConfiguration.value;
    queries.push(
      createAssetContentCompilationQuery({
        resourceId: resource.id,
        configuration,
      })
    );
  }
  return { plan: createContentCompilationPlan(queries), issues };
};

export const createReachableAssetContentCompilationPlan = (
  input: ReachableAssetContentCompilationPlanInput
): ContentCompilationPlan | undefined => {
  const result = createReachableAssetContentCompilationPlanResult(input);
  if (result.issues.length > 0) {
    throw new Error(
      result.issues
        .map(
          ({ resourceId, message }) =>
            `Assets resource ${JSON.stringify(resourceId)} has an invalid query configuration: ${message}`
        )
        .join("\n")
    );
  }
  return result.plan;
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

export const parseStructuredAssetQueryResourceBodyResult = (
  body: string | undefined
):
  | Readonly<{
      success: true;
      value: StructuredAssetQueryResourceConfiguration;
    }>
  | Readonly<{ success: false; message: string }> => {
  const request = parseExpressionObject(body ?? "");
  if (request === undefined) {
    return {
      success: false,
      message: "Stored Assets query body is not a valid object expression.",
    };
  }
  const unsupportedFields = [...request.keys()].filter(
    (field) => field !== "query"
  );
  if (unsupportedFields.length > 0) {
    return {
      success: false,
      message: `Stored Assets query body has ${
        unsupportedFields.length === 1
          ? "an unsupported field"
          : "unsupported fields"
      }: ${unsupportedFields.map((field) => JSON.stringify(field)).join(", ")}.`,
    };
  }
  const query = request.get("query");
  if (query === undefined) {
    return {
      success: false,
      message: 'Stored Assets query body is missing the "query" field.',
    };
  }
  const parsed = assetQuerySourceCodec.parse(query);
  if (parsed.success === false) {
    return {
      success: false,
      message: `Stored Assets query is invalid: ${parsed.message}`,
    };
  }
  if (hasAssetQueryOutput(parsed.value) === false) {
    return {
      success: false,
      message: "Stored Assets query is invalid: Select at least one output.",
    };
  }
  return { success: true, value: parsed.value };
};

export const parseStructuredAssetQueryResourceBody = (
  body: string | undefined
): StructuredAssetQueryResourceConfiguration | undefined => {
  const result = parseStructuredAssetQueryResourceBodyResult(body);
  return result.success ? result.value : undefined;
};

export const createStructuredAssetQueryResourceBody = ({
  result = "many",
  where,
  sort,
  limit,
  offset,
  output = defaultAssetResourceOutputSelection,
  content,
}: StructuredAssetQueryResourceConfigurationInput) => {
  if (hasAssetQueryOutput({ output, content }) === false) {
    throw new Error("Select at least one asset query output");
  }
  const query = assetQuerySourceCodec.format({
    result,
    where,
    sort,
    limit,
    offset,
    output,
    content: assetResourceContentOptions.parse(content),
  });
  const fields = parseExpressionObject(query);
  if (fields === undefined) {
    throw new Error("Assets query could not be serialized");
  }
  if (result !== "many") {
    fields.delete("limit");
    fields.delete("offset");
  }
  return generateObjectExpression(
    new Map([["query", `(${generateObjectExpression(fields)})`]])
  );
};
