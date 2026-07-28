import {
  assetQueryResourceConfigurationInput,
  assetQueryResourceConfigurationPatchInput,
  createStructuredAssetQueryResourceBody,
  isAssetsResource,
  isConfiguredAssetsResource,
  parseStructuredAssetQueryResourceBody,
  SYSTEM_VARIABLE_ID,
  type AssetQueryWhereExpression,
  type Resource,
  type StructuredAssetQueryWhereBinding,
} from "@webstudio-is/sdk";
import { mapQueryWhere } from "@webstudio-is/query-builder";
import { assetsResourceUrl } from "@webstudio-is/sdk/runtime";
import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import {
  createResource,
  normalizeResourceExpressionInput,
  unsetExpressionVariables,
  updateResource,
} from "./data";
import { throwBuilderRuntimeError } from "./errors";
import { paginateOutput, paginatedOutputInputSchema } from "./output";

export const assetsResourceListInput = z.object({
  scopeInstanceId: z.string().optional(),
  ...paginatedOutputInputSchema.shape,
});

export const assetsResourceGetInput = z.object({ resourceId: z.string() });

export const assetsResourceCreateInput = z.object({
  name: z.string().min(1),
  query: assetQueryResourceConfigurationInput.optional(),
  scopeInstanceId: z.string(),
  dataSourceName: z.string().optional(),
});

export const assetsResourceUpdateInput = z.object({
  resourceId: z.string(),
  values: z
    .object({
      name: z.string().min(1).optional(),
      query: assetQueryResourceConfigurationPatchInput.nullable().optional(),
    })
    .refine((values) => Object.keys(values).length > 0, {
      error: "At least one Assets resource value is required.",
    }),
  scopeInstanceId: z.string().optional(),
  dataSourceName: z.string().optional(),
});

const normalizeWhere = (
  where: AssetQueryWhereExpression
): StructuredAssetQueryWhereBinding =>
  mapQueryWhere(where, (condition) => ({
    ...condition,
    value: normalizeResourceExpressionInput(condition.value),
  }));

const createAssetResourceBody = (
  configuration: z.output<typeof assetQueryResourceConfigurationInput>
) =>
  createStructuredAssetQueryResourceBody({
    where: normalizeWhere(configuration.where),
    sort: configuration.sort,
    limit: normalizeResourceExpressionInput(configuration.limit),
    offset: normalizeResourceExpressionInput(configuration.offset),
    output: configuration.output,
    content: configuration.content,
  });

const parseAssetResourceConfiguration = (
  resource: Resource
): ReturnType<typeof parseStructuredAssetQueryResourceBody> => {
  if (isConfiguredAssetsResource(resource) === false) {
    return;
  }
  return parseStructuredAssetQueryResourceBody(resource.body);
};

const serializeWhere = (
  where: StructuredAssetQueryWhereBinding,
  unsetNameById: Map<string, string>
): AssetQueryWhereExpression =>
  mapQueryWhere(where, (condition) => ({
    ...condition,
    value: unsetExpressionVariables({
      expression: condition.value,
      unsetNameById,
    }),
  }));

const serializeAssetResource = ({
  resource,
  state,
}: {
  resource: Resource;
  state: Pick<BuilderState, "dataSources">;
}) => {
  const configuration = parseAssetResourceConfiguration(resource);
  const isStoredQuery = isConfiguredAssetsResource(resource);
  const dataSources = Array.from(state.dataSources?.values() ?? []);
  const unsetNameById = new Map(dataSources.map(({ id, name }) => [id, name]));
  unsetNameById.set(SYSTEM_VARIABLE_ID, "system");
  const dataSource = dataSources.find(
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
              where: serializeWhere(configuration.where, unsetNameById),
              sort: configuration.sort,
              limit: unsetExpressionVariables({
                expression: configuration.limit,
                unsetNameById,
              }),
              offset: unsetExpressionVariables({
                expression: configuration.offset,
                unsetNameById,
              }),
              output: configuration.output,
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
  query?: z.output<typeof assetQueryResourceConfigurationInput>;
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
          where: storedConfiguration.where,
          sort: storedConfiguration.sort,
          limit: storedConfiguration.limit,
          offset: storedConfiguration.offset,
          output: storedConfiguration.output,
          content: storedConfiguration.content,
        };
  const query =
    queryUpdate === undefined
      ? currentQuery
      : queryUpdate === null
        ? undefined
        : assetQueryResourceConfigurationInput.parse({
            ...currentQuery,
            ...queryUpdate,
          });
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
