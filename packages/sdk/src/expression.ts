import {
  type Expression,
  type Identifier,
  type MemberExpression,
  type Pattern,
  parse,
  parseExpressionAt,
} from "acorn";
import { simple } from "acorn-walk";
import type { DataSource, DataSources } from "./schema/data-sources";
import type { Scope } from "./scope";
import { ROOT_INSTANCE_ID } from "./instances-utils";

export const SYSTEM_VARIABLE_ID = ":system";

export const systemParameter: DataSource = {
  id: SYSTEM_VARIABLE_ID,
  scopeInstanceId: ROOT_INSTANCE_ID,
  type: "parameter",
  name: "system",
};

export type Diagnostic = {
  from: number;
  to: number;
  severity: "error" | "hint" | "info" | "warning";
  message: string;
};

type ExpressionVisitor = {
  [K in Expression["type"]]: (node: Extract<Expression, { type: K }>) => void;
};

type AssignmentTargetKind = "binding" | "memberObject";

const walkAssignmentTarget = (
  node: Pattern,
  visitor: {
    Identifier?: (node: Identifier, kind: AssignmentTargetKind) => void;
    MemberExpression?: (node: MemberExpression) => void;
    UnsupportedPattern?: (node: Pattern) => void;
  }
) => {
  if (node.type === "Identifier") {
    visitor.Identifier?.(node, "binding");
    return;
  }

  if (node.type === "MemberExpression") {
    visitor.MemberExpression?.(node);
    const { object } = node;
    if (object.type === "Identifier") {
      visitor.Identifier?.(object, "memberObject");
    } else if (object.type === "MemberExpression") {
      walkAssignmentTarget(object, visitor);
    }
    return;
  }

  visitor.UnsupportedPattern?.(node);
};

export type VariableValues =
  | ReadonlyMap<Identifier["name"], unknown>
  | Readonly<Record<Identifier["name"], unknown>>;

export type ExpressionValueKind =
  | "array"
  | "bigint"
  | "boolean"
  | "nullish"
  | "number"
  | "object"
  | "string"
  | "unknown";

const stringMethodReturnKindByName = new Map<string, ExpressionValueKind>([
  ["toLowerCase", "string"],
  ["replace", "string"],
  ["split", "array"],
  ["slice", "string"],
  ["at", "unknown"],
  ["endsWith", "boolean"],
  ["includes", "boolean"],
  ["startsWith", "boolean"],
  ["toString", "string"],
  ["toUpperCase", "string"],
  ["toLocaleLowerCase", "string"],
  ["toLocaleUpperCase", "string"],
]);

const arrayMethodReturnKindByName = new Map<string, ExpressionValueKind>([
  ["at", "unknown"],
  ["includes", "boolean"],
  ["join", "string"],
  ["slice", "array"],
  ["toString", "string"],
]);

export const allowedStringMethods = new Set(
  stringMethodReturnKindByName.keys()
);

export const allowedArrayMethods = new Set(arrayMethodReturnKindByName.keys());

const getVariableValue = (
  variableValues: undefined | VariableValues,
  name: Identifier["name"]
) => {
  if (variableValues === undefined) {
    return;
  }
  const maybeMap = variableValues as Partial<ReadonlyMap<string, unknown>>;
  if (
    typeof maybeMap.has === "function" &&
    typeof maybeMap.get === "function"
  ) {
    if (maybeMap.has(name)) {
      return { value: maybeMap.get(name) };
    }
    return;
  }
  const record = variableValues as Readonly<Record<string, unknown>>;
  if (Object.hasOwn(record, name)) {
    return { value: record[name] };
  }
};

const getValueKind = (value: unknown): ExpressionValueKind => {
  if (Array.isArray(value)) {
    return "array";
  }
  if (value === undefined || value === null) {
    return "nullish";
  }
  switch (typeof value) {
    case "bigint":
      return "bigint";
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    case "object":
      return "object";
    default:
      return "unknown";
  }
};

