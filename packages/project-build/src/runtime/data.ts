import {
  type Asset,
  collectionComponent,
  dataSourceVariableValue,
  decodeDataVariableId,
  decodeDataSourceVariable,
  encodeDataVariableId,
  encodeDataSourceVariable,
  findTreeInstanceIds,
  findTreeInstanceIdsExcludingSlotDescendants,
  getAllPages,
  getExpressionIdentifiers,
  getStyleDeclKey,
  isLiteralExpression,
  ROOT_INSTANCE_ID,
  resource,
  SYSTEM_VARIABLE_ID,
  systemParameter,
  transpileExpression,
  type DataSource,
  type DataSources,
  type Instance,
  type Instances,
  type Pages,
  type Prop,
  type Props,
  type Resource,
  type Resources,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { z } from "zod";
import { produceWithPatches } from "immer";
import {
  createJsonStringifyProxy,
  isLocalResource,
  isPlainObject,
} from "@webstudio-is/sdk/runtime";
import type { CompactBuild } from "../types";
import {
  compactBuilderPatchPayload,
  type BuilderPatchChange,
} from "../contracts/patch";
import { createBuilderPatchPayloadFromImmerPatches } from "../state/patch";
import type { BuilderState } from "../state/builder-state";
import "../state/immer";
import type { BuilderRuntimeContext } from "./context";
import {
  addZodValidationIssue,
  formatValidationIssueMessages,
  prefixValidationIssuePaths,
  throwBuilderRuntimeError,
  throwBuilderValidationError,
  type SemanticValidationIssue,
} from "./errors";
import { getStaticStringLiteral, replaceTextValue } from "./text-replacement";
import {
  getNamedExpressionErrors,
  getNamedExpressionValidationIssues,
  getExpressionWarnings,
  hasExpressionDiagnostics,
} from "./expression-validation";
import { runtimeGeneratedIdInput } from "./generated-id-input";
import { createRuntimeMutation } from "./mutation";
import {
  createPropUpsertPayload,
  createValidatedPropValueFromInput,
  findProp,
} from "./props";

const getRequiredDataSources = (state: Pick<BuilderState, "dataSources">) => {
  if (state.dataSources === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Data sources namespace is missing"
    );
  }
  return state.dataSources;
};

const getRequiredResources = (state: Pick<BuilderState, "resources">) => {
  if (state.resources === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Resources namespace is missing"
    );
  }
  return state.resources;
};

const getRequiredProps = (state: Pick<BuilderState, "props">) => {
  if (state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Props namespace is missing"
    );
  }
  return state.props;
};

const getRequiredBuildData = (
  state: Pick<
    BuilderState,
    | "pages"
    | "instances"
    | "props"
    | "dataSources"
    | "resources"
    | "breakpoints"
    | "styleSources"
    | "styleSourceSelections"
    | "styles"
  >
) => {
  const missing = (
    [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
      "breakpoints",
      "styleSources",
      "styleSourceSelections",
      "styles",
    ] as const
  ).find((namespace) => state[namespace] === undefined);
  if (missing !== undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `${missing} namespace is missing`
    );
  }
  return {
    pages: state.pages!,
    instances: Array.from(state.instances!.values()),
    props: Array.from(state.props!.values()),
    dataSources: Array.from(state.dataSources!.values()),
    resources: Array.from(state.resources!.values()),
    breakpoints: Array.from(state.breakpoints!.values()),
    styleSources: Array.from(state.styleSources!.values()),
    styleSourceSelections: Array.from(state.styleSourceSelections!.values()),
    styles: Array.from(state.styles!.values()),
  };
};

export const findDataVariable = (
  dataSources: Iterable<DataSource>,
  dataSourceId: DataSource["id"]
) => {
  for (const dataSource of dataSources) {
    if (dataSource.id === dataSourceId && dataSource.type === "variable") {
      return dataSource;
    }
  }
};

export const serializeDataVariables = ({
  dataSources,
  scopeInstanceId,
}: {
  dataSources: Iterable<DataSource> | Map<string, DataSource>;
  scopeInstanceId?: Instance["id"];
}) => ({
  variables: (dataSources instanceof Map
    ? Array.from(dataSources.values())
    : Array.from(dataSources)
  )
    .filter((dataSource) => dataSource.type === "variable")
    .filter(
      (dataSource) =>
        scopeInstanceId === undefined ||
        dataSource.scopeInstanceId === scopeInstanceId
    )
    .map((dataSource) => ({
      id: dataSource.id,
      name: dataSource.name,
      scopeInstanceId: dataSource.scopeInstanceId,
      value: dataSource.value,
    })),
});

export const listDataVariables = (
  state: Pick<BuilderState, "dataSources">,
  input: { scopeInstanceId?: string } = {}
) =>
  serializeDataVariables({
    dataSources: getRequiredDataSources(state),
    scopeInstanceId: input.scopeInstanceId,
  });

export const dataVariableValueInput = dataSourceVariableValue;

export const dataVariableCreateInput = z.object({
  dataSourceId: runtimeGeneratedIdInput,
  scopeInstanceId: z.string(),
  name: z.string().min(1),
  value: dataVariableValueInput,
});

export const dataVariableUpdateInput = z.object({
  dataSourceId: z.string(),
  values: z.object({
    scopeInstanceId: z.string().optional(),
    name: z.string().min(1).optional(),
    value: dataVariableValueInput.optional(),
  }),
});

export const dataVariableDeleteInput = z.object({
  dataSourceId: z.string(),
});

export const dataVariableDeleteUnusedInput = z.object({});

type DataVariable = Extract<DataSource, { type: "variable" }>;
type DataVariableValue = DataVariable["value"];
export type DataVariableValueType = DataVariableValue["type"];

export type DataVariableNameError = {
  type: "required" | "duplicate";
  message: string;
};

export const validateDataVariableNameWithSources = ({
  dataSources,
  name,
  variableId,
  scopeInstanceId,
}: {
  dataSources: Iterable<DataSource>;
  name: string;
  variableId?: DataSource["id"];
  scopeInstanceId?: Instance["id"];
}): DataVariableNameError | undefined => {
  if (name.trim().length === 0) {
    return {
      type: "required",
      message: "Variable name is required",
    };
  }

  for (const dataSource of dataSources) {
    if (
      dataSource.type === "variable" &&
      dataSource.scopeInstanceId === scopeInstanceId &&
      dataSource.name === name &&
      dataSource.id !== variableId
    ) {
      return {
        type: "duplicate",
        message: "Name is already used by another variable on this instance",
      };
    }
  }
};

export const validateDataVariableNumberValue = (value: string | number) => {
  if (typeof value === "string" && value.length === 0) {
    return "Value expects a number";
  }
  const number = Number(value);
  return Number.isNaN(number) ? "Invalid number" : "";
};

export const getDataVariableJsonExpressionErrors = (expression: string) => {
  return getNamedExpressionErrors("value", expression);
};

export const validateDataVariableJsonValue = (expression: string) => {
  return getDataVariableJsonExpressionErrors(expression).length > 0 ||
    hasExpressionDiagnostics({ expression })
    ? "error"
    : "";
};

export const parseDataVariableJsonExpression = (expression: string) => {
  try {
    const executableExpression = transpileExpression({
      expression,
      executable: true,
    });
    return eval(`(${executableExpression})`);
  } catch {
    return undefined;
  }
};

export const validateDataVariableStringArrayValue = (expression: string) => {
  const expressionError = validateDataVariableJsonValue(expression);
  if (expressionError) {
    return expressionError;
  }
  const value = parseDataVariableJsonExpression(expression);
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? ""
    : "Value expects a JSON array of strings";
};

export const createDataVariableValueFromInput = ({
  type,
  value,
}: {
  type: DataVariableValueType;
  value: string | null;
}): DataVariableValue => {
  if (type === "string") {
    return { type: "string", value: value ?? "" };
  }
  if (type === "number") {
    return { type: "number", value: Number(value || 0) };
  }
  if (type === "boolean") {
    return { type: "boolean", value: value !== null };
  }
  if (type === "string[]") {
    return dataSourceVariableValue.parse({
      type: "string[]",
      value: value === null ? [] : parseDataVariableJsonExpression(value),
    });
  }
  const parsedValue = value ? parseDataVariableJsonExpression(value) : null;
  return {
    type: "json",
    value: parsedValue ?? null,
  };
};

