import {
  type DataSource,
  type DataSources,
  type Instance,
  type Instances,
  type Props,
  type Resource,
  type Resources,
  type WebstudioData,
  Pages,
  ROOT_INSTANCE_ID,
  SYSTEM_VARIABLE_ID,
  decodeDataVariableId,
  encodeDataVariableId,
  findTreeInstanceIds,
  findTreeInstanceIdsExcludingSlotDescendants,
  getExpressionIdentifiers,
  systemParameter,
  transpileExpression,
} from "@webstudio-is/sdk";
import {
  createJsonStringifyProxy,
  isPlainObject,
} from "@webstudio-is/sdk/runtime";
import { setUnion } from "./shim";

const allowedJsChars = /[A-Za-z_]/;

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

export const computeExpression = (
  expression: string,
  variables: Map<DataSource["name"], unknown>
) => {
  try {
    const usedVariables = new Map();
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
    const proxiedVariables = new Map(
      [...variables.entries()].map(([key, value]) => [
        key,
        isPlainObject(value)
          ? createJsonStringifyProxy(
              Object.isFrozen(value) ? structuredClone(value) : value
            )
          : value,
      ])
    );

    const result = new Function("_variables", code)(proxiedVariables);
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

const findMaskedVariablesByInstanceId = ({
  startingInstanceId,
  parentInstanceById,
  dataSources,
}: {
  startingInstanceId: Instance["id"];
  parentInstanceById: Map<Instance["id"], Instance["id"]>;
  dataSources: DataSources;
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
    for (const dataSource of dataSources.values()) {
      if (dataSource.scopeInstanceId === instanceId) {
        maskedVariables.set(dataSource.name, dataSource.id);
      }
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
    dataSources,
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
  startingInstanceId: Instance["id"];
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
  const pagesList = pages ? [pages.homePage, ...pages.pages] : [];

  let instanceIds = findTreeInstanceIdsExcludingSlotDescendants(
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
    const instanceId = dataSource.scopeInstanceId ?? "";
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
    if (resource.body) {
      resource.body = update(resource.body, instanceId) ?? resource.body;
    }
  }
};

export const findUnsetVariableNames = ({
  startingInstanceId,
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
    startingInstanceId,
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
        dataSources,
      });
      let maskedIdByName = new Map(maskedVariables);
      if (args) {
        maskedIdByName = new Map(maskedIdByName);
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
  data: Omit<WebstudioData, "pages"> & { pages?: Pages },
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
  const startingInstanceId = dataSource.scopeInstanceId ?? "";
  const maskedIdByName = findMaskedVariablesByInstanceId({
    startingInstanceId,
    parentInstanceById: getParentInstanceById(data.instances),
    dataSources: data.dataSources,
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
