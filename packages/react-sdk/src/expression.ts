import jsep from "jsep";
import jsepAssignment from "@jsep-plugin/assignment";
import jsepObject from "@jsep-plugin/object";
import type {
  UpdateExpression,
  AssignmentExpression,
} from "@jsep-plugin/assignment";
import type { ObjectExpression, Property } from "@jsep-plugin/object";
import { type Identifier, parseExpressionAt } from "acorn";
import { simple } from "acorn-walk";
import type { DataSources, Scope } from "@webstudio-is/sdk";

jsep.literals["undefined"] = "undefined";

jsep.plugins.register(jsepAssignment);
jsep.plugins.register(jsepObject);

type TransformIdentifier = (id: string, assignee: boolean) => string;

type Node =
  | jsep.CoreExpression
  | UpdateExpression
  | AssignmentExpression
  | ObjectExpression
  | Property;

const generateCode = (
  node: Node,
  failOnForbidden: boolean,
  options: {
    effectful: boolean;
    optional: boolean;
    transformIdentifier: TransformIdentifier;
  }
): string => {
  if (node.type === "Identifier") {
    return options.transformIdentifier(node.name, false);
  }
  if (node.type === "MemberExpression") {
    const object = generateCode(node.object as Node, failOnForbidden, options);
    const property = node.property as Node;
    let propertyString: string;
    // prevent transforming identifiers from member expressions like "b" in "a.b"
    if (property.type === "Identifier" && node.computed === false) {
      propertyString = property.name;
    } else {
      propertyString = generateCode(property, failOnForbidden, options);
    }
    if (node.computed) {
      if (options.optional) {
        return `${object}?.[${propertyString}]`;
      } else {
        return `${object}[${propertyString}]`;
      }
    }
    if (options.optional) {
      return `${object}?.${propertyString}`;
    } else {
      return `${object}.${propertyString}`;
    }
  }
  if (node.type === "Literal") {
    return node.raw;
  }
  if (node.type === "UnaryExpression") {
    const arg = generateCode(node.argument as Node, failOnForbidden, options);
    return `${node.operator}${arg}`;
  }
  if (node.type === "BinaryExpression") {
    const left = generateCode(node.left as Node, failOnForbidden, options);
    const right = generateCode(node.right as Node, failOnForbidden, options);
    return `${left} ${node.operator} ${right}`;
  }
  if (node.type === "ArrayExpression") {
    const elements = node.elements.map((element) =>
      generateCode(element as Node, failOnForbidden, options)
    );
    return `[${elements.join(", ")}]`;
  }
  if (node.type === "CallExpression") {
    if (failOnForbidden) {
      const callee = generateCode(node.callee as Node, false, options);
      throw Error(`Cannot call "${callee}"`);
    }
    const callee = generateCode(node.callee as Node, failOnForbidden, options);
    const args = node.arguments.map((arg) =>
      generateCode(arg as Node, failOnForbidden, options)
    );
    return `${callee}(${args.join(", ")})`;
  }
  if (node.type === "ThisExpression") {
    if (failOnForbidden) {
      throw Error(`"this" is not supported`);
    }
    return "this";
  }
  if (node.type === "ConditionalExpression") {
    throw Error("Ternary operator is not supported");
  }
  if (node.type === "Compound") {
    throw Error("Cannot use multiple expressions");
  }
  if (node.type === "AssignmentExpression") {
    if (node.operator !== "=") {
      throw Error(`Only "=" assignment operator is supported`);
    }
    if (options.effectful === false) {
      throw Error(`Cannot use assignment in this expression`);
    }
    const left = generateCode(node.left as Node, failOnForbidden, {
      ...options,
      // override and mark all identifiers inside of left expression as assignee
      transformIdentifier: (id) => options.transformIdentifier(id, true),
    });
    const right = generateCode(node.right as Node, failOnForbidden, options);
    return `${left} ${node.operator} ${right}`;
  }
  if (node.type === "UpdateExpression") {
    throw Error(`"${node.operator}" operator is not supported`);
  }
  if (node.type === "ObjectExpression") {
    const properties = node.properties.map((property) =>
      generateCode(property, failOnForbidden, options)
    );
    return `{${properties.join(", ")}}`;
  }
  if (node.type === "Property") {
    const key = node.key as Node;
    let keyString: string;
    if (key.type === "Identifier" && node.computed === false) {
      keyString = key.name;
    } else {
      keyString = generateCode(key, failOnForbidden, options);
    }
    const value = generateCode(node.value as Node, failOnForbidden, options);
    if (node.computed) {
      return `[${keyString}]: ${value}`;
    }
    return `${keyString}: ${value}`;
  }
  node satisfies never;
  return "";
};

export const validateExpression = (
  code: string,
  options?: {
    /**
     * Enable assignment operator for actions
     */
    effectful?: boolean;
    /**
     * Add optional chaining to access nested properties safely
     * and without checks even when not exist
     */
    optional?: boolean;
    transformIdentifier?: TransformIdentifier;
  }
) => {
  const {
    effectful = false,
    optional = false,
    transformIdentifier = (id: string) => id,
  } = options ?? {};
  const expression = jsep(code) as Node;
  return generateCode(expression, true, {
    effectful,
    optional,
    transformIdentifier,
  });
};

const isLiteralNode = (node: Node): boolean => {
  if (node.type === "Literal") {
    return true;
  }
  if (node.type === "ArrayExpression") {
    return (node.elements as Node[]).every(isLiteralNode);
  }
  if (node.type === "ObjectExpression") {
    return node.properties.every((property) => {
      const key = property.key as Node;
      const isIdentifierKey =
        key.type === "Identifier" && property.computed === false;
      const isLiteralKey = key.type === "Literal";
      return (
        (isLiteralKey || isIdentifierKey) &&
        isLiteralNode(property.value as Node)
      );
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
    const node = jsep(expression) as Node;
    return isLiteralNode(node);
  } catch {
    // treat invalid expression as non-literal
    return false;
  }
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
  const root = parseExpressionAt(expression, 0, { ecmaVersion: "latest" });
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