const getMethodReturnKind = (
  receiverKind: ExpressionValueKind,
  methodName: string
): ExpressionValueKind => {
  if (receiverKind === "array") {
    return arrayMethodReturnKindByName.get(methodName) ?? "unknown";
  }
  if (receiverKind === "string") {
    return stringMethodReturnKindByName.get(methodName) ?? "unknown";
  }
  if (receiverKind === "unknown") {
    const stringReturnKind = stringMethodReturnKindByName.get(methodName);
    const arrayReturnKind = arrayMethodReturnKindByName.get(methodName);
    if (stringReturnKind && arrayReturnKind === undefined) {
      return stringReturnKind;
    }
    if (arrayReturnKind && stringReturnKind === undefined) {
      return arrayReturnKind;
    }
    if (stringReturnKind === arrayReturnKind) {
      return stringReturnKind ?? "unknown";
    }
    return "unknown";
  }
  return methodName === "toString" ? "string" : "unknown";
};

const isMethodSupported = (
  receiverKind: ExpressionValueKind,
  methodName: string
) => {
  if (receiverKind === "unknown") {
    return (
      allowedStringMethods.has(methodName) ||
      allowedArrayMethods.has(methodName)
    );
  }
  if (receiverKind === "string") {
    return stringMethodReturnKindByName.has(methodName);
  }
  if (receiverKind === "array") {
    return arrayMethodReturnKindByName.has(methodName);
  }
  if (receiverKind === "nullish") {
    return false;
  }
  return methodName === "toString";
};

const getExpressionNodeValueKind = (
  node: Expression,
  variableValues: undefined | VariableValues
): ExpressionValueKind => {
  if (node.type === "Identifier") {
    if (node.name === "undefined") {
      return "nullish";
    }
    const variable = getVariableValue(variableValues, node.name);
    return variable ? getValueKind(variable.value) : "unknown";
  }
  if (node.type === "Literal") {
    return getValueKind(node.value);
  }
  if (node.type === "ArrayExpression") {
    return "array";
  }
  if (node.type === "ObjectExpression") {
    return "object";
  }
  if (node.type === "TemplateLiteral") {
    return "string";
  }
  if (
    node.type === "ChainExpression" ||
    node.type === "ParenthesizedExpression"
  ) {
    return getExpressionNodeValueKind(node.expression, variableValues);
  }
  if (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    node.callee.object.type !== "Super" &&
    node.callee.property.type === "Identifier"
  ) {
    const receiverKind = getExpressionNodeValueKind(
      node.callee.object,
      variableValues
    );
    const methodName = node.callee.property.name;
    if (isMethodSupported(receiverKind, methodName)) {
      return getMethodReturnKind(receiverKind, methodName);
    }
  }
  return "unknown";
};

export const getExpressionValueKind = ({
  expression,
  variableValues,
}: {
  expression: string;
  variableValues?: VariableValues;
}): ExpressionValueKind => {
  try {
    const node = parseExpressionAt(expression, 0, { ecmaVersion: "latest" });
    return getExpressionNodeValueKind(node, variableValues);
  } catch {
    return "unknown";
  }
};

