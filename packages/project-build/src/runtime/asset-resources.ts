import {
  assetQueryFieldPath,
  assetQuerySort,
  assetResourceLimits,
  assetResourceContentOptions,
  createStructuredAssetQueryResourceBody,
  decodeDataSourceVariable,
  isAssetsResource,
  isConfiguredAssetsResource,
  parseStructuredAssetQueryResourceBody,
  SYSTEM_VARIABLE_ID,
  transpileExpression,
  type Resource,
} from "@webstudio-is/sdk";
import { assetsResourceUrl } from "@webstudio-is/sdk/runtime";
import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import {
  createResource,
  resourceExpressionInput,
  updateResource,
} from "./data";
import { throwBuilderRuntimeError } from "./errors";
import { paginateOutput, paginatedOutputInputSchema } from "./output";

const assetQueryValueExpressionInput = resourceExpressionInput.describe(
  'A Webstudio expression evaluated in the resource scope. Use { type: "literal", value: "text" } for a fixed string.'
);

const assetQueryFilterBindingInput = z.object({
  field: assetQueryFieldPath.describe(
    'Indexed file field path, for example ["extension"] or ["properties", "slug"].'
  ),
  operator: z.enum([
    "eq",
    "ne",
    "in",
    "contains",
    "startsWith",
    "endsWith",
    "gt",
    "gte",
    "lt",
    "lte",
    "exists",
    "isEmpty",
  ]),
  value: assetQueryValueExpressionInput,
});

export const assetsQueryConfigurationInput = z.object({
  filters: z
    .array(assetQueryFilterBindingInput)
    .max(assetResourceLimits.filterCount)
    .default([]),
  sort: z.array(assetQuerySort).max(assetResourceLimits.sortCount).default([]),
  limit: resourceExpressionInput.default(
    String(assetResourceLimits.defaultResultCount)
  ),
  offset: resourceExpressionInput.default("0"),
  content: assetResourceContentOptions.default({ mode: "none" }),
});

export const assetsResourceListInput = z.object({
  scopeInstanceId: z.string().optional(),
  ...paginatedOutputInputSchema.shape,
});

export const assetsResourceGetInput = z.object({ resourceId: z.string() });

export const assetsResourceCreateInput = z.object({
  name: z.string().min(1),
  query: assetsQueryConfigurationInput.optional(),
  scopeInstanceId: z.string(),
  dataSourceName: z.string().optional(),
});

export const assetsResourceUpdateInput = z.object({
  resourceId: z.string(),
  values: z
    .object({
      name: z.string().min(1).optional(),
      query: assetsQueryConfigurationInput.nullable().optional(),
    })
    .refine((values) => Object.keys(values).length > 0, {
      error: "At least one Assets resource value is required.",
    }),
  scopeInstanceId: z.string().optional(),
  dataSourceName: z.string().optional(),
});

const normalizeExpression = (value: z.output<typeof resourceExpressionInput>) =>
  typeof value === "string" ? value : JSON.stringify(value.value);

export const createAssetResourceBody = (
  configuration: z.output<typeof assetsQueryConfigurationInput>
) =>
  createStructuredAssetQueryResourceBody({
    filters: configuration.filters.map(({ field, operator, value }) => ({
      field,
      operator,
      value: normalizeExpression(value),
    })),
    sort: configuration.sort,
    limit: normalizeExpression(configuration.limit),
    offset: normalizeExpression(configuration.offset),
    content: configuration.content,
  });

export const parseAssetResourceConfiguration = (
  resource: Resource
): ReturnType<typeof parseStructuredAssetQueryResourceBody> => {
  if (isConfiguredAssetsResource(resource) === false) {
    return;
  }
  return parseStructuredAssetQueryResourceBody(resource.body);
};

const toPublicExpression = ({
  expression,
  dataSources,
}: {
  expression: string;
  dataSources: BuilderState["dataSources"] | undefined;
}) => {
  try {
    return transpileExpression({
      expression,
      replaceVariable: (identifier) => {
        const dataSourceId = decodeDataSourceVariable(identifier);
        if (dataSourceId === SYSTEM_VARIABLE_ID) {
          return "system";
        }
        return dataSourceId === undefined
          ? identifier
          : (dataSources?.get(dataSourceId)?.name ?? identifier);
      },
    });
  } catch {
    return expression;
  }
};

