import {
  type AssetFileDocument,
  type AssetResourceContentOptions,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  normalizeJsonValue,
  serializeJsonDeterministically,
  type JsonPrimitive,
  type JsonValue,
} from "@webstudio-is/project-store/json";
import { parseAssetResourceContentOptions } from "./content-options";
import {
  AssetResourceHydrationError,
  type AssetResourceContentReader,
} from "./hydration";
import {
  AssetContentReadError,
  createAssetContentHydrator,
  type AssetContentHydrator,
} from "./content-hydrator";
import {
  inferAssetPropertiesNode,
  matchesAssetDocument,
  sortAssetDocuments,
  type AssetOrder,
} from "./asset-query-model";

export type AssetQueryPlanValue =
  | JsonPrimitive
  | { kind: "variable"; name: string }
  | readonly AssetQueryPlanValue[]
  | { readonly [key: string]: AssetQueryPlanValue };

export type AssetQueryPlanVariableType =
  | {
      kind: "named";
      name:
        | "String"
        | "ID"
        | "Int"
        | "Float"
        | "Boolean"
        | "JSON"
        | "AssetContentMode"
        | "AssetOrderDirection"
        | "AssetOrderField";
      required: boolean;
    }
  | {
      kind: "list";
      item: AssetQueryPlanVariableType;
      required: boolean;
    };

export type AssetQueryPlanContentOptions = {
  mode: AssetQueryPlanValue;
  offset?: AssetQueryPlanValue;
  length?: AssetQueryPlanValue;
  maxBytes?: AssetQueryPlanValue;
};

export type AssetQueryPlanProjection =
  | {
      kind: "value";
      responseKey: string;
      path: readonly string[];
    }
  | {
      kind: "object";
      responseKey: string;
      path: readonly string[];
      fields: readonly AssetQueryPlanProjection[];
    }
  | {
      kind: "list";
      responseKey: string;
      path: readonly string[];
      fields: readonly AssetQueryPlanProjection[];
    }
  | {
      kind: "content";
      responseKey: string;
      options: AssetQueryPlanContentOptions;
      fields: readonly AssetQueryPlanProjection[];
    };

export type AssetQueryPlanVariable = {
  name: string;
  type: AssetQueryPlanVariableType;
  defaultValue?: JsonValue;
};

type AssetQueryPlanBase = {
  format: "webstudio-asset-query-plan";
  version: 1;
  kind: "asset-detail" | "asset-list";
  queryHash: string;
  assetRevision: string;
  operationName?: string;
  rootResponseKey: string;
  variables: readonly AssetQueryPlanVariable[];
};

export type AssetDetailQueryPlanV1 = AssetQueryPlanBase & {
  kind: "asset-detail";
  lookup: {
    field: "_id" | "path";
    value: AssetQueryPlanValue;
  };
  fields: readonly AssetQueryPlanProjection[];
};

export type AssetListQueryPlanProjection =
  | {
      kind: "value";
      responseKey: string;
      field: "totalCount" | "hasMore";
    }
  | {
      kind: "items";
      responseKey: string;
      fields: readonly AssetQueryPlanProjection[];
    };

export type AssetListQueryPlanV1 = AssetQueryPlanBase & {
  kind: "asset-list";
  where?: AssetQueryPlanValue;
  orderBy: readonly {
    field: readonly string[];
    direction: AssetQueryPlanValue;
  }[];
  first: AssetQueryPlanValue;
  skip: AssetQueryPlanValue;
  fields: readonly AssetListQueryPlanProjection[];
};

export type AssetQueryPlanV1 = AssetDetailQueryPlanV1 | AssetListQueryPlanV1;

const projectionsSelectContent = (fields: unknown): boolean =>
  Array.isArray(fields) &&
  fields.some((field) => {
    if (typeof field !== "object" || field === null) {
      return false;
    }
    const kind = Reflect.get(field, "kind");
    if (kind === "content") {
      return true;
    }
    return (
      (kind === "object" || kind === "list" || kind === "items") &&
      projectionsSelectContent(Reflect.get(field, "fields"))
    );
  });

export const assetQueryPlanSelectsContent = (plan: unknown): boolean =>
  typeof plan === "object" &&
  plan !== null &&
  projectionsSelectContent(Reflect.get(plan, "fields"));

export class AssetQueryPlanExecutionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AssetQueryPlanExecutionError";
  }
}

