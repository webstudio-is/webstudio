import { type Expression, type Identifier, parseExpressionAt } from "acorn";
import { simple } from "acorn-walk";
import type { DataSources } from "./schema/data-sources";
import type { Scope } from "./scope";

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
  const addError = (message: string) => {
    return (node: Expression) => {
      diagnostics.push({
        from: node.start,
        to: node.end,
        severity: "error",
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
    const root = parseExpressionAt(expression, 0, {
      ecmaVersion: "latest",
      // support parsing import to forbid explicitly
      sourceType: "module",
    });
    simple(root, {
      Identifier(node) {
        if (availableVariables.has(node.name) === false) {
          addError(`"${node.name}" is not available in the scope`)(node);
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
          addError("Assignment is supported only inside actions")(node);
          return;
        }
        simple(node.left, {
          Identifier(node) {
            if (availableVariables.has(node.name) === false) {
              addError(`"${node.name}" is not available in the scope`)(node);
            }
          },
        });
      },
      // parser forbids to yield inside module
      YieldExpression() {},
      ThisExpression: addError(`"this" keyword is not supported`),
      FunctionExpression: addError("Functions are not supported"),
      UpdateExpression: addError("Increment and decrement are not supported"),
      CallExpression: addError("Functions are not supported"),
      NewExpression: addError("Classes are not supported"),
      SequenceExpression: addError(`Only single expression is supported`),
      ArrowFunctionExpression: addError("Functions are not supported"),
      TaggedTemplateExpression: addError("Tagged template is not supported"),
      ClassExpression: addError("Classes are not supported"),
      MetaProperty: addError("Imports are not supported"),
      AwaitExpression: addError(`"await" keyword is not supported`),
      ImportExpression: addError("Imports are not supported"),
    } satisfies ExpressionVisitor);
  } catch (error) {
    const castedError = error as { message: string; pos: number };
    diagnostics.push({
      from: castedError.pos,
      to: castedError.pos,
      severity: "error",
      message: castedError.message,
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

const dataSourceVariablePrefix = "$ws$dataSource$";

// data source id is generated with nanoid which has "-" in alphabeta
// here "-" is encoded with "__DASH__' in variable name
// https://github.com/ai/nanoid/blob/047686abad8f15aff05f3a2eeedb7c98b6847392/url-alphabet/index.js

export const encodeDataSourceVariable = (id: string) => {
  const encoded = id.replaceAll("-", "__DASH__");
  return `${dataSourceVariablePrefix}${encoded}`;
};

export const decodeDataSourceVariable = (name: string) => {
  if (name.startsWith(dataSourceVariablePrefix)) {
    const encoded = name.slice(dataSourceVariablePrefix.length);
    return encoded.replaceAll("__DASH__", "-");
  }
  return;
};

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
      const depId = decodeDataSourceVariable(identifier);
      const dep = depId ? dataSources.get(depId) : undefined;
      if (dep) {
        usedDataSources?.set(dep.id, dep);
        return scope.getName(dep.id, dep.name);
      }
    },
  });
};

export const executeExpression = (expression: undefined | string) => {
  try {
    const fn = new Function(`return (${expression})`);
    return fn();
  } catch {
    // empty block
  }
};
