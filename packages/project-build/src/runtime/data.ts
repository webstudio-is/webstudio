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
import deepEqual from "fast-deep-equal";
import {
  createJsonStringifyProxy,
  isPlainObject,
} from "@webstudio-is/sdk/runtime";
import type { CompactBuild } from "../types";
import {
  compactBuilderPatchPayload,
  type BuilderPatchChange,
} from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import { throwBuilderRuntimeError } from "./errors";
import { getNamedExpressionErrors } from "./expression-validation";
import { createRuntimeMutation } from "./mutation";

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
  dataSourceId: z.string().optional(),
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

type DataVariable = Extract<DataSource, { type: "variable" }>;

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

const getParentInstanceById = (instances: Instances) => {
  const parentInstanceById = new Map<Instance["id"], Instance["id"]>();
  for (const instance of instances.values()) {
    if (instance.component === "Slot") {
      continue;
    }
    for (const child of instance.children) {
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

const valuesEqual = (left: unknown, right: unknown) => deepEqual(left, right);

const cloneMap = <Key, Value>(map: Map<Key, Value>) =>
  new Map<Key, Value>(
    Array.from(map, ([key, value]) => [key, structuredClone(value)])
  );

const createMapPatchPayload = <
  Namespace extends BuilderPatchChange["namespace"],
  Key extends string,
  Value,
>(
  namespace: Namespace,
  before: Map<Key, Value>,
  after: Map<Key, Value>
): BuilderPatchChange => {
  const patches: BuilderPatchChange["patches"] = [];
  for (const [key, value] of before) {
    const nextValue = after.get(key);
    if (nextValue === undefined) {
      patches.push({ op: "remove", path: [key] });
      continue;
    }
    if (valuesEqual(value, nextValue) === false) {
      patches.push({ op: "replace", path: [key], value: nextValue });
    }
  }
  for (const [key, value] of after) {
    if (before.has(key) === false) {
      patches.push({ op: "add", path: [key], value });
    }
  }
  return { namespace, patches };
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

  const beforePages = pages === undefined ? undefined : structuredClone(pages);
  const nextData = {
    pages: beforePages === undefined ? undefined : structuredClone(beforePages),
    instances: cloneMap(instances),
    props: cloneMap(props),
    dataSources: cloneMap(dataSources),
    resources: cloneMap(resources),
  };
  deleteVariableMutable(nextData, variableId);
  const payload = compactBuilderPatchPayload([
    beforePages === undefined || valuesEqual(beforePages, nextData.pages)
      ? { namespace: "pages" as const, patches: [] }
      : {
          namespace: "pages" as const,
          patches: [
            { op: "replace" as const, path: [], value: nextData.pages },
          ],
        },
    createMapPatchPayload("instances", instances, nextData.instances),
    createMapPatchPayload("props", props, nextData.props),
    createMapPatchPayload("dataSources", dataSources, nextData.dataSources),
    createMapPatchPayload("resources", resources, nextData.resources),
  ]);
  return { payload, deletedVariable };
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
  const errors = [];
  for (const dataSource of dataSources) {
    if (dataSource.id === dataSourceId) {
      errors.push({ type: "duplicate-id" as const, dataSourceId });
      break;
    }
  }
  const nameError = validateDataVariableNameWithSources({
    dataSources,
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
  state: Pick<BuilderState, "dataSources">,
  input: z.infer<typeof dataVariableCreateInput>,
  context: BuilderRuntimeContext
) => {
  const dataSources = getRequiredDataSources(state);
  const dataSourceId = input.dataSourceId ?? context.createId();
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
  return createRuntimeMutation({
    payload,
    result: { dataSourceId },
    invalidatesNamespaces: ["dataSources"],
  });
};

export const updateDataVariable = (
  state: Pick<BuilderState, "dataSources">,
  input: z.infer<typeof dataVariableUpdateInput>
) => {
  const dataSources = getRequiredDataSources(state);
  const variable = findDataVariable(dataSources.values(), input.dataSourceId);
  if (variable === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Variable not found");
  }
  const { payload, error } = createDataVariableUpdatePayload({
    variable,
    values: input.values,
    dataSources: dataSources.values(),
  });
  if (error) {
    return throwBuilderRuntimeError("BAD_REQUEST", error.message);
  }
  return createRuntimeMutation({
    payload,
    result: { dataSourceId: variable.id },
    invalidatesNamespaces: ["dataSources"],
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
  errors: readonly string[]
) => {
  for (const message of errors) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message,
    });
  }
};

const resourceFieldsInputBase = resource
  .omit({ id: true })
  .extend({ control: z.enum(["system", "graphql"]).optional() });

export const resourceFieldsInput = resourceFieldsInputBase.superRefine(
  (fields, context) => {
    addExpressionIssues(context, getResourceExpressionErrors(fields));
  }
);

export const resourceFieldsUpdateInput = resourceFieldsInputBase
  .partial()
  .superRefine((fields, context) => {
    addExpressionIssues(context, getResourceExpressionErrors(fields));
  });

export const resourceCreateInput = z.object({
  resourceId: z.string().optional(),
  resource: resourceFieldsInput,
  dataSourceId: z.string().optional(),
  scopeInstanceId: z.string().optional(),
  dataSourceName: z.string().optional(),
});

export const resourceUpdateInput = z.object({
  resourceId: z.string(),
  values: resourceFieldsUpdateInput,
  dataSourceName: z.string().optional(),
  scopeInstanceId: z.string().optional(),
});

export const resourceDeleteInput = z.object({
  resourceId: z.string(),
  force: z.boolean().optional(),
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

export const getResourceExpressionErrors = (
  fields: Partial<Pick<Resource, "url" | "body" | "headers" | "searchParams">>
) => {
  const errors: string[] = [];
  const validate = (name: string, expression: string | undefined) => {
    errors.push(...getNamedExpressionErrors(name, expression));
  };
  validate("url", fields.url);
  validate("body", fields.body);
  for (const [index, header] of (fields.headers ?? []).entries()) {
    validate(`headers.${index}.value`, header.value);
  }
  for (const [index, searchParam] of (fields.searchParams ?? []).entries()) {
    validate(`searchParams.${index}.value`, searchParam.value);
  }
  return errors;
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

const createMapPatches = <Value>({
  before,
  after,
  getPath,
}: {
  before: Map<string, Value>;
  after: Map<string, Value>;
  getPath: (id: string) => string[];
}) => {
  const patches: BuilderPatchChange["patches"] = [];
  for (const [id, value] of after) {
    if (before.has(id) === false) {
      patches.push({ op: "add", path: getPath(id), value });
      continue;
    }
    if (deepEqual(before.get(id), value) === false) {
      patches.push({ op: "replace", path: getPath(id), value });
    }
  }
  for (const id of before.keys()) {
    if (after.has(id) === false) {
      patches.push({ op: "remove", path: getPath(id) });
    }
  }
  return patches;
};

export const createWebstudioDataPatchPayload = ({
  before,
  after,
}: {
  before: WebstudioData;
  after: WebstudioData;
}): BuilderPatchChange[] => {
  const pagesPatches = [
    ...createMapPatches({
      before: before.pages.pages,
      after: after.pages.pages,
      getPath: (id) => ["pages", id],
    }),
    ...createMapPatches({
      before: before.pages.pageTemplates ?? new Map(),
      after: after.pages.pageTemplates ?? new Map(),
      getPath: (id) => ["pageTemplates", id],
    }),
    ...createMapPatches({
      before: before.pages.folders,
      after: after.pages.folders,
      getPath: (id) => ["folders", id],
    }),
  ];

  const payload: BuilderPatchChange[] = [
    { namespace: "pages", patches: pagesPatches },
    {
      namespace: "assets",
      patches: createMapPatches({
        before: before.assets,
        after: after.assets,
        getPath: (id) => [id],
      }),
    },
    {
      namespace: "instances",
      patches: createMapPatches({
        before: before.instances,
        after: after.instances,
        getPath: (id) => [id],
      }),
    },
    {
      namespace: "props",
      patches: createMapPatches({
        before: before.props,
        after: after.props,
        getPath: (id) => [id],
      }),
    },
    {
      namespace: "dataSources",
      patches: createMapPatches({
        before: before.dataSources,
        after: after.dataSources,
        getPath: (id) => [id],
      }),
    },
    {
      namespace: "resources",
      patches: createMapPatches({
        before: before.resources,
        after: after.resources,
        getPath: (id) => [id],
      }),
    },
    {
      namespace: "breakpoints",
      patches: createMapPatches({
        before: before.breakpoints,
        after: after.breakpoints,
        getPath: (id) => [id],
      }),
    },
    {
      namespace: "styleSourceSelections",
      patches: createMapPatches({
        before: before.styleSourceSelections,
        after: after.styleSourceSelections,
        getPath: (id) => [id],
      }),
    },
    {
      namespace: "styleSources",
      patches: createMapPatches({
        before: before.styleSources,
        after: after.styleSources,
        getPath: (id) => [id],
      }),
    },
    {
      namespace: "styles",
      patches: createMapPatches({
        before: before.styles,
        after: after.styles,
        getPath: (id) => [id],
      }),
    },
  ];
  return compactBuilderPatchPayload(payload);
};

export const upsertResourceMutable = ({
  data,
  resource,
  dataSourceId,
  scopeInstanceId,
  dataSourceName,
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
}) => {
  data.resources.set(resource.id, resource);
  if (dataSourceId !== undefined && scopeInstanceId !== undefined) {
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
}) => {
  const before = createWebstudioDataFromBuild({ build });
  const after = createWebstudioDataFromBuild({ build });
  upsertResourceMutable({
    data: after,
    resource,
    dataSourceId,
    scopeInstanceId,
    dataSourceName,
  });
  return createWebstudioDataPatchPayload({ before, after });
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
  resource: z.infer<typeof resourceFieldsInput>;
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
  const expressionErrors = getResourceExpressionErrors(input.resource);
  if (expressionErrors.length > 0) {
    return throwBuilderRuntimeError("BAD_REQUEST", expressionErrors.join("\n"));
  }
  const build = getRequiredBuildData(state);
  const resourceId = input.resourceId ?? context.createId();
  const dataSourceId =
    input.scopeInstanceId === undefined
      ? undefined
      : (input.dataSourceId ?? context.createId());
  const resultPayload = createResourceCreatePayload({
    resourceId,
    resource: input.resource,
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
    name: input.resource.name,
    control: input.resource.control,
    method: input.resource.method,
    url: input.resource.url,
    searchParams: input.resource.searchParams,
    headers: input.resource.headers,
    body: input.resource.body,
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
  input: z.infer<typeof resourceUpdateInput>
) => {
  const expressionErrors = getResourceExpressionErrors(input.values);
  if (expressionErrors.length > 0) {
    return throwBuilderRuntimeError("BAD_REQUEST", expressionErrors.join("\n"));
  }
  const build = getRequiredBuildData(state);
  const resource = findResource(build.resources, input.resourceId);
  if (resource === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Resource not found");
  }
  const directPayload = createResourceUpdatePayload({
    resource,
    values: input.values,
    dataSources: build.dataSources,
    dataSourceName: input.dataSourceName,
    scopeInstanceId: input.scopeInstanceId,
  });
  if (directPayload.length === 0) {
    return createRuntimeMutation({
      payload: [],
      result: { resourceId: resource.id },
      invalidatesNamespaces: [],
    });
  }
  const nextResource = createResourceValue({
    ...resource,
    ...input.values,
  });
  const dataSource = build.dataSources.find(
    (dataSource) =>
      dataSource.type === "resource" && dataSource.resourceId === resource.id
  );
  return createRuntimeMutation({
    payload: createResourceUpsertPatchPayload({
      build,
      resource: nextResource,
      dataSourceId: dataSource?.id,
      scopeInstanceId: input.scopeInstanceId ?? dataSource?.scopeInstanceId,
      dataSourceName: input.dataSourceName ?? dataSource?.name,
    }),
    result: { resourceId: resource.id },
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