const graphqlName = /^[_A-Za-z][_0-9A-Za-z]*$/;
const sha256Revision = /^sha256:[a-f0-9]{64}$/;

const validateAssetQueryPlanBase = (
  plan: AssetQueryPlanBase,
  expectedKind: AssetQueryPlanBase["kind"]
) => {
  if (
    plan.format !== "webstudio-asset-query-plan" ||
    plan.version !== 1 ||
    plan.kind !== expectedKind
  ) {
    throw new Error("Asset query plan format is unsupported");
  }
  if (
    sha256Revision.test(plan.queryHash) === false ||
    sha256Revision.test(plan.assetRevision) === false
  ) {
    throw new Error("Asset query plan revision is invalid");
  }
  if (graphqlName.test(plan.rootResponseKey) === false) {
    throw new Error("Asset query plan response key is invalid");
  }
  if (
    plan.operationName !== undefined &&
    graphqlName.test(plan.operationName) === false
  ) {
    throw new Error("Asset query plan operation name is invalid");
  }
  if (Array.isArray(plan.variables) === false) {
    throw new Error("Asset query plan variables are invalid");
  }
  if (plan.variables.length > assetResourceLimits.variableCount) {
    throw new Error("Asset query plan has too many variables");
  }
  const variableNames = new Set<string>();
  const validateVariableType = (
    type: AssetQueryPlanVariableType,
    depth = 0
  ): void => {
    if (
      depth > assetResourceLimits.queryAstDepth ||
      typeof type !== "object" ||
      type === null ||
      typeof type.required !== "boolean"
    ) {
      throw new Error("Asset query plan variable type is invalid");
    }
    if (type.kind === "list") {
      validateVariableType(type.item, depth + 1);
      return;
    }
    if (
      type.kind !== "named" ||
      [
        "String",
        "ID",
        "Int",
        "Float",
        "Boolean",
        "JSON",
        "AssetContentMode",
        "AssetOrderDirection",
        "AssetOrderField",
      ].includes(type.name) === false
    ) {
      throw new Error("Asset query plan variable type is invalid");
    }
  };
  for (const variable of plan.variables) {
    if (
      typeof variable !== "object" ||
      variable === null ||
      graphqlName.test(variable.name) === false ||
      variableNames.has(variable.name)
    ) {
      throw new Error("Asset query plan variables are invalid");
    }
    variableNames.add(variable.name);
    validateVariableType(variable.type);
    if (variable.defaultValue !== undefined) {
      normalizeJsonValue(variable.defaultValue);
    }
  }
  const validateValue = (value: AssetQueryPlanValue, depth = 0): void => {
    if (depth > assetResourceLimits.queryAstDepth) {
      throw new Error("Asset query plan value exceeds the depth limit");
    }
    const possibleVariable = value as {
      readonly kind?: unknown;
      readonly name?: unknown;
    };
    if (
      typeof value === "object" &&
      value !== null &&
      Array.isArray(value) === false &&
      possibleVariable.kind === "variable"
    ) {
      if (
        typeof possibleVariable.name !== "string" ||
        variableNames.has(possibleVariable.name) === false
      ) {
        throw new Error("Asset query plan references an undeclared variable");
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        validateValue(item, depth + 1);
      }
      return;
    }
    if (typeof value === "object" && value !== null) {
      for (const item of Object.values(value)) {
        validateValue(item, depth + 1);
      }
      return;
    }
    normalizeJsonValue(value);
  };
  let nodeCount = 0;
  const validateFields = (
    fields: readonly AssetQueryPlanProjection[],
    depth: number
  ) => {
    if (Array.isArray(fields) === false) {
      throw new Error("Asset query plan projections are invalid");
    }
    if (depth > assetResourceLimits.queryAstDepth) {
      throw new Error("Asset query plan exceeds the depth limit");
    }
    const responseKeys = new Set<string>();
    for (const field of fields) {
      nodeCount += 1;
      if (nodeCount > assetResourceLimits.queryAstNodes) {
        throw new Error("Asset query plan exceeds the node limit");
      }
      if (
        typeof field !== "object" ||
        field === null ||
        graphqlName.test(field.responseKey) === false ||
        responseKeys.has(field.responseKey) ||
        (field.kind !== "value" &&
          field.kind !== "object" &&
          field.kind !== "list" &&
          field.kind !== "content")
      ) {
        throw new Error("Asset query plan projections are invalid");
      }
      responseKeys.add(field.responseKey);
      if (
        field.kind !== "content" &&
        (Array.isArray(field.path) === false ||
          field.path.some((segment: unknown) => typeof segment !== "string"))
      ) {
        throw new Error("Asset query plan projection path is invalid");
      }
      if (field.kind === "value") {
        continue;
      }
      if (field.kind === "content") {
        if (typeof field.options !== "object" || field.options === null) {
          throw new Error("Asset query plan content options are invalid");
        }
        validateValue(field.options.mode);
        for (const option of [
          field.options.offset,
          field.options.length,
          field.options.maxBytes,
        ]) {
          if (option !== undefined) {
            validateValue(option);
          }
        }
      }
      validateFields(field.fields, depth + 1);
    }
  };
  return { validateValue, validateFields };
};