const allowedJsChars = /[A-Za-z_]/;
const compiledExpressionCacheLimit = 10_000;
type CompiledExpression = (variables: {
  get: (key: DataSource["name"]) => unknown;
  // Dynamic expressions intentionally preserve the historical `any` result.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) => any;

const compiledExpressionCache = new Map<string, CompiledExpression>();

const setUnion = <Item>(current: Set<Item>, other: Set<Item>) => {
  const result = new Set<Item>(current);
  for (const item of other) {
    result.add(item);
  }
  return result;
};

const getCompiledExpression = (expression: string) => {
  const cached = compiledExpressionCache.get(expression);
  if (cached) {
    return cached;
  }

  const usedVariables = new Map<string, DataSource["name"]>();
  const transpiled = transpileExpression({
    expression,
    executable: true,
    replaceVariable: (identifier) => {
      const id = decodeDataVariableId(identifier);
      if (id) {
        usedVariables.set(identifier, id);
      } else {
        const name = decodeDataVariableName(identifier);
        usedVariables.set(identifier, name);
      }
    },
  });
  let code = "";
  for (const [identifier, name] of usedVariables) {
    code += `let ${identifier} = _variables.get(${JSON.stringify(name)});\n`;
  }
  code += `return (${transpiled})`;

  const compiledExpression = new Function(
    "_variables",
    code
  ) as CompiledExpression;
  compiledExpressionCache.set(expression, compiledExpression);
  if (compiledExpressionCache.size > compiledExpressionCacheLimit) {
    const oldestExpression = compiledExpressionCache.keys().next().value;
    if (oldestExpression !== undefined) {
      compiledExpressionCache.delete(oldestExpression);
    }
  }
  return compiledExpression;
};

export const encodeDataVariableName = (name: string) => {
  let encodedName = "";
  for (let index = 0; index < name.length; index += 1) {
    const char = name[index];
    encodedName += allowedJsChars.test(char)
      ? char
      : `$${char.codePointAt(0)}$`;
  }
  return encodedName;
};

export const decodeDataVariableName = (identifier: string) => {
  const name = identifier.replaceAll(/\$(\d+)\$/g, (_match, code) =>
    String.fromCodePoint(code)
  );
  return name;
};

export const unsetExpressionVariables = ({
  expression,
  unsetNameById,
}: {
  expression: string;
  unsetNameById: Map<DataSource["id"], DataSource["name"]>;
}) => {
  try {
    return transpileExpression({
      expression,
      replaceVariable: (identifier) => {
        const id = decodeDataVariableId(identifier);
        if (id) {
          const name = unsetNameById.get(id);
          if (name) {
            return encodeDataVariableName(name);
          }
        }
        return identifier;
      },
    });
  } catch {
    return expression;
  }
};

export const restoreExpressionVariables = ({
  expression,
  maskedIdByName,
}: {
  expression: string;
  maskedIdByName: Map<DataSource["name"], DataSource["id"]>;
}) => {
  try {
    return transpileExpression({
      expression,
      replaceVariable: (identifier) => {
        const name = decodeDataVariableName(identifier);
        if (name) {
          const id = maskedIdByName.get(name);
          if (id) {
            return encodeDataVariableId(id);
          }
        }
        return identifier;
      },
    });
  } catch {
    return expression;
  }
};

export const replaceDataSourcesInExpression = (
  expression: string,
  replacements: Map<DataSource["id"], DataSource["id"]>
) => {
  return transpileExpression({
    expression,
    executable: true,
    replaceVariable: (identifier) => {
      const dataSourceId = decodeDataSourceVariable(identifier);
      if (dataSourceId === undefined) {
        return;
      }
      return encodeDataSourceVariable(
        replacements.get(dataSourceId) ?? dataSourceId
      );
    },
  });
};

export const computeExpression = (
  expression: string,
  variables: Map<DataSource["name"], unknown>
) => {
  try {
    const proxiedVariables = new Map<DataSource["name"], unknown>();
    const getVariable = (key: DataSource["name"]) => {
      if (proxiedVariables.has(key)) {
        return proxiedVariables.get(key);
      }
      const value = variables.get(key);
      const proxiedValue = isPlainObject(value)
        ? createJsonStringifyProxy(
            Object.isFrozen(value) ? structuredClone(value) : value
          )
        : value;
      proxiedVariables.set(key, proxiedValue);
      return proxiedValue;
    };

    const result = getCompiledExpression(expression)({ get: getVariable });
    return result;
  } catch {
    return undefined;
  }
};

export const computeExpressionWithinScope = (
  expression: string,
  scope: Record<string, unknown>
) => {
  if (expression.trim() === "") {
    return;
  }
  const variables = new Map<DataSource["name"], unknown>();
  for (const [name, value] of Object.entries(scope)) {
    const decodedName = decodeDataSourceVariable(name);
    if (decodedName !== undefined) {
      variables.set(decodedName, value);
    }
  }
  return computeExpression(expression, variables);
};

const getParentInstanceById = (instances: Instances) => {
  const parentInstanceById = new Map<Instance["id"], Instance["id"]>();
  for (const instance of instances.values()) {
    if (instance.component === "Slot") {
      continue;
    }
    for (const child of instance.children ?? []) {
      if (child.type === "id") {
        parentInstanceById.set(child.value, instance.id);
      }
    }
  }
  return parentInstanceById;
};

const getDataSourcesByScopeInstanceId = (dataSources: DataSources) => {
  const dataSourcesByScopeInstanceId = new Map<
    Instance["id"],
    Array<DataSource>
  >();
  for (const dataSource of dataSources.values()) {
    const instanceId = dataSource.scopeInstanceId ?? ROOT_INSTANCE_ID;
    const dataSourcesByScope =
      dataSourcesByScopeInstanceId.get(instanceId) ?? [];
    dataSourcesByScope.push(dataSource);
    dataSourcesByScopeInstanceId.set(instanceId, dataSourcesByScope);
  }
  return dataSourcesByScopeInstanceId;
};

const findMaskedVariablesByInstanceId = ({
  startingInstanceId,
  parentInstanceById,
  instances,
  dataSources,
  dataSourcesByScopeInstanceId = getDataSourcesByScopeInstanceId(dataSources),
}: {
  startingInstanceId: Instance["id"];
  parentInstanceById: Map<Instance["id"], Instance["id"]>;
  instances: Instances;
  dataSources: DataSources;
  dataSourcesByScopeInstanceId?: Map<Instance["id"], Array<DataSource>>;
}) => {
  let currentId: undefined | string = startingInstanceId;
  const instanceIdsPath: Instance["id"][] = [];
  while (currentId) {
    instanceIdsPath.push(currentId);
    currentId = parentInstanceById.get(currentId);
  }
  instanceIdsPath.push(ROOT_INSTANCE_ID);
  const maskedVariables = new Map<DataSource["name"], DataSource["id"]>();
  maskedVariables.set("system", SYSTEM_VARIABLE_ID);
  for (const instanceId of instanceIdsPath.reverse()) {
    const instance = instances.get(instanceId);
    const scopedDataSources = dataSourcesByScopeInstanceId.get(instanceId);
    if (scopedDataSources === undefined) {
      continue;
    }
    for (const dataSource of scopedDataSources) {
      if (
        instanceId === startingInstanceId &&
        instance?.component === collectionComponent &&
        dataSource.type === "parameter"
      ) {
        continue;
      }
      maskedVariables.set(dataSource.name, dataSource.id);
    }
  }
  return maskedVariables;
};

export const findAvailableVariables = ({
  startingInstanceId,
  instances,
  dataSources,
}: {
  startingInstanceId: Instance["id"];
  instances: Instances;
  dataSources: DataSources;
}) => {
  const maskedVariables = findMaskedVariablesByInstanceId({
    startingInstanceId,
    parentInstanceById: getParentInstanceById(instances),
    instances,
    dataSources,
    dataSourcesByScopeInstanceId: getDataSourcesByScopeInstanceId(dataSources),
  });
  const availableVariables: DataSource[] = [];
  for (const dataSourceId of maskedVariables.values()) {
    const dataSource = dataSources.get(dataSourceId);
    if (dataSource) {
      availableVariables.push(dataSource);
    }
    if (dataSourceId === SYSTEM_VARIABLE_ID) {
      availableVariables.push(systemParameter);
    }
  }
  return availableVariables;
};

export const bindExpressionToInstanceScope = ({
  expression,
  instanceId,
  instances,
  dataSources,
}: {
  expression: string;
  instanceId: Instance["id"];
  instances: Instances;
  dataSources: DataSources;
}) => {
  const maskedIdByName = findMaskedVariablesByInstanceId({
    startingInstanceId: instanceId,
    parentInstanceById: getParentInstanceById(instances),
    instances,
    dataSources,
  });
  const boundExpression = restoreExpressionVariables({
    expression,
    maskedIdByName,
  });
  const availableDataSourceIds = new Set(maskedIdByName.values());
  for (const identifier of getExpressionIdentifiers(boundExpression)) {
    const dataSourceId = decodeDataVariableId(identifier);
    if (
      dataSourceId !== undefined &&
      availableDataSourceIds.has(dataSourceId) === false
    ) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `Expression references data source "${dataSourceId}", which is not available to instance "${instanceId}". Read the target instance and its current Collection subtree again, then use an in-scope variable name or parameter from that subtree.`
      );
    }
  }
  return boundExpression;
};

