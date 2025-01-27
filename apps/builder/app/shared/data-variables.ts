import {
  type DataSource,
  decodeDataVariableId,
  encodeDataVariableId,
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