export const validateAssetDetailQueryPlan = (plan: AssetDetailQueryPlanV1) => {
  const { validateValue, validateFields } = validateAssetQueryPlanBase(
    plan,
    "asset-detail"
  );
  if (
    typeof plan.lookup !== "object" ||
    plan.lookup === null ||
    (plan.lookup.field !== "_id" && plan.lookup.field !== "path")
  ) {
    throw new Error("Asset query plan lookup is invalid");
  }
  validateValue(plan.lookup.value);
  validateFields(plan.fields, 1);
};

export const validateAssetListQueryPlan = (plan: AssetListQueryPlanV1) => {
  const { validateValue, validateFields } = validateAssetQueryPlanBase(
    plan,
    "asset-list"
  );
  if (plan.where !== undefined) {
    validateValue(plan.where);
  }
  validateValue(plan.first);
  validateValue(plan.skip);
  if (Array.isArray(plan.orderBy) === false) {
    throw new Error("Asset query plan ordering is invalid");
  }
  for (const order of plan.orderBy) {
    if (
      typeof order !== "object" ||
      order === null ||
      Array.isArray(order.field) === false ||
      order.field.length === 0 ||
      order.field.some((segment: unknown) => typeof segment !== "string")
    ) {
      throw new Error("Asset query plan ordering is invalid");
    }
    validateValue(order.direction);
  }
  if (Array.isArray(plan.fields) === false) {
    throw new Error("Asset query plan connection projections are invalid");
  }
  const responseKeys = new Set<string>();
  for (const field of plan.fields) {
    if (
      typeof field !== "object" ||
      field === null ||
      graphqlName.test(field.responseKey) === false ||
      responseKeys.has(field.responseKey) ||
      (field.kind !== "value" && field.kind !== "items") ||
      (field.kind === "value" &&
        field.field !== "totalCount" &&
        field.field !== "hasMore")
    ) {
      throw new Error("Asset query plan connection projections are invalid");
    }
    responseKeys.add(field.responseKey);
    if (field.kind === "items") {
      validateFields(field.fields, 1);
    }
  }
};

const coerceVariable = ({
  value,
  type,
  name,
}: {
  value: JsonValue;
  type: AssetQueryPlanVariableType;
  name: string;
}): JsonValue => {
  if (value === null) {
    if (type.required) {
      throw new Error(`Asset query variable $${name} cannot be null`);
    }
    return null;
  }
  if (type.kind === "list") {
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) =>
      coerceVariable({ value: item, type: type.item, name })
    );
  }
  const valid =
    type.name === "JSON"
      ? true
      : type.name === "String"
        ? typeof value === "string"
        : type.name === "ID"
          ? typeof value === "string" ||
            (typeof value === "number" && Number.isSafeInteger(value))
          : type.name === "Int"
            ? typeof value === "number" &&
              Number.isInteger(value) &&
              value >= -2_147_483_648 &&
              value <= 2_147_483_647
            : type.name === "Float"
              ? typeof value === "number" && Number.isFinite(value)
              : type.name === "Boolean"
                ? typeof value === "boolean"
                : type.name === "AssetContentMode"
                  ? ["FULL", "RANGE", "MARKDOWN_BODY"].includes(value as string)
                  : type.name === "AssetOrderDirection"
                    ? ["ASC", "DESC"].includes(value as string)
                    : typeof value === "string";
  if (valid === false) {
    throw new Error(`Asset query variable $${name} has an invalid value`);
  }
  return type.name === "ID" && typeof value === "number"
    ? String(value)
    : value;
};

const getPathValue = (value: unknown, path: readonly string[]) => {
  let current = value;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) {
      return;
    }
    current = (current as Readonly<Record<string, unknown>>)[segment];
  }
  return current;
};