const serializeAssetResource = ({
  resource,
  state,
}: {
  resource: Resource;
  state: Pick<BuilderState, "dataSources">;
}) => {
  const configuration = parseAssetResourceConfiguration(resource);
  const isStoredQuery = isConfiguredAssetsResource(resource);
  const dataSource = Array.from(state.dataSources?.values() ?? []).find(
    (item) => item.type === "resource" && item.resourceId === resource.id
  );
  return {
    resourceId: resource.id,
    name: resource.name,
    scopeInstanceId: dataSource?.scopeInstanceId,
    dataSourceId: dataSource?.id,
    dataSourceName: dataSource?.name,
    mode: (isStoredQuery
      ? configuration === undefined
        ? "invalid"
        : "query"
      : "all") as "all" | "invalid" | "query",
    ...(isStoredQuery && configuration === undefined
      ? {
          configurationError:
            "Stored Assets query configuration could not be decoded.",
        }
      : configuration === undefined
        ? {}
        : {
            query: {
              filters: configuration.filters.map(
                ({ field, operator, value }) => ({
                  field,
                  operator,
                  value: toPublicExpression({
                    expression: value,
                    dataSources: state.dataSources,
                  }),
                })
              ),
              sort: configuration.sort,
              limit: toPublicExpression({
                expression: configuration.limit,
                dataSources: state.dataSources,
              }),
              offset: toPublicExpression({
                expression: configuration.offset,
                dataSources: state.dataSources,
              }),
              content: configuration.content,
            },
          }),
  };
};

export const listAssetsResources = (
  state: Pick<BuilderState, "dataSources" | "resources">,
  input: z.output<typeof assetsResourceListInput>
) => {
  const resources = Array.from(state.resources?.values() ?? [])
    .filter(isAssetsResource)
    .map((resource) => serializeAssetResource({ resource, state }))
    .filter(
      (item) =>
        input.scopeInstanceId === undefined ||
        item.scopeInstanceId === input.scopeInstanceId
    );
  const { items, ...pagination } = paginateOutput({
    items: resources,
    cursor: input.cursor,
    limit: input.limit,
    verbose: input.verbose,
    filters: { scopeInstanceId: input.scopeInstanceId },
  });
  return { resources: items, ...pagination };
};

export const getAssetsResource = (
  state: Pick<BuilderState, "dataSources" | "resources">,
  input: z.output<typeof assetsResourceGetInput>
) => {
  const resource = state.resources?.get(input.resourceId);
  if (resource === undefined || isAssetsResource(resource) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Assets resource not found");
  }
  return { resource: serializeAssetResource({ resource, state }) };
};

const createStoredAssetsResource = ({
  name,
  query,
}: {
  name: string;
  query?: z.output<typeof assetsQueryConfigurationInput>;
}) => {
  if (query === undefined) {
    return {
      name,
      control: "system" as const,
      method: "get" as const,
      url: JSON.stringify(assetsResourceUrl),
      searchParams: [],
      headers: [],
    };
  }
  return {
    name,
    control: "system" as const,
    method: "post" as const,
    url: JSON.stringify(assetsResourceUrl),
    searchParams: [],
    headers: [
      {
        name: "Content-Type",
        value: { type: "literal" as const, value: "application/json" },
      },
    ],
    body: createAssetResourceBody(query),
  };
};

export const createAssetsResource = (
  state: Parameters<typeof createResource>[0],
  input: z.output<typeof assetsResourceCreateInput>,
  context: BuilderRuntimeContext
) => {
  const { name, scopeInstanceId, dataSourceName, query } = input;
  return createResource(
    state,
    {
      resource: createStoredAssetsResource({ name, query }),
      scopeInstanceId,
      dataSourceName: dataSourceName ?? name,
      exposeAsDataSource: true,
    },
    context
  );
};

export const updateAssetsResource = (
  state: Parameters<typeof updateResource>[0],
  input: z.output<typeof assetsResourceUpdateInput>,
  context: BuilderRuntimeContext
) => {
  const resource = state.resources?.get(input.resourceId);
  if (resource === undefined || isAssetsResource(resource) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Assets resource not found");
  }
  const { name, query: queryUpdate } = input.values;
  const storedConfiguration = parseAssetResourceConfiguration(resource);
  if (
    isConfiguredAssetsResource(resource) &&
    storedConfiguration === undefined &&
    queryUpdate === undefined
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Stored Assets query configuration could not be decoded; replace or remove the query to repair it"
    );
  }
  const currentQuery =
    storedConfiguration === undefined
      ? undefined
      : {
          filters: storedConfiguration.filters.map(
            ({ field, operator, value }) => ({ field, operator, value })
          ),
          sort: storedConfiguration.sort,
          limit: storedConfiguration.limit,
          offset: storedConfiguration.offset,
          content: storedConfiguration.content,
        };
  const query =
    queryUpdate === undefined
      ? currentQuery
      : queryUpdate === null
        ? undefined
        : queryUpdate;
  return updateResource(
    state,
    {
      resourceId: input.resourceId,
      values: createStoredAssetsResource({
        name: name ?? resource.name,
        query,
      }),
      scopeInstanceId: input.scopeInstanceId,
      dataSourceName: input.dataSourceName,
      exposeAsDataSource: true,
    },
    context,
    { clearBody: query === undefined }
  );
};
