import {
  type DataSource,
  type DataSources,
  type Instance,
  type Instances,
  type Props,
  type Resource,
  type Resources,
  type WebstudioData,
  ROOT_INSTANCE_ID,
  decodeDataVariableId,
  encodeDataVariableId,
  findTreeInstanceIdsExcludingSlotDescendants,
  transpileExpression,
} from "@webstudio-is/sdk";
import {
  createJsonStringifyProxy,
  isPlainObject,
} from "@webstudio-is/sdk/runtime";

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

const findMaskedVariablesByInstanceId = ({
  startingInstanceId,
  instances,
  dataSources,
}: {
  startingInstanceId: Instance["id"];
  instances: Instances;
  dataSources: DataSources;
}) => {
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
  let currentId: undefined | string = startingInstanceId;
  const instanceIdsPath: Instance["id"][] = [];
  while (currentId) {
    instanceIdsPath.push(currentId);
    currentId = parentInstanceById.get(currentId);
  }
  // allow accessing global variables everywhere
  instanceIdsPath.push(ROOT_INSTANCE_ID);
  const maskedVariables = new Map<DataSource["name"], DataSource["id"]>();
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
    instances,
    dataSources,
  });
  const availableVariables: DataSource[] = [];
  for (const dataSourceId of maskedVariables.values()) {
    const dataSource = dataSources.get(dataSourceId);
    if (dataSource) {
      availableVariables.push(dataSource);
    }
  }
  return availableVariables;
};

const traverseExpressions = ({
  startingInstanceId,
  instances,
  props,
  dataSources,
  resources,
  update,
}: {
  startingInstanceId: Instance["id"];
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
  update: (expression: string, args?: string[]) => void | string;
}) => {
  const instanceIds = findTreeInstanceIdsExcludingSlotDescendants(
    instances,
    startingInstanceId
  );
  const resourceIds = new Set<Resource["id"]>();

  for (const instance of instances.values()) {
    if (instanceIds.has(instance.id) === false) {
      continue;
    }
    for (const child of instance.children) {
      if (child.type === "expression") {
        const newExpression = update(child.value);
        if (newExpression !== undefined) {
          child.value = newExpression;
        }
      }
    }
  }

  for (const prop of props.values()) {
    if (instanceIds.has(prop.instanceId) === false) {
      continue;
    }
    if (prop.type === "expression") {
      const newExpression = update(prop.value);
      if (newExpression !== undefined) {
        prop.value = newExpression;
      }
      continue;
    }
    if (prop.type === "action") {
      for (const action of prop.value) {
        const newExpression = update(action.code, action.args);
        if (newExpression !== undefined) {
          action.code = newExpression;
        }
      }
      continue;
    }
    if (prop.type === "resource") {
      resourceIds.add(prop.value);
      continue;
    }
  }

  for (const dataSource of dataSources.values()) {
    if (
      instanceIds.has(dataSource.scopeInstanceId) &&
      dataSource.type === "resource"
    ) {
      resourceIds.add(dataSource.resourceId);
    }
  }

  for (const resource of resources.values()) {
    if (resourceIds.has(resource.id) === false) {
      continue;
    }
    const newExpression = update(resource.url);
    if (newExpression !== undefined) {
      resource.url = newExpression;
    }
    for (const header of resource.headers) {
      const newExpression = update(header.value);
      if (newExpression !== undefined) {
        header.value = newExpression;
      }
    }
    if (resource.body) {
      const newExpression = update(resource.body);
      if (newExpression !== undefined) {
        resource.body = newExpression;
      }
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
    startingInstanceId: startingInstanceId,
    instances,
    props,
    dataSources,
    resources,
    update: (expression, args = []) => {
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

export const rebindTreeVariablesMutable = ({
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
  const maskedVariables = findMaskedVariablesByInstanceId({
    startingInstanceId,
    dataSources,
    instances,
  });
  const unsetNameById = new Map<DataSource["id"], DataSource["name"]>();
  for (const { id, name } of dataSources.values()) {
    unsetNameById.set(id, name);
  }
  traverseExpressions({
    startingInstanceId,
    instances,
    props,
    dataSources,
    resources,
    update: (expression, args) => {
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
  data: Omit<WebstudioData, "pages">,
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
  const maskedIdByName = findMaskedVariablesByInstanceId({
    startingInstanceId: dataSource.scopeInstanceId,
    instances: data.instances,
    dataSources: data.dataSources,
  });
  // unset deleted variable in expressions
  traverseExpressions({
    ...data,
    startingInstanceId: dataSource.scopeInstanceId,
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
