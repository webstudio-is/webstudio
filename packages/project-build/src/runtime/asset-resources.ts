import {
  assetResourceLimits,
  assetResourceVariableName,
  assetResourceQueryRequest,
  createAssetQueryResourceBody,
  decodeDataSourceVariable,
  isAssetsResource,
  isStoredAssetQueryResource,
  parseAssetQueryResourceBody,
  SYSTEM_VARIABLE_ID,
  transpileExpression,
  type Resource,
} from "@webstudio-is/sdk";
import {
  assetsQueryResourceUrl,
  assetsResourceUrl,
} from "@webstudio-is/sdk/runtime";
import { validateAssetResourceQuery } from "@webstudio-is/asset-resource";
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

export const assetsQueryVariableBindingInput = z.object({
  name: assetResourceVariableName,
  value: resourceExpressionInput,
});

const assetResourceVariableBindingsInput = z
  .array(assetsQueryVariableBindingInput)
  .max(assetResourceLimits.variableCount)
  .superRefine((variables, context) => {
    const names = new Set<string>();
    for (const [index, variable] of variables.entries()) {
      if (names.has(variable.name)) {
        context.addIssue({
          code: "custom",
          path: [index, "name"],
          message: `Duplicate asset query variable "${variable.name}".`,
        });
      }
      names.add(variable.name);
    }
  });

const assetResourceConfigurationFields = {
  query: assetResourceQueryRequest.shape.query.describe(
    "GraphQL query evaluated against the generated Assets schema."
  ),
  variables: assetResourceVariableBindingsInput
    .default([])
    .describe(
      "Runtime GraphQL variables. Each value is a Webstudio expression evaluated in the resource scope."
    ),
};

const refineAssetQueryConfiguration = (
  configuration: {
    query: string;
    variables: readonly { name: string }[];
  },
  context: z.RefinementCtx
) => {
  let variableNames: readonly string[];
  try {
    variableNames = validateAssetResourceQuery(
      configuration.query
    ).variableNames;
  } catch (error) {
    context.addIssue({
      code: "custom",
      path: ["query"],
      message:
        error instanceof Error ? error.message : "Asset query is invalid.",
    });
    return;
  }
  const bindings = new Set(
    configuration.variables.map((variable) => variable.name)
  );
  for (const variableName of variableNames) {
    if (bindings.has(variableName) === false) {
      context.addIssue({
        code: "custom",
        path: ["variables"],
        message: `Asset query variable $${variableName} requires a binding.`,
      });
    }
  }
};

const storedAssetQueryConfigurationInput = z
  .object(assetResourceConfigurationFields)
  .superRefine(refineAssetQueryConfiguration);

export const assetsQueryConfigurationInput = z
  .object({
    graphql: assetResourceConfigurationFields.query,
    variables: assetResourceConfigurationFields.variables,
  })
  .superRefine((configuration, context) =>
    refineAssetQueryConfiguration(
      { query: configuration.graphql, variables: configuration.variables },
      context
    )
  );

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

type AssetResourceConfiguration = z.output<
  typeof storedAssetQueryConfigurationInput
>;
type DecodedAssetResourceConfiguration = Omit<
  AssetResourceConfiguration,
  "variables"
> & {
  variables: Array<{ name: string; value: string }>;
};

const normalizeExpression = (value: z.output<typeof resourceExpressionInput>) =>
  typeof value === "string" ? value : JSON.stringify(value.value);

export const createAssetResourceBody = ({
  query,
  variables,
}: AssetResourceConfiguration) =>
  createAssetQueryResourceBody({
    query,
    variables: variables.map(({ name, value }) => ({
      name,
      value: normalizeExpression(value),
    })),
  });

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

export const parseAssetResourceConfiguration = (
  resource: Resource
): DecodedAssetResourceConfiguration | undefined => {
  if (isStoredAssetQueryResource(resource) === false) {
    return;
  }
  const fields = parseAssetQueryResourceBody(resource.body);
  const parsed = storedAssetQueryConfigurationInput.safeParse({
    query: parseJsonExpression(fields.queryExpression),
    variables: fields.variables,
  });
  if (parsed.success === false) {
    return;
  }
  return {
    ...parsed.data,
    variables: parsed.data.variables.map(({ name, value }) => ({
      name,
      value: normalizeExpression(value),
    })),
  };
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
  const isStoredQuery = isStoredAssetQueryResource(resource);
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
              graphql: configuration.query,
              variables: configuration.variables.map(({ name, value }) => ({
                name,
                value: toPublicExpression({
                  expression: value,
                  dataSources: state.dataSources,
                }),
              })),
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
    url: JSON.stringify(assetsQueryResourceUrl),
    searchParams: [],
    headers: [
      {
        name: "Content-Type",
        value: { type: "literal" as const, value: "application/json" },
      },
    ],
    body: createAssetResourceBody({
      query: query.graphql,
      variables: query.variables,
    }),
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
    isStoredAssetQueryResource(resource) &&
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
          graphql: storedConfiguration.query,
          variables: storedConfiguration.variables,
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