export const lintExpression = ({
  expression,
  availableVariables = new Set(),
  allowAssignment = false,
  variableValues,
}: {
  expression: string;
  availableVariables?: Set<Identifier["name"]>;
  allowAssignment?: boolean;
  variableValues?: VariableValues;
}): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const addMessage = (
    message: string,
    severity: "error" | "warning" = "error"
  ) => {
    return (node: { start: number; end: number }) => {
      diagnostics.push({
        // tune error position after wrapping expression with parentheses
        from: node.start - 1,
        to: node.end - 1,
        severity,
        message: message,
      });
    };
  };
  // allow empty expression
  if (expression.trim().length === 0) {
    diagnostics.push({
      from: 0,
      to: 0,
      severity: "error",
      message: "Expression cannot be empty",
    });
    return diagnostics;
  }
  try {
    // wrap expression with parentheses to force acorn parse whole expression
    // instead of just first valid part
    const root = parse(`(${expression})`, {
      ecmaVersion: "latest",
      // support parsing import to forbid explicitly
      sourceType: "module",
    });

    simple(root, {
      Identifier(node) {
        if (availableVariables.has(node.name) === false) {
          addMessage(
            `"${node.name}" is not defined in the scope`,
            "warning"
          )(node);
        }
      },
      Literal() {},
      ArrayExpression() {},
      ObjectExpression() {},
      UnaryExpression() {},
      BinaryExpression() {},
      LogicalExpression() {},
      MemberExpression() {},
      ConditionalExpression() {},
      TemplateLiteral() {},
      ChainExpression() {},
      ParenthesizedExpression() {},
      AssignmentExpression(node) {
        if (allowAssignment === false) {
          addMessage("Assignment is supported only inside actions")(node);
          return;
        }
        walkAssignmentTarget(node.left, {
          Identifier(node, kind) {
            if (kind !== "binding") {
              return;
            }
            if (availableVariables.has(node.name) === false) {
              addMessage(
                `"${node.name}" is not defined in the scope`,
                "warning"
              )(node);
            }
          },
          UnsupportedPattern: addMessage(
            "Destructuring assignment is not supported"
          ),
        });
      },
      // parser forbids to yield inside module
      YieldExpression() {},
      ThisExpression: addMessage(`"this" keyword is not supported`),
      FunctionExpression: addMessage("Functions are not supported"),
      UpdateExpression: addMessage("Increment and decrement are not supported"),
      CallExpression(node) {
        let calleeName;
        if (node.callee.type === "MemberExpression") {
          if (node.callee.property.type === "Identifier") {
            const methodName = node.callee.property.name;
            const receiverKind =
              node.callee.object.type === "Super"
                ? "unknown"
                : getExpressionNodeValueKind(
                    node.callee.object,
                    variableValues
                  );
            if (isMethodSupported(receiverKind, methodName)) {
              return;
            }
            calleeName = methodName;
          }
        } else if (node.callee.type === "Identifier") {
          calleeName = node.callee.name;
        }
        if (calleeName) {
          addMessage(`"${calleeName}" function is not supported`)(node);
        } else {
          addMessage("Functions are not supported")(node);
        }
      },
      NewExpression: addMessage("Classes are not supported"),
      SequenceExpression: addMessage(`Only single expression is supported`),
      ArrowFunctionExpression: addMessage("Functions are not supported"),
      TaggedTemplateExpression: addMessage("Tagged template is not supported"),
      ClassExpression: addMessage("Classes are not supported"),
      MetaProperty: addMessage("Imports are not supported"),
      AwaitExpression: addMessage(`"await" keyword is not supported`),
      ImportExpression: addMessage("Imports are not supported"),
    } satisfies ExpressionVisitor);
  } catch (error) {
    const castedError = error as { message: string; pos: number };
    diagnostics.push({
      // tune error position after wrapping expression with parentheses
      from: castedError.pos - 1,
      to: castedError.pos - 1,
      severity: "error",
      // trim auto generated error location
      // to not conflict with tuned position
      message: castedError.message.replaceAll(/\s+\(\d+:\d+\)$/g, ""),
    });
  }
  return diagnostics;
};

const isLiteralNode = (node: Expression): boolean => {
  if (node.type === "Identifier" && node.name === "undefined") {
    return true;
  }
  if (node.type === "Literal") {
    return true;
  }
  if (node.type === "ArrayExpression") {
    return node.elements.every((node) => {
      if (node === null || node.type === "SpreadElement") {
        return false;
      }
      return isLiteralNode(node);
    });
  }
  if (node.type === "ObjectExpression") {
    return node.properties.every((property) => {
      if (property.type === "SpreadElement") {
        return false;
      }
      const key = property.key;
      const isIdentifierKey =
        key.type === "Identifier" && property.computed === false;
      const isLiteralKey = key.type === "Literal";
      return (isLiteralKey || isIdentifierKey) && isLiteralNode(property.value);
    });
  }
  return false;
};

