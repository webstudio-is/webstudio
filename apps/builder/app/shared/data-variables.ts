import {
  type DataSource,
  type DataSources,
  type Instance,
  type Instances,
  type Props,
  type Resource,
  type Resources,
  type WebstudioData,
  type Pages,
  ROOT_INSTANCE_ID,
  SYSTEM_VARIABLE_ID,
  dataSourceVariableValue,
  collectionComponent,
  decodeDataVariableId,
  decodeDataSourceVariable,
  encodeDataVariableId,
  encodeDataSourceVariable,
  findTreeInstanceIds,
  findTreeInstanceIdsExcludingSlotDescendants,
  getAllPages,
  getExpressionIdentifiers,
  systemParameter,
  transpileExpression,
} from "@webstudio-is/sdk";
import type { z } from "zod";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import {
  createJsonStringifyProxy,
  isPlainObject,
} from "@webstudio-is/sdk/runtime";
import { setUnion } from "./shim";
import { compactBuildPatchPayload } from "./build-patch-utils";

const allowedJsChars = /[A-Za-z_]/;
const compiledExpressionCacheLimit = 10_000;
type BuildPatchPayload = z.infer<typeof buildPatchTransaction>["payload"];
type DataVariable = Extract<DataSource, { type: "variable" }>;

export const dataVariableValueInput = dataSourceVariableValue;
type CompiledExpression = (variables: {
  get: (key: DataSource["name"]) => unknown;
  // Dynamic expressions intentionally preserve the historical `any` result.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) => any;

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

const createDataVariable = ({
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
}): {
  payload: BuildPatchPayload;
  errors: Array<
    | { type: "duplicate-id"; dataSourceId: DataSource["id"] }
    | DataVariableNameError
  >;
} => {
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
        namespace: "dataSources",
        patches: [
          {
            op: "add",
            path: [dataSourceId],
            value: createDataVariable({
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
}): { payload: BuildPatchPayload; error?: DataVariableNameError } => {
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
    payload: compactBuildPatchPayload([
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

const compiledExpressionCache = new Map<string, CompiledExpression>();

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
        // access all variable values from specified map
        const name = decodeDataVariableName(identifier);
        usedVariables.set(identifier, name);
      }
    },
  });
  let code = "";
  // add only used variables in expression and get values
  // from variables map without additional serializing of these values
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

/**
 * variable names can contain any characters and
 * this utility encodes data variable name into valid js identifier
 * for example
 * "Collection Item" -> "Collection$20$Item"
 */
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

/**
 * Variable name should be restorable from encoded js identifier
 */
export const decodeDataVariableName = (identifier: string) => {
  const name = identifier.replaceAll(/\$(\d+)\$/g, (_match, code) =>
    String.fromCodePoint(code)
  );
  return name;
};

/**
 * replace all encoded ids with encoded names
 * to make expression transferrable
 */
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

/**
 * restore variable ids by js identifiers
 */
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
    /**
     *
     * We are using structuredClone on frozen values because, for some reason,
     * the Proxy example below throws a cryptic error:
     * TypeError: 'get' on proxy: property 'data' is a read-only and non-configurable
     * data property on the proxy target, but the proxy did not return its actual value
     * (expected '[object Array]' but got '[object Array]').
     *
     * ```
     * const createJsonStringifyProxy = (target) => {
     *   return new Proxy(target, {
     *     get(target, prop, receiver) {
     *
     *       console.log((prop in target), prop)
     *
     *       const value = Reflect.get(target, prop, receiver);
     *
     *       if (typeof value === "object" && value !== null) {
     *         return createJsonStringifyProxy(value);
     *       }
     *
     *       return value;
     *     },
     *   });
     * };
     * const obj = Object.freeze({ data: [1, 2, 3, 4] });
     * const proxy = createJsonStringifyProxy(obj)
     * proxy.data
     *
     * ```
     */
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
  } catch (error) {
    console.error(error);
  }
};

const getParentInstanceById = (instances: Instances) => {
  const parentInstanceById = new Map<Instance["id"], Instance["id"]>();
  for (const instance of instances.values()) {
    // interrupt lookup because slot variables cannot be passed to slot content
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
  // allow accessing global variables everywhere
  instanceIdsPath.push(ROOT_INSTANCE_ID);
  const maskedVariables = new Map<DataSource["name"], DataSource["id"]>();
  // global system variable always present
  maskedVariables.set("system", SYSTEM_VARIABLE_ID);
  // start from the root to descendant
  // so child variables override parent variables
  for (const instanceId of instanceIdsPath.reverse()) {
    const instance = instances.get(instanceId);
    const scopedDataSources = dataSourcesByScopeInstanceId.get(instanceId);
    if (scopedDataSources === undefined) {
      continue;
    }
    for (const dataSource of scopedDataSources) {
      // when current instance is collection
      // ignore its collection item parameter
      // when rebind variables
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
    // global variables can be accessed on all pages and inside of slots
    if (startingInstanceId === ROOT_INSTANCE_ID) {
      instanceIds = setUnion(
        instanceIds,
        findTreeInstanceIds(instances, page.rootInstanceId)
      );
    }

    // global and body variables can be accessed in pages meta
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
  // unset all variables
  const unsetNameById = new Map<DataSource["id"], DataSource["name"]>();
  for (const dataSource of dataSources.values()) {
    unsetNameById.set(dataSource.id, dataSource.name);
  }
  // precompute parent instances outside of traverse
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
      // restore all masked variables of current scope
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
    WebstudioData,
    "instances" | "props" | "dataSources" | "resources"
  > & {
    pages?: Pages;
  },
  variableId: DataSource["id"]
) => {
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
  // unset deleted variable in expressions
  traverseExpressions({
    ...data,
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

const valuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

const cloneMap = <Key, Value>(map: Map<Key, Value>) =>
  new Map<Key, Value>(
    Array.from(map, ([key, value]) => [key, structuredClone(value)])
  );

const createMapPatchPayload = <
  Namespace extends BuildPatchPayload[number]["namespace"],
  Key extends string,
  Value,
>(
  namespace: Namespace,
  before: Map<Key, Value>,
  after: Map<Key, Value>
): BuildPatchPayload[number] => {
  const patches: BuildPatchPayload[number]["patches"] = [];
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
}: Pick<WebstudioData, "instances" | "props" | "dataSources" | "resources"> & {
  pages?: Pages;
  variableId: DataSource["id"];
}): {
  payload: BuildPatchPayload;
  deletedVariable?: DataSource;
} => {
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
  const payload = compactBuildPatchPayload([
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