const traverseExpressions = ({
  startingInstanceId,
  pages,
  instances,
  props,
  dataSources,
  resources,
  update,
}: {
  startingInstanceId: undefined | Instance["id"];
  pages: undefined | Pages;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
  update: (
    expression: string,
    instanceId: Instance["id"],
    args?: string[]
  ) => void | string;
}) => {
  const pagesList = pages ? getAllPages(pages) : [];

  let instanceIds =
    startingInstanceId === undefined
      ? new Set(instances.keys())
      : findTreeInstanceIdsExcludingSlotDescendants(
          instances,
          startingInstanceId
        );
  for (const page of pagesList) {
    if (startingInstanceId === ROOT_INSTANCE_ID) {
      instanceIds = setUnion(
        instanceIds,
        findTreeInstanceIds(instances, page.rootInstanceId)
      );
    }

    if (
      startingInstanceId === page.rootInstanceId ||
      startingInstanceId === ROOT_INSTANCE_ID
    ) {
      const { rootInstanceId } = page;
      page.title = update(page.title, rootInstanceId) ?? page.title;
      if (page.meta.description) {
        page.meta.description =
          update(page.meta.description, rootInstanceId) ??
          page.meta.description;
      }
      if (page.meta.excludePageFromSearch) {
        page.meta.excludePageFromSearch =
          update(page.meta.excludePageFromSearch, rootInstanceId) ??
          page.meta.excludePageFromSearch;
      }
      if (page.meta.socialImageUrl) {
        page.meta.socialImageUrl =
          update(page.meta.socialImageUrl, rootInstanceId) ??
          page.meta.socialImageUrl;
      }
      if (page.meta.language) {
        page.meta.language =
          update(page.meta.language, rootInstanceId) ?? page.meta.language;
      }
      if (page.meta.status) {
        page.meta.status =
          update(page.meta.status, rootInstanceId) ?? page.meta.status;
      }
      if (page.meta.redirect) {
        page.meta.redirect =
          update(page.meta.redirect, rootInstanceId) ?? page.meta.redirect;
      }
      if (page.meta.custom) {
        for (const item of page.meta.custom) {
          item.content = update(item.content, rootInstanceId) ?? item.content;
        }
      }
    }
  }
  const instanceIdByResourceId = new Map<Resource["id"], Instance["id"]>();

  for (const instance of instances.values()) {
    if (instanceIds.has(instance.id) === false) {
      continue;
    }
    for (const child of instance.children) {
      if (child.type === "expression") {
        child.value = update(child.value, instance.id) ?? child.value;
      }
    }
  }

  for (const prop of props.values()) {
    if (instanceIds.has(prop.instanceId) === false) {
      continue;
    }
    if (prop.type === "expression") {
      prop.value = update(prop.value, prop.instanceId) ?? prop.value;
      continue;
    }
    if (prop.type === "action") {
      for (const action of prop.value) {
        action.code =
          update(action.code, prop.instanceId, action.args) ?? action.code;
      }
      continue;
    }
    if (prop.type === "resource") {
      instanceIdByResourceId.set(prop.value, prop.instanceId);
      continue;
    }
  }

  for (const dataSource of dataSources.values()) {
    const instanceId = dataSource.scopeInstanceId ?? ROOT_INSTANCE_ID;
    if (instanceIds.has(instanceId) && dataSource.type === "resource") {
      instanceIdByResourceId.set(dataSource.resourceId, instanceId);
    }
  }

  for (const resource of resources.values()) {
    const instanceId = instanceIdByResourceId.get(resource.id);
    if (instanceId === undefined) {
      continue;
    }
    resource.url = update(resource.url, instanceId) ?? resource.url;
    for (const header of resource.headers) {
      header.value = update(header.value, instanceId) ?? header.value;
    }
    if (resource.searchParams) {
      for (const searchParam of resource.searchParams) {
        searchParam.value =
          update(searchParam.value, instanceId) ?? searchParam.value;
      }
    }
    if (resource.body) {
      resource.body = update(resource.body, instanceId) ?? resource.body;
    }
  }
};

export const findUnsetVariableNames = ({
  instances,
  props,
  dataSources,
  resources,
}: {
  startingInstanceId: Instance["id"];
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
}) => {
  const unsetVariables = new Set<DataSource["name"]>();
  traverseExpressions({
    startingInstanceId: undefined,
    pages: undefined,
    instances,
    props,
    dataSources,
    resources,
    update: (expression, _instanceId, args = []) => {
      transpileExpression({
        expression,
        replaceVariable: (identifier) => {
          const id = decodeDataVariableId(identifier);
          if (id === undefined && args.includes(identifier) === false) {
            unsetVariables.add(decodeDataVariableName(identifier));
          }
        },
      });
    },
  });
  return Array.from(unsetVariables);
};

export const findUsedVariables = ({
  startingInstanceId,
  pages,
  instances,
  props,
  dataSources,
  resources,
}: {
  startingInstanceId: Instance["id"];
  pages: undefined | Pages;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
}) => {
  const usedVariables = new Map<DataSource["id"], number>();
  traverseExpressions({
    startingInstanceId,
    pages,
    instances,
    props,
    dataSources,
    resources,
    update: (expression) => {
      const identifiers = getExpressionIdentifiers(expression);
      for (const identifier of identifiers) {
        const id = decodeDataVariableId(identifier);
        if (id !== undefined) {
          const count = usedVariables.get(id) ?? 0;
          usedVariables.set(id, count + 1);
        }
      }
    },
  });
  return usedVariables;
};

export const findVariableUsagesByInstance = ({
  startingInstanceId,
  pages,
  instances,
  props,
  dataSources,
  resources,
}: {
  startingInstanceId: Instance["id"];
  pages: undefined | Pages;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
}) => {
  const usedIn = new Map<DataSource["id"], Set<Instance["id"]>>();
  traverseExpressions({
    startingInstanceId,
    pages,
    instances,
    props,
    dataSources,
    resources,
    update: (expression, instanceId) => {
      const identifiers = getExpressionIdentifiers(expression);
      for (const identifier of identifiers) {
        const id = decodeDataVariableId(identifier);
        if (id !== undefined) {
          if (!usedIn.has(id)) {
            usedIn.set(id, new Set());
          }
          usedIn.get(id)?.add(instanceId);
        }
      }
    },
  });
  return usedIn;
};

export const rebindTreeVariablesMutable = ({
  startingInstanceId,
  pages,
  instances,
  props,
  dataSources,
  resources,
}: {
  startingInstanceId: Instance["id"];
  pages: undefined | Pages;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
}) => {
  const unsetNameById = new Map<DataSource["id"], DataSource["name"]>();
  for (const dataSource of dataSources.values()) {
    unsetNameById.set(dataSource.id, dataSource.name);
  }
  const parentInstanceById = getParentInstanceById(instances);
  const dataSourcesByScopeInstanceId =
    getDataSourcesByScopeInstanceId(dataSources);
  traverseExpressions({
    startingInstanceId,
    pages,
    instances,
    props,
    dataSources,
    resources,
    update: (expression, instanceId, args) => {
      const maskedVariables = findMaskedVariablesByInstanceId({
        startingInstanceId: instanceId,
        parentInstanceById,
        instances,
        dataSources,
        dataSourcesByScopeInstanceId,
      });
      const maskedIdByName = new Map(maskedVariables);
      if (args) {
        for (const arg of args) {
          maskedIdByName.delete(arg);
        }
      }
      expression = unsetExpressionVariables({
        expression,
        unsetNameById,
      });
      expression = restoreExpressionVariables({
        expression,
        maskedIdByName,
      });
      return expression;
    },
  });
};

export const deleteVariableMutable = (
  data: Pick<
    BuilderState,
    "instances" | "props" | "dataSources" | "resources"
  > & {
    pages?: Pages;
  },
  variableId: DataSource["id"]
) => {
  if (
    data.instances === undefined ||
    data.props === undefined ||
    data.dataSources === undefined ||
    data.resources === undefined
  ) {
    return;
  }
  const dataSource = data.dataSources.get(variableId);
  if (dataSource === undefined) {
    return;
  }
  data.dataSources.delete(variableId);
  if (dataSource.type === "resource") {
    data.resources.delete(dataSource.resourceId);
  }
  if (data.pages !== undefined) {
    for (const page of data.pages.pages.values()) {
      if (page.systemDataSourceId === variableId) {
        delete page.systemDataSourceId;
      }
    }
    for (const template of data.pages.pageTemplates?.values() ?? []) {
      if (template.systemDataSourceId === variableId) {
        delete template.systemDataSourceId;
      }
    }
  }
  const unsetNameById = new Map<DataSource["id"], DataSource["name"]>();
  unsetNameById.set(dataSource.id, dataSource.name);
  const startingInstanceId = dataSource.scopeInstanceId ?? ROOT_INSTANCE_ID;
  const maskedIdByName = findMaskedVariablesByInstanceId({
    startingInstanceId,
    parentInstanceById: getParentInstanceById(data.instances),
    instances: data.instances,
    dataSources: data.dataSources,
    dataSourcesByScopeInstanceId: getDataSourcesByScopeInstanceId(
      data.dataSources
    ),
  });
  traverseExpressions({
    instances: data.instances,
    props: data.props,
    dataSources: data.dataSources,
    resources: data.resources,
    pages: data.pages,
    startingInstanceId,
    update: (expression) => {
      expression = unsetExpressionVariables({
        expression,
        unsetNameById,
      });
      expression = restoreExpressionVariables({
        expression,
        maskedIdByName,
      });
      return expression;
    },
  });
};

export const createTreeVariableRebindPayload = ({
  startingInstanceId,
  startingInstanceIds,
  pages,
  instances,
  props,
  dataSources,
  resources,
}: Pick<
  BuilderState,
  "pages" | "instances" | "props" | "dataSources" | "resources"
> & {
  startingInstanceId?: Instance["id"];
  startingInstanceIds?: Instance["id"][];
}) => {
  if (
    instances === undefined ||
    props === undefined ||
    dataSources === undefined ||
    resources === undefined
  ) {
    return [];
  }
  if (dataSources.size === 0) {
    return [];
  }
  const instanceIds =
    startingInstanceIds ??
    (startingInstanceId === undefined ? [] : [startingInstanceId]);
  return produceWebstudioDataMutation(
    { pages, instances, props, dataSources, resources },
    (draft) => {
      for (const instanceId of instanceIds) {
        rebindTreeVariablesMutable({
          startingInstanceId: instanceId,
          ...draft,
        });
      }
    }
  ).payload;
};

export const createDataVariableDeletePayload = ({
  variableId,
  pages,
  instances,
  props,
  dataSources,
  resources,
}: Pick<BuilderState, "instances" | "props" | "dataSources" | "resources"> & {
  pages?: Pages;
  variableId: DataSource["id"];
}): {
  payload: BuilderPatchChange[];
  deletedVariable?: DataSource;
} => {
  if (
    instances === undefined ||
    props === undefined ||
    dataSources === undefined ||
    resources === undefined
  ) {
    return { payload: [] };
  }
  const deletedVariable = dataSources.get(variableId);
  if (deletedVariable === undefined) {
    return { payload: [] };
  }

  const { payload } = produceWebstudioDataMutation(
    { pages, instances, props, dataSources, resources },
    (draft) => {
      deleteVariableMutable(draft, variableId);
    }
  );
  return { payload, deletedVariable };
};