const missingVariable = Symbol("missing asset query variable");

const resolveValue = (
  value: AssetQueryPlanValue,
  variables: Readonly<Record<string, JsonValue>>
): JsonValue | typeof missingVariable => {
  const possibleVariable = value as {
    readonly kind?: unknown;
    readonly name?: unknown;
  };
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray(value) === false &&
    possibleVariable.kind === "variable" &&
    typeof possibleVariable.name === "string"
  ) {
    if (Object.hasOwn(variables, possibleVariable.name) === false) {
      return missingVariable;
    }
    return variables[possibleVariable.name];
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      const resolved = resolveValue(item, variables);
      return resolved === missingVariable ? null : resolved;
    });
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, JsonValue> = Object.create(null);
    for (const [name, item] of Object.entries(value)) {
      const resolved = resolveValue(item, variables);
      if (resolved !== missingVariable) {
        result[name] = resolved;
      }
    }
    return result;
  }
  return value;
};

const resolveOptionalValue = (
  value: AssetQueryPlanValue | undefined,
  variables: Readonly<Record<string, JsonValue>>
) => {
  if (value === undefined) {
    return;
  }
  const resolved = resolveValue(value, variables);
  return resolved === missingVariable ? undefined : resolved;
};

const prepareVariables = ({
  plan,
  variables,
}: {
  plan: AssetQueryPlanBase;
  variables: Readonly<Record<string, unknown>>;
}) => {
  if (Object.keys(variables).length > assetResourceLimits.variableCount) {
    throw new Error("Asset query has too many variables");
  }
  const normalized = normalizeJsonValue(variables);
  if (
    typeof normalized !== "object" ||
    normalized === null ||
    Array.isArray(normalized)
  ) {
    throw new Error("Asset query variables must be a JSON object");
  }
  const normalizedVariables = normalized as Readonly<Record<string, JsonValue>>;
  if (
    new TextEncoder().encode(serializeJsonDeterministically(normalized))
      .byteLength > assetResourceLimits.variableBytes
  ) {
    throw new Error("Asset query variables exceed the JSON byte limit");
  }
  const prepared: Record<string, JsonValue> = {};
  const definitions = new Map(
    plan.variables.map((variable) => [variable.name, variable])
  );
  for (const name of Object.keys(normalizedVariables)) {
    if (definitions.has(name) === false) {
      throw new Error(`Asset query variable $${name} is not declared`);
    }
  }
  for (const definition of plan.variables) {
    const value = normalizedVariables[definition.name];
    if (value !== undefined) {
      prepared[definition.name] = coerceVariable({
        value,
        type: definition.type,
        name: definition.name,
      });
    } else if (definition.defaultValue !== undefined) {
      prepared[definition.name] = coerceVariable({
        value: definition.defaultValue,
        type: definition.type,
        name: definition.name,
      });
    } else if (definition.type.required) {
      throw new Error(`Asset query variable $${definition.name} is required`);
    }
  }
  if (
    new TextEncoder().encode(serializeJsonDeterministically(prepared))
      .byteLength > assetResourceLimits.variableBytes
  ) {
    throw new Error("Asset query variables exceed the JSON byte limit");
  }
  return prepared;
};

const parseContentOptions = (
  options: AssetQueryPlanContentOptions,
  variables: Readonly<Record<string, JsonValue>>
): Exclude<AssetResourceContentOptions, { mode: "none" }> => {
  const modeValue = resolveValue(options.mode, variables);
  const mode =
    modeValue === missingVariable || modeValue === "FULL"
      ? "full"
      : modeValue === "RANGE"
        ? "range"
        : modeValue === "MARKDOWN_BODY"
          ? "markdown-body"
          : modeValue;
  const offset = resolveOptionalValue(options.offset, variables);
  const length = resolveOptionalValue(options.length, variables);
  const maxBytes = resolveOptionalValue(options.maxBytes, variables);
  if (
    (mode === "range" && maxBytes !== undefined) ||
    (mode !== "range" && (offset !== undefined || length !== undefined))
  ) {
    throw new Error("Compiled asset content arguments are invalid");
  }
  const parsed = parseAssetResourceContentOptions(
    mode === "range"
      ? {
          mode,
          offset,
          length,
        }
      : {
          mode,
          maxBytes,
        }
  );
  if (parsed === undefined || parsed.mode === "none") {
    throw new Error("Compiled asset content arguments are invalid");
  }
  return parsed;
};