/**
 * check whether provided expression is a literal value
 * like "", 0 or { param: "value" }
 * which does not depends on any variable
 */
export const isLiteralExpression = (expression: string) => {
  try {
    const node = parseExpressionAt(expression, 0, { ecmaVersion: "latest" });
    return isLiteralNode(node);
  } catch {
    // treat invalid expression as non-literal
    return false;
  }
};

export const getExpressionIdentifiers = (expression: string) => {
  const identifiers = new Set<string>();
  try {
    const root = parseExpressionAt(expression, 0, { ecmaVersion: "latest" });
    simple(root, {
      Identifier: (node) => identifiers.add(node.name),
      AssignmentExpression(node) {
        walkAssignmentTarget(node.left, {
          Identifier: (node) => identifiers.add(node.name),
        });
      },
    });
  } catch {
    // empty block
  }
  return identifiers;
};

/**
 * transpile expression into executable one
 *
 * add optional chaining operator to every member expression
 * to access any field without runtime errors
 *
 * replace variable names if necessary
 */
export const transpileExpression = ({
  expression,
  executable = false,
  replaceVariable,
}: {
  expression: string;
  executable?: boolean;
  replaceVariable?: (
    identifier: string,
    assignee: boolean
  ) => string | undefined | void;
}) => {
  let root;
  try {
    root = parseExpressionAt(expression, 0, { ecmaVersion: "latest" });
  } catch (error) {
    const message = (error as Error).message;
    // throw new error to trace error in our code instead of acorn
    throw Error(`${message} in ${JSON.stringify(expression)}`);
  }
  const assignmentTargetMemberRanges: [start: number, end: number][] = [];
  if (executable) {
    simple(root, {
      AssignmentExpression(node) {
        walkAssignmentTarget(node.left, {
          MemberExpression(node) {
            assignmentTargetMemberRanges.push([node.start, node.end]);
          },
        });
      },
    });
  }
  const replacements: [start: number, end: number, fragment: string][] = [];
  const replacementIndexByRange = new Map<string, number>();
  const addReplacement = (
    start: number,
    end: number,
    fragment: string,
    { replaceExisting = false }: { replaceExisting?: boolean } = {}
  ) => {
    const range = `${start}:${end}`;
    const existingIndex = replacementIndexByRange.get(range);
    if (existingIndex !== undefined) {
      if (replaceExisting) {
        replacements[existingIndex] = [start, end, fragment];
      }
      return;
    }
    replacementIndexByRange.set(range, replacements.length);
    replacements.push([start, end, fragment]);
  };
  const replaceIdentifier = (node: Identifier, assignee: boolean) => {
    const newName = replaceVariable?.(node.name, assignee);
    if (newName) {
      addReplacement(node.start, node.end, newName, {
        replaceExisting: assignee,
      });
    }
  };
  simple(root, {
    Identifier: (node) => replaceIdentifier(node, false),
    AssignmentExpression(node) {
      walkAssignmentTarget(node.left, {
        Identifier: (node) => replaceIdentifier(node, true),
      });
    },
    MemberExpression(node) {
      if (executable === false || node.optional) {
        return;
      }
      if (
        assignmentTargetMemberRanges.some(
          ([start, end]) => start === node.start && end === node.end
        )
      ) {
        return;
      }
      // a . b -> a ?. b
      if (node.computed === false) {
        const dotIndex = expression.indexOf(".", node.object.end);
        addReplacement(dotIndex, dotIndex, "?");
      }
      // a [b] -> a ?.[b]
      if (node.computed === true) {
        const dotIndex = expression.indexOf("[", node.object.end);
        addReplacement(dotIndex, dotIndex, "?.");
      }
    },
    CallExpression(node) {
      if (executable === false || node.optional) {
        return;
      }
      // Add optional chaining to method calls: obj.method() -> obj?.method?.()
      if (node.callee.type === "MemberExpression") {
        // Find the opening parenthesis after the method name
        const openParenIndex = expression.indexOf("(", node.callee.end);
        if (openParenIndex !== -1) {
          addReplacement(openParenIndex, openParenIndex, "?.");
        }
      }
    },
  });
  // order from the latest to the first insertion to not break other positions
  replacements.sort(([leftStart], [rightStart]) => rightStart - leftStart);
  for (const [start, end, fragment] of replacements) {
    const before = expression.slice(0, start);
    const after = expression.slice(end);
    expression = before + fragment + after;
  }
  return expression;
};

