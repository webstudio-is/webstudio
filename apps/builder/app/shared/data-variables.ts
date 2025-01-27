import {
  type DataSource,
  decodeDataVariableId,
  encodeDataVariableId,
  transpileExpression,
} from "@webstudio-is/sdk";

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