type QueryPlanExecutionContext = {
  hydrateContent: AssetContentHydrator;
};

const hydrateContent = ({
  document,
  options,
  context,
}: {
  document: AssetFileDocument;
  options: Exclude<AssetResourceContentOptions, { mode: "none" }>;
  context: QueryPlanExecutionContext;
}) => {
  return context.hydrateContent(document, options) as Promise<JsonValue>;
};

const projectFields = async ({
  value,
  fields,
  document,
  variables,
  context,
}: {
  value: unknown;
  fields: readonly AssetQueryPlanProjection[];
  document: AssetFileDocument;
  variables: Readonly<Record<string, JsonValue>>;
  context: QueryPlanExecutionContext;
}): Promise<Record<string, JsonValue>> => {
  const result: Record<string, JsonValue> = Object.create(null);
  for (const field of fields) {
    if (field.kind === "value") {
      result[field.responseKey] =
        (getPathValue(value, field.path) as JsonValue | undefined) ?? null;
      continue;
    }
    if (field.kind === "object") {
      const child = getPathValue(value, field.path);
      result[field.responseKey] =
        child === undefined || child === null
          ? null
          : await projectFields({
              value: child,
              fields: field.fields,
              document,
              variables,
              context,
            });
      continue;
    }
    if (field.kind === "list") {
      const child = getPathValue(value, field.path);
      result[field.responseKey] = Array.isArray(child)
        ? await Promise.all(
            child.map((item) =>
              item === null
                ? null
                : projectFields({
                    value: item,
                    fields: field.fields,
                    document,
                    variables,
                    context,
                  })
            )
          )
        : null;
      continue;
    }
    const content = await hydrateContent({
      document,
      options: parseContentOptions(field.options, variables),
      context,
    });
    result[field.responseKey] = await projectFields({
      value: content,
      fields: field.fields,
      document,
      variables,
      context,
    });
  }
  return result;
};

const createExecutionContext = (
  read: AssetResourceContentReader | undefined
): QueryPlanExecutionContext => ({
  hydrateContent: createAssetContentHydrator(read),
});

const assertExecutionInput = ({
  plan,
  documents,
  assetRevision,
  operationName,
}: {
  plan: AssetQueryPlanBase;
  documents: readonly AssetFileDocument[];
  assetRevision: string;
  operationName?: string;
}) => {
  if (plan.assetRevision !== assetRevision) {
    throw new Error("Asset query plan is stale");
  }
  if (documents.length > assetResourceLimits.candidateDocuments) {
    throw new Error("Asset query document limit was exceeded");
  }
  if (operationName !== undefined && operationName !== plan.operationName) {
    throw new Error("Asset query operation does not match the published plan");
  }
};

const assertResultSize = (result: Readonly<Record<string, JsonValue>>) => {
  if (
    new TextEncoder().encode(serializeJsonDeterministically(result))
      .byteLength > assetResourceLimits.resultBytes
  ) {
    throw new Error("Asset query result exceeds the byte limit");
  }
};

export const executeAssetDetailQueryPlan = async ({
  plan,
  documents,
  assetRevision,
  variables = {},
  operationName,
  read,
}: {
  plan: AssetDetailQueryPlanV1;
  documents: readonly AssetFileDocument[];
  assetRevision: string;
  variables?: Readonly<Record<string, unknown>>;
  operationName?: string;
  read?: AssetResourceContentReader;
}): Promise<Record<string, JsonValue>> => {
  validateAssetDetailQueryPlan(plan);
  assertExecutionInput({
    plan,
    documents,
    assetRevision,
    operationName,
  });
  const preparedVariables = prepareVariables({ plan, variables });
  let lookup = resolveValue(plan.lookup.value, preparedVariables);
  if (lookup === missingVariable) {
    throw new Error("Provide exactly one of asset id or path");
  }
  if (lookup === null) {
    const result: Record<string, JsonValue> = Object.create(null);
    result[plan.rootResponseKey] = null;
    return result;
  }
  if (
    plan.lookup.field === "_id" &&
    typeof lookup === "number" &&
    Number.isSafeInteger(lookup)
  ) {
    lookup = String(lookup);
  }
  if (typeof lookup !== "string") {
    throw new Error("Asset detail lookup must be a string");
  }
  const matches = documents.filter(
    (document) => document[plan.lookup.field] === lookup
  );
  if (matches.length > 1) {
    throw new Error("Asset identity is ambiguous");
  }
  const document = matches[0];
  const result: Record<string, JsonValue> = Object.create(null);
  result[plan.rootResponseKey] =
    document === undefined
      ? null
      : await projectFields({
          value: document,
          fields: plan.fields,
          document,
          variables: preparedVariables,
          context: createExecutionContext(read),
        });
  assertResultSize(result);
  return result;
};