/**
 * parse object expression into key value map
 * where each value is expression
 */
export const parseObjectExpression = (expression: string) => {
  const map = new Map<string, string>();
  let root;
  try {
    root = parseExpressionAt(expression, 0, { ecmaVersion: "latest" });
  } catch (error) {
    return map;
  }
  if (root.type !== "ObjectExpression") {
    return map;
  }
  for (const property of root.properties) {
    if (property.type === "SpreadElement") {
      continue;
    }
    if (property.computed) {
      continue;
    }
    let key;
    if (property.key.type === "Identifier") {
      key = property.key.name;
    } else if (
      property.key.type === "Literal" &&
      typeof property.key.value === "string"
    ) {
      key = property.key.value;
    } else {
      continue;
    }
    const valueExpression = expression.slice(
      property.value.start,
      property.value.end
    );
    map.set(key, valueExpression);
  }
  return map;
};

/**
 * generate key value map into object expression
 * after updating individual value expressions
 */
export const generateObjectExpression = (map: Map<string, string>) => {
  let generated = "{\n";
  for (const [key, valueExpression] of map) {
    const keyExpression = JSON.stringify(key);
    generated += `  ${keyExpression}: ${valueExpression},\n`;
  }
  generated += `}`;
  return generated;
};

const dataSourceVariablePrefix = "$ws$dataSource$";

// data source id is generated with nanoid which has "-" in alphabeta
// here "-" is encoded with "__DASH__' in variable name
// https://github.com/ai/nanoid/blob/047686abad8f15aff05f3a2eeedb7c98b6847392/url-alphabet/index.js

export const encodeDataVariableId = (id: string) => {
  if (id === SYSTEM_VARIABLE_ID) {
    return "$ws$system";
  }
  const encoded = id.replaceAll("-", "__DASH__");
  return `${dataSourceVariablePrefix}${encoded}`;
};
export { encodeDataVariableId as encodeDataSourceVariable };

export const decodeDataVariableId = (name: string) => {
  if (name === "$ws$system") {
    return SYSTEM_VARIABLE_ID;
  }
  if (name.startsWith(dataSourceVariablePrefix)) {
    const encoded = name.slice(dataSourceVariablePrefix.length);
    return encoded.replaceAll("__DASH__", "-");
  }
  return;
};
export { decodeDataVariableId as decodeDataSourceVariable };

export const generateExpression = ({
  expression,
  dataSources,
  usedDataSources,
  scope,
}: {
  expression: string;
  dataSources: DataSources;
  usedDataSources: DataSources;
  scope: Scope;
}) => {
  return transpileExpression({
    expression,
    executable: true,
    replaceVariable: (identifier) => {
      const depId = decodeDataVariableId(identifier);
      let dep = depId ? dataSources.get(depId) : undefined;
      if (depId === SYSTEM_VARIABLE_ID) {
        dep = systemParameter;
      }
      if (dep) {
        usedDataSources?.set(dep.id, dep);
        return scope.getName(dep.id, dep.name);
      }
      return "undefined";
    },
  });
};

/**
 * edge case utility for "statoc" expression without variables
 */
export const executeExpression = (expression: undefined | string) => {
  try {
    const fn = new Function(`return (${expression})`);
    return fn();
  } catch {
    // empty block
  }
};