export const findUnusedDataVariableIds = ({
  pages,
  instances,
  props,
  dataSources,
  resources,
}: {
  pages: undefined | Pages;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
}) => {
  const usedVariables = findVariableUsagesByInstance({
    startingInstanceId: ROOT_INSTANCE_ID,
    pages,
    instances,
    props,
    dataSources,
    resources,
  });
  const variableIds: DataSource["id"][] = [];
  for (const dataSource of dataSources.values()) {
    if (dataSource.type !== "variable") {
      continue;
    }
    const usages = usedVariables.get(dataSource.id);
    if (usages === undefined || usages.size === 0) {
      variableIds.push(dataSource.id);
    }
  }
  return variableIds;
};

export const createUnusedDataVariablesDeletePayload = ({
  pages,
  instances,
  props,
  dataSources,
  resources,
}: Pick<BuilderState, "instances" | "props" | "dataSources" | "resources"> & {
  pages?: Pages;
}): {
  payload: BuilderPatchChange[];
  deletedVariableIds: DataSource["id"][];
} => {
  if (
    instances === undefined ||
    props === undefined ||
    dataSources === undefined ||
    resources === undefined
  ) {
    return { payload: [], deletedVariableIds: [] };
  }
  const deletedVariableIds = findUnusedDataVariableIds({
    pages,
    instances,
    props,
    dataSources,
    resources,
  });
  if (deletedVariableIds.length === 0) {
    return { payload: [], deletedVariableIds };
  }

  const { payload } = produceWebstudioDataMutation(
    { pages, instances, props, dataSources, resources },
    (draft) => {
      for (const variableId of deletedVariableIds) {
        deleteVariableMutable(draft, variableId);
      }
    }
  );
  return {
    payload,
    deletedVariableIds,
  };
};

const createDataVariableValue = ({
  dataSourceId,
  scopeInstanceId,
  name,
  value,
}: {
  dataSourceId: DataSource["id"];
  scopeInstanceId: Instance["id"];
  name: DataSource["name"];
  value: DataVariable["value"];
}): DataVariable => ({
  id: dataSourceId,
  scopeInstanceId,
  name,
  type: "variable",
  value,
});

export const createDataVariableCreatePayload = ({
  dataSourceId,
  scopeInstanceId,
  name,
  value,
  dataSources,
}: {
  dataSourceId: DataSource["id"];
  scopeInstanceId: Instance["id"];
  name: DataSource["name"];
  value: DataVariable["value"];
  dataSources: Iterable<DataSource>;
}) => {
  const dataSourceList = Array.from(dataSources);
  const errors = [];
  for (const dataSource of dataSourceList) {
    if (dataSource.id === dataSourceId) {
      errors.push({ type: "duplicate-id" as const, dataSourceId });
      break;
    }
  }
  const nameError = validateDataVariableNameWithSources({
    dataSources: dataSourceList,
    name,
    variableId: dataSourceId,
    scopeInstanceId,
  });
  if (nameError) {
    errors.push(nameError);
  }
  if (errors.length > 0) {
    return { payload: [], errors };
  }
  return {
    payload: [
      {
        namespace: "dataSources" as const,
        patches: [
          {
            op: "add" as const,
            path: [dataSourceId],
            value: createDataVariableValue({
              dataSourceId,
              scopeInstanceId,
              name,
              value,
            }),
          },
        ],
      },
    ],
    errors,
  };
};

const createDataVariableUpsertPayload = ({
  pages,
  instances,
  props,
  dataSources,
  resources,
  variable,
}: Pick<
  BuilderState,
  "pages" | "instances" | "props" | "dataSources" | "resources"
> & {
  variable: DataVariable;
}) => {
  if (
    instances === undefined ||
    props === undefined ||
    dataSources === undefined ||
    resources === undefined
  ) {
    return [];
  }
  if (variable.scopeInstanceId === undefined) {
    return [];
  }
  const scopeInstanceId = variable.scopeInstanceId;
  return produceWebstudioDataMutation(
    { pages, instances, props, dataSources, resources },
    (draft) => {
      if (variable.type === "variable") {
        const previous = draft.dataSources.get(variable.id);
        if (previous?.type === "resource") {
          draft.resources.delete(previous.resourceId);
        }
      }
      draft.dataSources.set(variable.id, variable);
      rebindTreeVariablesMutable({
        startingInstanceId: scopeInstanceId,
        ...draft,
      });
    }
  ).payload;
};

export const createDataVariableUpdatePayload = ({
  variable,
  values,
  dataSources,
}: {
  variable: DataVariable;
  values: Partial<Pick<DataVariable, "scopeInstanceId" | "name" | "value">>;
  dataSources: Iterable<DataSource>;
}) => {
  if (values.name !== undefined || values.scopeInstanceId !== undefined) {
    const error = validateDataVariableNameWithSources({
      dataSources,
      name: values.name ?? variable.name,
      variableId: variable.id,
      scopeInstanceId: values.scopeInstanceId ?? variable.scopeInstanceId,
    });
    if (error) {
      return { payload: [], error };
    }
  }
  return {
    payload: compactBuilderPatchPayload([
      {
        namespace: "dataSources",
        patches: Object.entries(values).flatMap(([name, value]) =>
          value === undefined
            ? []
            : [{ op: "replace" as const, path: [variable.id, name], value }]
        ),
      },
    ]),
  };
};

export const createDataVariable = (
  state: Pick<
    BuilderState,
    "pages" | "instances" | "props" | "dataSources" | "resources"
  >,
  input: z.infer<typeof dataVariableCreateInput>,
  context: BuilderRuntimeContext
) => {
  const dataSources = getRequiredDataSources(state);
  const dataSourceId = context.createId();
  const { payload, errors } = createDataVariableCreatePayload({
    dataSourceId,
    scopeInstanceId: input.scopeInstanceId,
    name: input.name,
    value: input.value,
    dataSources: dataSources.values(),
  });
  const error = errors.at(0);
  if (error?.type === "duplicate-id") {
    return throwBuilderRuntimeError("CONFLICT", "Variable id already exists");
  }
  if (error) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "message" in error ? error.message : "Invalid variable"
    );
  }
  const variable = createDataVariableValue({
    dataSourceId,
    scopeInstanceId: input.scopeInstanceId,
    name: input.name,
    value: input.value,
  });
  return createRuntimeMutation({
    payload:
      createDataVariableUpsertPayload({
        ...state,
        variable,
      }) ?? payload,
    result: { dataSourceId },
    invalidatesNamespaces: [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
    ],
  });
};

export const updateDataVariable = (
  state: Pick<
    BuilderState,
    "pages" | "instances" | "props" | "dataSources" | "resources"
  >,
  input: z.infer<typeof dataVariableUpdateInput>
) => {
  const dataSources = getRequiredDataSources(state);
  const dataSource = dataSources.get(input.dataSourceId);
  if (dataSource === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Variable not found");
  }
  if (dataSource.type !== "variable" && input.values.value === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Variable value is required"
    );
  }
  const scopeInstanceId =
    input.values.scopeInstanceId ?? dataSource.scopeInstanceId;
  if (scopeInstanceId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Variable scope instance is required"
    );
  }
  const variable =
    dataSource.type === "variable"
      ? dataSource
      : createDataVariableValue({
          dataSourceId: dataSource.id,
          scopeInstanceId,
          name: dataSource.name,
          value: input.values.value ?? { type: "string", value: "" },
        });
  const { error } = createDataVariableUpdatePayload({
    variable,
    values: input.values,
    dataSources: dataSources.values(),
  });
  if (error) {
    return throwBuilderRuntimeError("BAD_REQUEST", error.message);
  }
  const nextVariable = { ...variable, ...input.values };
  return createRuntimeMutation({
    payload: createDataVariableUpsertPayload({
      ...state,
      variable: nextVariable,
    }),
    result: { dataSourceId: variable.id },
    invalidatesNamespaces: [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
    ],
  });
};

export const deleteDataVariable = (
  state: Pick<
    BuilderState,
    "pages" | "instances" | "props" | "dataSources" | "resources"
  >,
  input: z.infer<typeof dataVariableDeleteInput>
) => {
  const { payload, deletedVariable } = createDataVariableDeletePayload({
    variableId: input.dataSourceId,
    pages: state.pages,
    instances: state.instances,
    props: state.props,
    dataSources: state.dataSources,
    resources: state.resources,
  });
  if (deletedVariable === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Variable not found");
  }
  return createRuntimeMutation({
    payload,
    result: { dataSourceId: deletedVariable.id },
    invalidatesNamespaces: [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
    ],
  });
};

export const deleteUnusedDataVariables = (
  state: Pick<
    BuilderState,
    "pages" | "instances" | "props" | "dataSources" | "resources"
  >,
  _input: z.infer<typeof dataVariableDeleteUnusedInput>
) => {
  const { payload, deletedVariableIds } =
    createUnusedDataVariablesDeletePayload({
      pages: state.pages,
      instances: state.instances,
      props: state.props,
      dataSources: state.dataSources,
      resources: state.resources,
    });
  return createRuntimeMutation({
    payload,
    result: {
      dataSourceIds: deletedVariableIds,
      deletedCount: deletedVariableIds.length,
    },
    invalidatesNamespaces:
      deletedVariableIds.length === 0
        ? []
        : ["pages", "instances", "props", "dataSources", "resources"],
  });
};

export const findResource = (
  resources: Iterable<Resource>,
  resourceId: Resource["id"]
) => {
  for (const value of resources) {
    if (value.id === resourceId) {
      return value;
    }
  }
};