export const executeAssetListQueryPlan = async ({
  plan,
  documents,
  assetRevision,
  variables = {},
  operationName,
  read,
}: {
  plan: AssetListQueryPlanV1;
  documents: readonly AssetFileDocument[];
  assetRevision: string;
  variables?: Readonly<Record<string, unknown>>;
  operationName?: string;
  read?: AssetResourceContentReader;
}): Promise<Record<string, JsonValue>> => {
  validateAssetListQueryPlan(plan);
  assertExecutionInput({
    plan,
    documents,
    assetRevision,
    operationName,
  });
  const preparedVariables = prepareVariables({ plan, variables });
  const resolvedFirst = resolveValue(plan.first, preparedVariables);
  const resolvedSkip = resolveValue(plan.skip, preparedVariables);
  const first =
    resolvedFirst === missingVariable
      ? assetResourceLimits.defaultResultCount
      : resolvedFirst;
  const skip = resolvedSkip === missingVariable ? 0 : resolvedSkip;
  if (
    typeof first !== "number" ||
    Number.isSafeInteger(first) === false ||
    first < 0 ||
    first > assetResourceLimits.resultCount ||
    typeof skip !== "number" ||
    Number.isSafeInteger(skip) === false ||
    skip < 0 ||
    skip > assetResourceLimits.candidateDocuments
  ) {
    throw new Error("Asset pagination is outside the supported limits");
  }
  const where =
    plan.where === undefined
      ? undefined
      : resolveValue(plan.where, preparedVariables);
  if (where === missingVariable) {
    throw new Error("Asset query filter is invalid");
  }
  const propertiesNode = inferAssetPropertiesNode(documents);
  const matching = documents.filter((document) =>
    matchesAssetDocument(document, propertiesNode, where)
  );
  const orders: AssetOrder[] = plan.orderBy.map((order) => {
    const direction = resolveValue(order.direction, preparedVariables);
    if (
      direction !== missingVariable &&
      direction !== "ASC" &&
      direction !== "DESC"
    ) {
      throw new Error("Asset query ordering is invalid");
    }
    return {
      field: order.field,
      direction: direction === "DESC" ? -1 : 1,
    };
  });
  const selected = sortAssetDocuments(matching, orders).slice(
    skip,
    skip + first
  );
  const context = createExecutionContext(read);
  const connection: Record<string, JsonValue> = Object.create(null);
  for (const field of plan.fields) {
    if (field.kind === "value") {
      connection[field.responseKey] =
        field.field === "totalCount"
          ? matching.length
          : skip + first < matching.length;
      continue;
    }
    connection[field.responseKey] = await Promise.all(
      selected.map((document) =>
        projectFields({
          value: document,
          fields: field.fields,
          document,
          variables: preparedVariables,
          context,
        })
      )
    );
  }
  const result: Record<string, JsonValue> = Object.create(null);
  result[plan.rootResponseKey] = connection;
  assertResultSize(result);
  return result;
};

export const executeAssetQueryPlan = async ({
  plan,
  documents,
  assetRevision,
  variables,
  operationName,
  read,
}: {
  plan: AssetQueryPlanV1;
  documents: readonly AssetFileDocument[];
  assetRevision: string;
  variables?: Readonly<Record<string, unknown>>;
  operationName?: string;
  read?: AssetResourceContentReader;
}) => {
  try {
    return plan.kind === "asset-detail"
      ? await executeAssetDetailQueryPlan({
          plan,
          documents,
          assetRevision,
          variables,
          operationName,
          read,
        })
      : await executeAssetListQueryPlan({
          plan,
          documents,
          assetRevision,
          variables,
          operationName,
          read,
        });
  } catch (error) {
    if (
      error instanceof AssetResourceHydrationError ||
      error instanceof AssetContentReadError
    ) {
      throw error;
    }
    throw new AssetQueryPlanExecutionError(
      error instanceof Error ? error.message : "Asset query execution failed",
      { cause: error }
    );
  }
};
