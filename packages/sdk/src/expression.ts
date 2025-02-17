import {
  type Expression,
  type Identifier,
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

export const lintExpression = ({
  expression,
  availableVariables = new Set(),
  allowAssignment = false,
}: {
  expression: string;
  availableVariables?: Set<Identifier["name"]>;
  allowAssignment?: boolean;
}): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const addMessage = (
    message: string,
    severity: "error" | "warning" = "error"
  ) => {
    return (node: Expression) => {
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
        simple(node.left, {
          Identifier(node) {
            if (availableVariables.has(node.name) === false) {
              addMessage(
                `"${node.name}" is not defined in the scope`,
                "warning"
              )(node);
            }
          },
        });
      },
      // parser forbids to yield inside module
      YieldExpression() {},
      ThisExpression: addMessage(`"this" keyword is not supported`),
      FunctionExpression: addMessage("Functions are not supported"),
      UpdateExpression: addMessage("Increment and decrement are not supported"),
      CallExpression: addMessage("Functions are not supported"),
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
        simple(node.left, {
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
  const replacements: [start: number, end: number, fragment: string][] = [];
  const replaceIdentifier = (node: Identifier, assignee: boolean) => {
    const newName = replaceVariable?.(node.name, assignee);
    if (newName) {
      replacements.push([node.start, node.end, newName]);
    }
  };
  simple(root, {
    Identifier: (node) => replaceIdentifier(node, false),
    AssignmentExpression(node) {
      simple(node.left, {
        Identifier: (node) => replaceIdentifier(node, true),
      });
    },
    MemberExpression(node) {
      if (executable === false || node.optional) {
        return;
      }
      // a . b -> a ?. b
      if (node.computed === false) {
        const dotIndex = expression.indexOf(".", node.object.end);
        replacements.push([dotIndex, dotIndex, "?"]);
      }
      // a [b] -> a ?.[b]
      if (node.computed === true) {
        const dotIndex = expression.indexOf("[", node.object.end);
        replacements.push([dotIndex, dotIndex, "?."]);
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