const addExpressionIssues = (
  context: z.RefinementCtx,
  issues: readonly SemanticValidationIssue[]
) => {
  for (const issue of issues) {
    addZodValidationIssue(
      context,
      issue,
      issue.code === "invalid_resource_url"
        ? { message: `${issue.path.join(".")}: ${issue.message}` }
        : undefined
    );
  }
};

const resourceUrlLiteralPattern = /^(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|\/)/;
const resourceExpressionStartPattern = /^\s*(?:["'`[{(]|(?:await|new)\b)/;

const normalizeResourceUrlInput = (value: string) => {
  if (
    resourceUrlLiteralPattern.test(value) &&
    resourceExpressionStartPattern.test(value) === false
  ) {
    return JSON.stringify(value);
  }
  return value;
};

const resourceExpressionInput = z
  .union([
    z.string(),
    z.object({ type: z.literal("literal"), value: z.string() }),
  ])
  .describe(
    'One dynamic Webstudio JavaScript expression, or { type: "literal", value: string } for fixed text. Read webstudio://project/expressions for syntax, scope, resource-result shape, and supported methods.'
  );

const resourceExpressionEntryInput = z.object({
  name: z.string(),
  value: resourceExpressionInput,
});

const resourceFieldsInputBase = resource.omit({ id: true }).extend({
  control: z.enum(["system", "graphql"]).optional(),
  url: z.preprocess(
    (value) =>
      typeof value === "string" ? normalizeResourceUrlInput(value) : value,
    z.string()
  ),
  searchParams: z.array(resourceExpressionEntryInput).optional(),
  headers: z.array(resourceExpressionEntryInput),
  body: resourceExpressionInput.optional(),
});

export const resourceFieldsInput = resourceFieldsInputBase.superRefine(
  (fields, context) => {
    const normalizedFields = normalizeResourceFieldsInput(fields);
    addExpressionIssues(
      context,
      getResourceExpressionValidationIssues(normalizedFields)
    );
    addExpressionIssues(
      context,
      getResourceLiteralUrlValidationIssues(normalizedFields)
    );
  }
);

export const resourceFieldsUpdateInput = resourceFieldsInputBase
  .partial()
  .superRefine((fields, context) => {
    const normalizedFields = normalizeResourceFieldsUpdateInput(fields);
    addExpressionIssues(
      context,
      getResourceExpressionValidationIssues(normalizedFields)
    );
    addExpressionIssues(
      context,
      getResourceLiteralUrlValidationIssues(normalizedFields)
    );
  });

const normalizeResourceExpressionInput = (
  value: z.infer<typeof resourceExpressionInput>
) => (typeof value === "string" ? value : JSON.stringify(value.value));

type ResourceFields = Omit<Resource, "id">;
type ResourceFieldsUpdate = Partial<ResourceFields>;

const normalizeResourceFields = (
  fields: z.infer<typeof resourceFieldsUpdateInput>
): ResourceFieldsUpdate => {
  const { searchParams, headers, body, ...scalarFields } = fields;
  return {
    ...scalarFields,
    ...(fields.searchParams === undefined
      ? {}
      : {
          searchParams: fields.searchParams.map((entry) => ({
            name: entry.name,
            value: normalizeResourceExpressionInput(entry.value),
          })),
        }),
    ...(fields.headers === undefined
      ? {}
      : {
          headers: fields.headers.map((entry) => ({
            name: entry.name,
            value: normalizeResourceExpressionInput(entry.value),
          })),
        }),
    ...(fields.body === undefined
      ? {}
      : { body: normalizeResourceExpressionInput(fields.body) }),
  };
};

const normalizeResourceFieldsInput = (
  fields: z.infer<typeof resourceFieldsInput>
): ResourceFields => normalizeResourceFields(fields) as ResourceFields;

const normalizeResourceFieldsUpdateInput = normalizeResourceFields;

const exposeAsDataSourceInput = z
  .boolean()
  .optional()
  .describe(
    "Expose the resource as render-time data. Scoped GET resources default to true; write resources default to false."
  );

export const resourceCreateInput = z
  .object({
    resourceId: runtimeGeneratedIdInput,
    resource: resourceFieldsInput,
    dataSourceId: runtimeGeneratedIdInput,
    scopeInstanceId: z.string().optional(),
    dataSourceName: z.string().optional(),
    exposeAsDataSource: exposeAsDataSourceInput,
  })
  .superRefine((input, context) => {
    if (
      input.exposeAsDataSource === true &&
      input.scopeInstanceId === undefined
    ) {
      addZodValidationIssue(context, {
        code: "missing_resource_scope",
        path: ["scopeInstanceId"],
        message: "scopeInstanceId is required when exposeAsDataSource is true.",
        constraint: "required_when:exposeAsDataSource=true",
        example: "instance-id",
      });
    }
  });

export const resourceUpdateInput = z.object({
  resourceId: z.string(),
  values: resourceFieldsUpdateInput,
  dataSourceName: z.string().optional(),
  scopeInstanceId: z.string().optional(),
  exposeAsDataSource: exposeAsDataSourceInput,
});

export const replaceResourceTextInput = z.object({
  find: z.string().min(1).describe("Fixed resource text to find."),
  replace: z.string().describe("Replacement fixed resource text."),
  match: z
    .enum(["exact", "substring"])
    .default("exact")
    .describe(
      'Use "exact" to replace complete values, or "substring" to replace every literal occurrence in matching values.'
    ),
  fields: z
    .array(z.enum(["name", "url"]))
    .min(1)
    .default(["name", "url"])
    .describe("Resource text fields to replace."),
  resourceIds: z
    .array(z.string())
    .min(1)
    .optional()
    .describe("Optional resource ids to limit scope."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe("Maximum number of resource fields to change."),
});

export const resourceUpsertInput = z.object({
  resourceId: z.string().optional(),
  resource: resourceFieldsInput,
  dataSourceId: z.string().optional(),
  scopeInstanceId: z.string(),
  dataSourceName: z.string().optional(),
});

export const resourcePropUpsertInput = z.object({
  instanceId: z.string(),
  propName: z.string(),
  resourceId: z.string().optional(),
  resource: resourceFieldsInput,
  scopeInstanceId: z.string().optional(),
  dataSourceName: z.string().optional(),
});

export const resourceDeleteInput = z.object({
  resourceId: z.string(),
  force: z.boolean().optional(),
});

type ResourceFormData = {
  get(name: string): unknown;
  getAll(name: string): unknown[];
};

export const createResourceFieldsFromFormData = ({
  control,
  name,
  formData,
}: {
  control?: string;
  name?: string;
  formData: ResourceFormData;
}): z.infer<typeof resourceFieldsInput> => {
  const searchParamNames = formData.getAll("search-param-name");
  const searchParamValues = formData.getAll("search-param-value");
  const headerNames = formData.getAll("header-name");
  const headerValues = formData.getAll("header-value");
  return resourceFieldsInput.parse({
    control,
    name: name ?? formData.get("name"),
    url: formData.get("url"),
    searchParams: searchParamNames
      .map((name, index) => ({ name, value: searchParamValues[index] }))
      .filter((item) => String(item.name).trim()),
    method: formData.get("method"),
    headers: headerNames
      .map((name, index) => ({ name, value: headerValues[index] }))
      .filter((item) => String(item.name).trim()),
    body: formData.get("body") || undefined,
  });
};

export const createResourceValueFromFormData = ({
  id,
  control,
  name,
  formData,
}: {
  id: Resource["id"];
  control?: string;
  name?: string;
  formData: ResourceFormData;
}): Resource =>
  createResourceValue({
    id,
    ...normalizeResourceFieldsInput(
      createResourceFieldsFromFormData({ control, name, formData })
    ),
  });

export const createResourceValue = ({
  id,
  control,
  name,
  url,
  searchParams,
  method,
  headers,
  body,
}: {
  id: Resource["id"];
  control?: unknown;
  name?: unknown;
  url: unknown;
  searchParams?: unknown;
  method: unknown;
  headers: unknown;
  body?: unknown;
}): Resource =>
  resource.parse({
    id,
    control,
    name,
    url,
    searchParams,
    method,
    headers,
    body: body || undefined,
  });

export const createResourceFieldsFromResource = (
  resource: Resource
): z.infer<typeof resourceFieldsInput> => ({
  name: resource.name,
  control: resource.control,
  url: resource.url,
  searchParams: resource.searchParams,
  method: resource.method,
  headers: resource.headers,
  body: resource.body,
});

export const validateResourceUrlExpression = (
  expression: string,
  scope: Record<string, unknown>
) => {
  const value = computeExpressionWithinScope(expression, scope);
  if (typeof value !== "string") {
    return "URL expects a string";
  }
  if (value.length === 0) {
    return "URL is required";
  }
  try {
    new URL(value);
  } catch {
    return "URL is invalid";
  }
  return "";
};

export type ResourceBodyInputType = undefined | "text" | "json";

export const validateResourceBodyExpression = (
  expression: string,
  bodyType: ResourceBodyInputType,
  scope: Record<string, unknown>
) => {
  if (expression === "") {
    return "";
  }
  const value = computeExpressionWithinScope(expression, scope);
  if (bodyType === "json") {
    return typeof value === "object" && value !== null
      ? ""
      : "Expected valid JSON object in body";
  }
  return typeof value === "string" ? "" : "Expected string in body";
};

type ResourceExpressionFields = Partial<
  Pick<Resource, "url" | "body" | "headers" | "searchParams">
>;

const listResourceExpressions = (
  fields: ResourceExpressionFields,
  pathPrefix: string[] = []
) => [
  ...(fields.url === undefined
    ? []
    : [{ path: [...pathPrefix, "url"], expression: fields.url }]),
  ...(fields.body === undefined
    ? []
    : [{ path: [...pathPrefix, "body"], expression: fields.body }]),
  ...(fields.headers ?? []).map((header, index) => ({
    path: [...pathPrefix, "headers", String(index), "value"],
    expression: header.value,
  })),
  ...(fields.searchParams ?? []).map((param, index) => ({
    path: [...pathPrefix, "searchParams", String(index), "value"],
    expression: param.value,
  })),
];

const getResourceExpressionValidationIssues = (
  fields: ResourceExpressionFields
): SemanticValidationIssue[] =>
  listResourceExpressions(fields).flatMap(({ path, expression }) =>
    getNamedExpressionValidationIssues(path.join("."), expression)
  );

const getResourceWarnings = ({
  fields,
  state,
  scopeInstanceId,
  resourceId,
  exposeAsDataSource = false,
  fieldPath = ["resource"],
  methodPath = ["resource", "method"],
}: {
  fields: Pick<
    Resource,
    "method" | "url" | "body" | "headers" | "searchParams"
  >;
  state: Pick<BuilderState, "instances" | "dataSources">;
  scopeInstanceId?: string;
  resourceId: string;
  exposeAsDataSource?: boolean;
  fieldPath?: string[];
  methodPath?: string[];
}) => {
  const availableVariables = new Set(
    scopeInstanceId === undefined ||
      state.instances === undefined ||
      state.dataSources === undefined
      ? ["system"]
      : findAvailableVariables({
          startingInstanceId: scopeInstanceId,
          instances: state.instances,
          dataSources: state.dataSources,
        }).map(({ name }) => name)
  );
  const warnings = listResourceExpressions(fields, fieldPath).flatMap(
    ({ path, expression }) =>
      getExpressionWarnings({
        expression,
        availableVariables,
        path,
        resourceId,
      })
  );
  if (exposeAsDataSource && fields.method !== "get") {
    warnings.push({
      severity: "warning",
      code: "render_time_mutation_resource",
      path: methodPath,
      message: `The ${fields.method.toUpperCase()} resource is explicitly exposed as render-time data and may execute while rendering the page.`,
      range: { from: 0, to: 0 },
      remediation:
        "Expose GET resources for render-time data, or trigger mutating resources from an explicit action.",
      resourceId,
    });
  }
  return warnings;
};

export const getResourceExpressionErrors = (
  fields: Partial<Pick<Resource, "url" | "body" | "headers" | "searchParams">>
) =>
  formatValidationIssueMessages(getResourceExpressionValidationIssues(fields))
    .split("\n")
    .filter(Boolean);

const getResourceLiteralUrlValidationIssues = (
  fields: Partial<Pick<Resource, "url">>
): SemanticValidationIssue[] => {
  if (fields.url === undefined || isLiteralExpression(fields.url) === false) {
    return [];
  }
  let value: unknown;
  try {
    value = JSON.parse(fields.url);
  } catch {
    return [];
  }
  if (typeof value !== "string") {
    return [
      {
        code: "invalid_resource_url",
        path: ["url"],
        message: "URL expects a string",
        constraint: "absolute_or_root_relative_url",
        example: "https://api.example.com/posts",
      },
    ];
  }
  if (value.length === 0) {
    return [
      {
        code: "invalid_resource_url",
        path: ["url"],
        message: "URL is required",
        constraint: "absolute_or_root_relative_url",
        example: "https://api.example.com/posts",
      },
    ];
  }
  if (isLocalResource(value)) {
    return [];
  }
  try {
    new URL(value);
  } catch {
    return [
      {
        code: "invalid_resource_url",
        path: ["url"],
        message: "URL is invalid",
        constraint: "absolute_or_root_relative_url",
        example: "https://api.example.com/posts",
      },
    ];
  }
  return [];
};

const validateResourceFields = (
  fields: Partial<Pick<Resource, "url" | "body" | "headers" | "searchParams">>,
  pathPrefix: readonly string[] = []
) => {
  const issues = [
    ...getResourceExpressionValidationIssues(fields),
    ...getResourceLiteralUrlValidationIssues(fields),
  ];
  if (issues.length > 0) {
    return throwBuilderValidationError(
      formatValidationIssueMessages(issues),
      prefixValidationIssuePaths(issues, pathPrefix)
    );
  }
};

const createResourceDataSource = ({
  dataSourceId,
  scopeInstanceId,
  name,
  resourceId,
}: {
  dataSourceId: DataSource["id"];
  scopeInstanceId: Instance["id"];
  name: DataSource["name"];
  resourceId: Resource["id"];
}): DataSource => ({
  id: dataSourceId,
  scopeInstanceId,
  name,
  type: "resource",
  resourceId,
});

const getClonedPair = <Item extends { id: string }>(item: Item) =>
  [item.id, structuredClone(item)] as const;

const getBuildItems = <Item>(items: Item[] | Map<string, Item>) =>
  items instanceof Map ? Array.from(items.values()) : items;

export const createWebstudioDataFromBuild = ({
  build,
  assets = [],
}: {
  build: Pick<
    CompactBuild | WebstudioData,
    | "pages"
    | "instances"
    | "props"
    | "dataSources"
    | "resources"
    | "breakpoints"
    | "styleSources"
    | "styleSourceSelections"
    | "styles"
  >;
  assets?: Asset[];
}): WebstudioData => ({
  pages: structuredClone(build.pages),
  assets: new Map(assets.map(getClonedPair)),
  instances: new Map(getBuildItems(build.instances).map(getClonedPair)),
  props: new Map(getBuildItems(build.props).map(getClonedPair)),
  dataSources: new Map(getBuildItems(build.dataSources).map(getClonedPair)),
  resources: new Map(getBuildItems(build.resources).map(getClonedPair)),
  breakpoints: new Map(getBuildItems(build.breakpoints).map(getClonedPair)),
  styleSources: new Map(getBuildItems(build.styleSources).map(getClonedPair)),
  styleSourceSelections: new Map(
    getBuildItems(build.styleSourceSelections).map((item) => [
      item.instanceId,
      structuredClone(item),
    ])
  ),
  styles: new Map(
    getBuildItems(build.styles).map((item) => [
      getStyleDeclKey(item),
      structuredClone(item),
    ])
  ),
});

export const produceWebstudioDataMutation = <Data extends object>(
  data: Data,
  recipe: (draft: Data) => void
) => {
  const [nextData, patches] = produceWithPatches(data, recipe);
  return {
    data: nextData,
    payload: createBuilderPatchPayloadFromImmerPatches(patches),
  };
};

export const upsertResourceMutable = ({
  data,
  resource,
  dataSourceId,
  scopeInstanceId,
  dataSourceName,
  exposeAsDataSource = scopeInstanceId !== undefined,
}: {
  data: Pick<
    WebstudioData,
    "instances" | "props" | "dataSources" | "resources"
  > & {
    pages: WebstudioData["pages"] | undefined;
  };
  resource: Resource;
  dataSourceId?: DataSource["id"];
  scopeInstanceId?: Instance["id"];
  dataSourceName?: DataSource["name"];
  exposeAsDataSource?: boolean;
}) => {
  data.resources.set(resource.id, resource);
  const previousDataSource = Array.from(data.dataSources.values()).find(
    (dataSource) =>
      dataSource.type === "resource" && dataSource.resourceId === resource.id
  );
  if (previousDataSource !== undefined && exposeAsDataSource === false) {
    data.dataSources.delete(previousDataSource.id);
    if (previousDataSource.scopeInstanceId !== undefined) {
      rebindTreeVariablesMutable({
        startingInstanceId: previousDataSource.scopeInstanceId,
        ...data,
      });
      if (data.pages !== undefined) {
        rebindTreeVariablesMutable({
          startingInstanceId: previousDataSource.scopeInstanceId,
          ...data,
          pages: undefined,
        });
      }
    }
  }
  if (
    exposeAsDataSource &&
    dataSourceId !== undefined &&
    scopeInstanceId !== undefined
  ) {
    data.dataSources.set(
      dataSourceId,
      createResourceDataSource({
        dataSourceId,
        scopeInstanceId,
        name: dataSourceName ?? resource.name,
        resourceId: resource.id,
      })
    );
    rebindTreeVariablesMutable({
      startingInstanceId: scopeInstanceId,
      ...data,
    });
    if (data.pages !== undefined) {
      rebindTreeVariablesMutable({
        startingInstanceId: scopeInstanceId,
        ...data,
        pages: undefined,
      });
    }
  }
};

export const createResourceUpsertPatchPayload = ({
  build,
  resource,
  dataSourceId,
  scopeInstanceId,
  dataSourceName,
  exposeAsDataSource,
}: {
  build: Pick<
    CompactBuild,
    | "pages"
    | "instances"
    | "props"
    | "dataSources"
    | "resources"
    | "breakpoints"
    | "styleSources"
    | "styleSourceSelections"
    | "styles"
  >;
  resource: Resource;
  dataSourceId?: DataSource["id"];
  scopeInstanceId?: Instance["id"];
  dataSourceName?: DataSource["name"];
  exposeAsDataSource?: boolean;
}) => {
  const before = createWebstudioDataFromBuild({ build });
  return produceWebstudioDataMutation(before, (draft) => {
    upsertResourceMutable({
      data: draft,
      resource,
      dataSourceId,
      scopeInstanceId,
      dataSourceName,
      exposeAsDataSource,
    });
  }).payload;
};

export const createResourceCreatePayload = ({
  resourceId,
  resource: resourceInput,
  resources,
  dataSources,
  dataSourceId,
  scopeInstanceId,
  dataSourceName,
}: {
  resourceId: Resource["id"];
  resource: ResourceFields;
  resources: Iterable<Resource>;
  dataSources: Iterable<DataSource>;
  dataSourceId?: DataSource["id"];
  scopeInstanceId?: DataSource["scopeInstanceId"];
  dataSourceName?: DataSource["name"];
}): {
  payload: BuilderPatchChange[];
  dataSourceId?: DataSource["id"];
  errors: Array<
    | { type: "duplicate-resource-id"; resourceId: Resource["id"] }
    | { type: "duplicate-data-source-id"; dataSourceId: DataSource["id"] }
  >;
} => {
  const errors = [];
  if (Array.from(resources).some((resource) => resource.id === resourceId)) {
    errors.push({ type: "duplicate-resource-id" as const, resourceId });
  }
  const nextDataSourceId =
    scopeInstanceId === undefined ? undefined : dataSourceId;
  if (
    nextDataSourceId !== undefined &&
    Array.from(dataSources).some(
      (dataSource) => dataSource.id === nextDataSourceId
    )
  ) {
    errors.push({
      type: "duplicate-data-source-id" as const,
      dataSourceId: nextDataSourceId,
    });
  }
  if (errors.length > 0) {
    return { payload: [], dataSourceId: nextDataSourceId, errors };
  }

  const payload: BuilderPatchChange[] = [
    {
      namespace: "resources",
      patches: [
        {
          op: "add",
          path: [resourceId],
          value: createResourceValue({
            id: resourceId,
            name: resourceInput.name,
            control: resourceInput.control,
            method: resourceInput.method,
            url: resourceInput.url,
            searchParams: resourceInput.searchParams,
            headers: resourceInput.headers,
            body: resourceInput.body,
          }),
        },
      ],
    },
  ];
  if (nextDataSourceId !== undefined && scopeInstanceId !== undefined) {
    payload.push({
      namespace: "dataSources",
      patches: [
        {
          op: "add",
          path: [nextDataSourceId],
          value: createResourceDataSource({
            dataSourceId: nextDataSourceId,
            scopeInstanceId,
            name: dataSourceName ?? resourceInput.name,
            resourceId,
          }),
        },
      ],
    });
  }

  return { payload, dataSourceId: nextDataSourceId, errors };
};

export const createResourceUpdatePayload = ({
  resource,
  values,
  dataSources,
  dataSourceName,
  scopeInstanceId,
}: {
  resource: Resource;
  values: z.infer<typeof resourceFieldsUpdateInput>;
  dataSources: Iterable<DataSource>;
  dataSourceName?: string;
  scopeInstanceId?: string;
}): BuilderPatchChange[] => {
  const patches = Object.entries(values).flatMap(([name, value]) =>
    value === undefined
      ? []
      : [{ op: "replace" as const, path: [resource.id, name], value }]
  );
  const payload: BuilderPatchChange[] = compactBuilderPatchPayload([
    { namespace: "resources", patches },
  ]);
  const dataSource = Array.from(dataSources).find(
    (dataSource) =>
      dataSource.type === "resource" && dataSource.resourceId === resource.id
  );
  const dataSourcePatches = [];
  if (dataSource !== undefined && dataSourceName !== undefined) {
    dataSourcePatches.push({
      op: "replace" as const,
      path: [dataSource.id, "name"],
      value: dataSourceName,
    });
  }
  if (dataSource !== undefined && scopeInstanceId !== undefined) {
    dataSourcePatches.push({
      op: "replace" as const,
      path: [dataSource.id, "scopeInstanceId"],
      value: scopeInstanceId,
    });
  }
  if (dataSourcePatches.length > 0) {
    payload.push({ namespace: "dataSources", patches: dataSourcePatches });
  }
  return payload;
};

export const createResourceDeletePayload = ({
  resource,
  dataSources,
  props,
  force,
}: {
  resource: Resource;
  dataSources: Iterable<DataSource>;
  props: Iterable<Prop>;
  force?: boolean;
}): {
  payload: BuilderPatchChange[];
  dataSourceIds: DataSource["id"][];
  propIds: Prop["id"][];
  isUsed: boolean;
} => {
  const resourceProps = Array.from(props).filter(
    (prop) => prop.type === "resource" && prop.value === resource.id
  );
  if (resourceProps.length > 0 && force !== true) {
    return { payload: [], dataSourceIds: [], propIds: [], isUsed: true };
  }
  const resourceDataSources = Array.from(dataSources).filter(
    (dataSource) =>
      dataSource.type === "resource" && dataSource.resourceId === resource.id
  );
  const payload: BuilderPatchChange[] = [
    {
      namespace: "resources",
      patches: [{ op: "remove", path: [resource.id] }],
    },
  ];
  if (resourceDataSources.length > 0) {
    payload.push({
      namespace: "dataSources",
      patches: resourceDataSources.map((dataSource) => ({
        op: "remove" as const,
        path: [dataSource.id],
      })),
    });
  }
  if (resourceProps.length > 0) {
    payload.push({
      namespace: "props",
      patches: resourceProps.map((prop) => ({
        op: "remove" as const,
        path: [prop.id],
      })),
    });
  }

  return {
    payload,
    dataSourceIds: resourceDataSources.map((dataSource) => dataSource.id),
    propIds: resourceProps.map((prop) => prop.id),
    isUsed: false,
  };
};

export const serializeResources = ({
  resources,
  dataSources,
  scopeInstanceId,
}: {
  resources: Iterable<Resource> | Map<string, Resource>;
  dataSources: Iterable<DataSource> | Map<string, DataSource>;
  scopeInstanceId?: Instance["id"];
}) => {
  const dataSourceList =
    dataSources instanceof Map
      ? Array.from(dataSources.values())
      : Array.from(dataSources);
  return {
    resources: (resources instanceof Map
      ? Array.from(resources.values())
      : Array.from(resources)
    )
      .filter(
        (resource) =>
          scopeInstanceId === undefined ||
          dataSourceList.some(
            (dataSource) =>
              dataSource.type === "resource" &&
              dataSource.resourceId === resource.id &&
              dataSource.scopeInstanceId === scopeInstanceId
          )
      )
      .map((resource) => {
        const dataSource = dataSourceList.find(
          (dataSource) =>
            dataSource.type === "resource" &&
            dataSource.resourceId === resource.id &&
            (scopeInstanceId === undefined ||
              dataSource.scopeInstanceId === scopeInstanceId)
        );
        return {
          id: resource.id,
          name: resource.name,
          method: resource.method,
          url: resource.url,
          scopeInstanceId: dataSource?.scopeInstanceId,
          exposedAsDataSource: dataSource !== undefined,
          dataSourceId: dataSource?.id,
        };
      }),
  };
};

export const listResources = (
  state: Pick<BuilderState, "dataSources" | "resources">,
  input: { scopeInstanceId?: string } = {}
) => {
  return serializeResources({
    resources: getRequiredResources(state),
    dataSources: getRequiredDataSources(state),
    scopeInstanceId: input.scopeInstanceId,
  });
};

export const createResource = (
  state: Pick<
    BuilderState,
    | "pages"
    | "instances"
    | "props"
    | "dataSources"
    | "resources"
    | "breakpoints"
    | "styleSources"
    | "styleSourceSelections"
    | "styles"
  >,
  input: z.infer<typeof resourceCreateInput>,
  context: BuilderRuntimeContext
) => {
  const resourceInput = normalizeResourceFieldsInput(input.resource);
  validateResourceFields(resourceInput, ["resource"]);
  const build = getRequiredBuildData(state);
  const resourceId = context.createId();
  const exposeAsDataSource =
    input.exposeAsDataSource ??
    (resourceInput.method === "get" && input.scopeInstanceId !== undefined);
  if (
    exposeAsDataSource &&
    build.instances.some(
      (instance) => instance.id === input.scopeInstanceId
    ) === false
  ) {
    return throwBuilderRuntimeError("NOT_FOUND", "Scope instance not found");
  }
  const dataSourceId = exposeAsDataSource ? context.createId() : undefined;
  const resultPayload = createResourceCreatePayload({
    resourceId,
    resource: resourceInput,
    resources: build.resources,
    dataSources: build.dataSources,
    dataSourceId,
    scopeInstanceId: input.scopeInstanceId,
    dataSourceName: input.dataSourceName,
  });
  const error = resultPayload.errors.at(0);
  if (error?.type === "duplicate-resource-id") {
    return throwBuilderRuntimeError("CONFLICT", "Resource id already exists");
  }
  if (error?.type === "duplicate-data-source-id") {
    return throwBuilderRuntimeError(
      "CONFLICT",
      "Data source id already exists"
    );
  }
  const resource = createResourceValue({
    id: resourceId,
    name: resourceInput.name,
    control: resourceInput.control,
    method: resourceInput.method,
    url: resourceInput.url,
    searchParams: resourceInput.searchParams,
    headers: resourceInput.headers,
    body: resourceInput.body,
  });
  const warnings = getResourceWarnings({
    fields: resource,
    state,
    scopeInstanceId: input.scopeInstanceId,
    resourceId,
    exposeAsDataSource,
    methodPath: ["resource", "method"],
  });
  return createRuntimeMutation({
    payload: createResourceUpsertPatchPayload({
      build,
      resource,
      dataSourceId,
      scopeInstanceId: input.scopeInstanceId,
      dataSourceName: input.dataSourceName,
      exposeAsDataSource,
    }),
    result: {
      resourceId,
      dataSourceId,
      warnings,
    },
    invalidatesNamespaces: [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
      "breakpoints",
      "styleSources",
      "styleSourceSelections",
      "styles",
    ],
  });
};

export const updateResource = (
  state: Pick<
    BuilderState,
    | "pages"
    | "instances"
    | "props"
    | "dataSources"
    | "resources"
    | "breakpoints"
    | "styleSources"
    | "styleSourceSelections"
    | "styles"
  >,
  input: z.infer<typeof resourceUpdateInput>,
  context: BuilderRuntimeContext
) => {
  const values = normalizeResourceFieldsUpdateInput(input.values);
  validateResourceFields(values, ["values"]);
  const build = getRequiredBuildData(state);
  const resource = findResource(build.resources, input.resourceId);
  if (resource === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Resource not found");
  }
  if (
    Object.values(values).every((value) => value === undefined) &&
    input.dataSourceName === undefined &&
    input.scopeInstanceId === undefined &&
    input.exposeAsDataSource === undefined
  ) {
    return createRuntimeMutation({
      payload: [],
      result: { resourceId: resource.id },
      invalidatesNamespaces: [],
    });
  }
  const nextResource = createResourceValue({
    ...resource,
    ...values,
  });
  const dataSource = build.dataSources.find(
    (dataSource) =>
      dataSource.type === "resource" && dataSource.resourceId === resource.id
  );
  const scopeInstanceId = input.scopeInstanceId ?? dataSource?.scopeInstanceId;
  const exposeAsDataSource =
    input.exposeAsDataSource ??
    (values.method !== undefined && nextResource.method !== "get"
      ? false
      : dataSource !== undefined ||
        (nextResource.method === "get" && scopeInstanceId !== undefined));
  if (exposeAsDataSource && scopeInstanceId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "scopeInstanceId is required when exposeAsDataSource is true."
    );
  }
  if (
    exposeAsDataSource &&
    build.instances.some((instance) => instance.id === scopeInstanceId) ===
      false
  ) {
    return throwBuilderRuntimeError("NOT_FOUND", "Scope instance not found");
  }
  const dataSourceId = exposeAsDataSource
    ? (dataSource?.id ?? context.createId())
    : dataSource?.id;
  const warnings = getResourceWarnings({
    fields: nextResource,
    state,
    scopeInstanceId,
    resourceId: resource.id,
    exposeAsDataSource,
    fieldPath: ["values"],
    methodPath: ["values", "method"],
  });
  return createRuntimeMutation({
    payload: createResourceUpsertPatchPayload({
      build,
      resource: nextResource,
      dataSourceId,
      scopeInstanceId,
      dataSourceName: input.dataSourceName ?? dataSource?.name,
      exposeAsDataSource,
    }),
    result: {
      resourceId: resource.id,
      dataSourceId: exposeAsDataSource ? dataSourceId : undefined,
      warnings,
    },
    invalidatesNamespaces: [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
      "breakpoints",
      "styleSources",
      "styleSourceSelections",
      "styles",
    ],
  });
};

export const replaceResourceText = (
  state: Pick<BuilderState, "resources">,
  input: z.infer<typeof replaceResourceTextInput>
) => {
  const resourceIds =
    input.resourceIds === undefined ? undefined : new Set(input.resourceIds);
  const matches: Array<{
    resourceId: string;
    field: "name" | "url";
    before: string;
    after: string;
  }> = [];
  let matchingFieldCount = 0;
  for (const resource of getRequiredResources(state).values()) {
    if (resourceIds !== undefined && resourceIds.has(resource.id) === false) {
      continue;
    }
    const fields: Array<{
      field: "name" | "url";
      before: string | undefined;
    }> = [];
    if (input.fields.includes("name")) {
      fields.push({ field: "name", before: resource.name });
    }
    if (input.fields.includes("url")) {
      fields.push({
        field: "url",
        before: getStaticStringLiteral(resource.url),
      });
    }
    for (const { field, before } of fields) {
      if (before === undefined) {
        continue;
      }
      const after = replaceTextValue(before, input);
      if (after === before) {
        continue;
      }
      matchingFieldCount += 1;
      if (matches.length >= input.limit) {
        continue;
      }
      if (field === "url") {
        validateResourceFields({ url: JSON.stringify(after) }, [
          "resources",
          resource.id,
        ]);
      }
      matches.push({ resourceId: resource.id, field, before, after });
    }
  }
  const result = {
    changedCount: matches.length,
    matchingFieldCount,
    truncated: matchingFieldCount > matches.length,
    matches,
  };
  return createRuntimeMutation({
    payload:
      matches.length === 0
        ? []
        : [
            {
              namespace: "resources",
              patches: matches.map(({ resourceId, field, after }) => ({
                op: "replace" as const,
                path: [resourceId, field],
                value: field === "url" ? JSON.stringify(after) : after,
              })),
            },
          ],
    result,
    invalidatesNamespaces: matches.length === 0 ? [] : ["resources"],
  });
};

export const upsertResource = (
  state: Pick<
    BuilderState,
    | "pages"
    | "instances"
    | "props"
    | "dataSources"
    | "resources"
    | "breakpoints"
    | "styleSources"
    | "styleSourceSelections"
    | "styles"
  >,
  input: z.infer<typeof resourceUpsertInput>,
  context: BuilderRuntimeContext
) => {
  const resourceInput = normalizeResourceFieldsInput(input.resource);
  validateResourceFields(resourceInput, ["resource"]);
  const build = getRequiredBuildData(state);
  if (
    input.resourceId !== undefined &&
    findResource(build.resources, input.resourceId) === undefined
  ) {
    return throwBuilderRuntimeError("NOT_FOUND", "Resource not found");
  }
  if (
    input.dataSourceId !== undefined &&
    build.dataSources.some(
      (dataSource) => dataSource.id === input.dataSourceId
    ) === false
  ) {
    return throwBuilderRuntimeError("NOT_FOUND", "Data source not found");
  }

  const resourceId = input.resourceId ?? context.createId();
  const dataSourceId = input.dataSourceId ?? context.createId();
  const resource = createResourceValue({
    id: resourceId,
    name: resourceInput.name,
    control: resourceInput.control,
    method: resourceInput.method,
    url: resourceInput.url,
    searchParams: resourceInput.searchParams,
    headers: resourceInput.headers,
    body: resourceInput.body,
  });

  return createRuntimeMutation({
    payload: createResourceUpsertPatchPayload({
      build,
      resource,
      dataSourceId,
      scopeInstanceId: input.scopeInstanceId,
      dataSourceName: input.dataSourceName,
    }),
    result: { resourceId, dataSourceId },
    invalidatesNamespaces: [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
      "breakpoints",
      "styleSources",
      "styleSourceSelections",
      "styles",
    ],
  });
};

export const upsertResourceProp = (
  state: Pick<
    BuilderState,
    | "pages"
    | "instances"
    | "props"
    | "dataSources"
    | "resources"
    | "breakpoints"
    | "styleSources"
    | "styleSourceSelections"
    | "styles"
  >,
  input: z.infer<typeof resourcePropUpsertInput>,
  context: BuilderRuntimeContext
) => {
  const resourceInput = normalizeResourceFieldsInput(input.resource);
  validateResourceFields(resourceInput, ["resource"]);
  const build = getRequiredBuildData(state);
  if (
    build.instances.some((instance) => instance.id === input.instanceId) ===
    false
  ) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }
  if (
    input.resourceId !== undefined &&
    findResource(build.resources, input.resourceId) === undefined
  ) {
    return throwBuilderRuntimeError("NOT_FOUND", "Resource not found");
  }

  const resourceId = input.resourceId ?? context.createId();
  const resource = createResourceValue({
    id: resourceId,
    name: resourceInput.name,
    control: resourceInput.control,
    method: resourceInput.method,
    url: resourceInput.url,
    searchParams: resourceInput.searchParams,
    headers: resourceInput.headers,
    body: resourceInput.body,
  });
  const dataSource = build.dataSources.find(
    (dataSource) =>
      dataSource.type === "resource" && dataSource.resourceId === resourceId
  );
  const existingProp = findProp(build.props, input.instanceId, input.propName);
  const nextProp = createValidatedPropValueFromInput(
    {
      propId: existingProp?.id,
      instanceId: input.instanceId,
      name: input.propName,
      type: "resource",
      value: resourceId,
    },
    context.createId
  );
  if (nextProp.success === false) {
    return throwBuilderRuntimeError("BAD_REQUEST", nextProp.errors.join("\n"));
  }
  const { payload: propPayload, propIds } = createPropUpsertPayload({
    props: build.props,
    nextProps: [nextProp.prop],
  });
  const dataSourceId = dataSource?.id ?? context.createId();
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([
      ...createResourceUpsertPatchPayload({
        build,
        resource,
        dataSourceId,
        scopeInstanceId: input.scopeInstanceId ?? input.instanceId,
        dataSourceName: input.dataSourceName ?? resource.name,
      }),
      ...propPayload,
    ]),
    result: { resourceId, dataSourceId, propIds },
    invalidatesNamespaces: [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
      "breakpoints",
      "styleSources",
      "styleSourceSelections",
      "styles",
    ],
  });
};

export const deleteResource = (
  state: Pick<BuilderState, "dataSources" | "resources" | "props">,
  input: z.infer<typeof resourceDeleteInput>
) => {
  const resource = findResource(
    getRequiredResources(state).values(),
    input.resourceId
  );
  if (resource === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Resource not found");
  }
  const resultPayload = createResourceDeletePayload({
    resource,
    dataSources: getRequiredDataSources(state).values(),
    props: getRequiredProps(state).values(),
    force: input.force,
  });
  if (resultPayload.isUsed) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Resource is used by props. Pass force to remove those prop references."
    );
  }
  return createRuntimeMutation({
    payload: resultPayload.payload,
    result: {
      resourceId: resource.id,
      dataSourceIds: resultPayload.dataSourceIds,
      propIds: resultPayload.propIds,
    },
    invalidatesNamespaces: ["resources", "dataSources", "props"],
  });
};
