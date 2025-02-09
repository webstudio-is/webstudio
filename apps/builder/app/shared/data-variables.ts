import {
  type DataSource,
  type DataSources,
  type Instances,
  type Props,
  Resource,
  type Resources,
  decodeDataVariableId,
  encodeDataVariableId,
  findTreeInstanceIdsExcludingSlotDescendants,
  transpileExpression,
} from "@webstudio-is/sdk";
import {
  createJsonStringifyProxy,
  isPlainObject,
} from "@webstudio-is/sdk/runtime";
import type { InstancePath } from "./awareness";

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

export const findMaskedVariables = ({
  instancePath,
  dataSources,
}: {
  instancePath: InstancePath;
  dataSources: DataSources;
}) => {
  const maskedVariables = new Map<DataSource["name"], DataSource["id"]>();
  // start from the root to descendant
  // so child variables override parent variables
  for (const { instance } of instancePath.slice().reverse()) {
    for (const dataSource of dataSources.values()) {
      if (dataSource.scopeInstanceId === instance.id) {
        maskedVariables.set(dataSource.name, dataSource.id);
      }
    }
  }
  return maskedVariables;
};

export const findUnsetVariableNames = ({
  instancePath,
  instances,
  props,
  dataSources,
  resources,
}: {
  instancePath: InstancePath;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
}) => {
  const unsetVariables = new Set<DataSource["name"]>();
  const [{ instance: startingInstance }] = instancePath;
  const instanceIds = findTreeInstanceIdsExcludingSlotDescendants(
    instances,
    startingInstance.id
  );
  const resourceIds = new Set<Resource["id"]>();

  const collectUnsetVariables = (
    expression: string,
    exclude: string[] = []
  ) => {
    transpileExpression({
      expression,
      replaceVariable: (identifier) => {
        const id = decodeDataVariableId(identifier);
        if (id === undefined && exclude.includes(identifier) === false) {
          unsetVariables.add(decodeDataVariableName(identifier));
        }
      },
    });
  };

  for (const instance of instances.values()) {
    if (instanceIds.has(instance.id) === false) {
      continue;
    }
    for (const child of instance.children) {
      if (child.type === "expression") {
        collectUnsetVariables(child.value);
      }
    }
  }

  for (const prop of props.values()) {
    if (instanceIds.has(prop.instanceId) === false) {
      continue;
    }
    if (prop.type === "expression") {
      collectUnsetVariables(prop.value);
      continue;
    }
    if (prop.type === "action") {
      for (const action of prop.value) {
        collectUnsetVariables(action.code, action.args);
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
    collectUnsetVariables(resource.url);
    for (const header of resource.headers) {
      collectUnsetVariables(header.value);
    }
    if (resource.body) {
      collectUnsetVariables(resource.body);
    }
  }
  return Array.from(unsetVariables);
};

export const rebindTreeVariablesMutable = ({
  instancePath,
  instances,
  props,
  dataSources,
  resources,
}: {
  instancePath: InstancePath;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
}) => {
  const maskedIdByName = findMaskedVariables({ instancePath, dataSources });
  const unsetNameById = new Map<DataSource["id"], DataSource["name"]>();
  for (const { id, name } of dataSources.values()) {
    unsetNameById.set(id, name);
  }
  const [{ instance: startingInstance }] = instancePath;
  const instanceIds = findTreeInstanceIdsExcludingSlotDescendants(
    instances,
    startingInstance.id
  );
  const resourceIds = new Set<Resource["id"]>();

  for (const instance of instances.values()) {
    if (instanceIds.has(instance.id) === false) {
      continue;
    }
    for (const child of instance.children) {
      if (child.type === "expression") {
        child.value = unsetExpressionVariables({
          expression: child.value,
          unsetNameById,
        });
        child.value = restoreExpressionVariables({
          expression: child.value,
          maskedIdByName,
        });
      }
    }
  }

  for (const prop of props.values()) {
    if (instanceIds.has(prop.instanceId) === false) {
      continue;
    }
    if (prop.type === "expression") {
      prop.value = unsetExpressionVariables({
        expression: prop.value,
        unsetNameById,
      });
      prop.value = restoreExpressionVariables({
        expression: prop.value,
        maskedIdByName,
      });
      continue;
    }
    if (prop.type === "action") {
      for (const action of prop.value) {
        const maskedVariablesWithoutArgs = new Map(maskedIdByName);
        for (const arg of action.args) {
          maskedVariablesWithoutArgs.delete(arg);
        }
        action.code = unsetExpressionVariables({
          expression: action.code,
          unsetNameById,
        });
        action.code = restoreExpressionVariables({
          expression: action.code,
          maskedIdByName: maskedVariablesWithoutArgs,
        });
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
    resource.url = unsetExpressionVariables({
      expression: resource.url,
      unsetNameById,
    });
    resource.url = restoreExpressionVariables({
      expression: resource.url,
      maskedIdByName,
    });
    for (const header of resource.headers) {
      header.value = unsetExpressionVariables({
        expression: header.value,
        unsetNameById,
      });
      header.value = restoreExpressionVariables({
        expression: header.value,
        maskedIdByName,
      });
    }
    if (resource.body) {
      resource.body = unsetExpressionVariables({
        expression: resource.body,
        unsetNameById,
      });
      resource.body = restoreExpressionVariables({
        expression: resource.body,
        maskedIdByName,
      });
    }
  }
};
