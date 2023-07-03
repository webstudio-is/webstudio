import jsep from "jsep";

type TransformIdentifier = (id: string) => string;

type Node = jsep.CoreExpression;

const generateCode = (
  node: Node,
  failOnForbidden: boolean,
  transformIdentifier: TransformIdentifier
): string => {
  if (node.type === "Identifier") {
    return transformIdentifier(node.name);
  }
  if (node.type === "MemberExpression") {
    if (failOnForbidden) {
      const object = generateCode(
        node.object as Node,
        false,
        transformIdentifier
      );
      const property = generateCode(
        node.property as Node,
        false,
        transformIdentifier
      );
      throw Error(`Cannot access "${property}" of "${object}"`);
    }
    const object = generateCode(
      node.object as Node,
      failOnForbidden,
      transformIdentifier
    );
    const property = generateCode(
      node.property as Node,
      failOnForbidden,
      transformIdentifier
    );
    return `${object}.${property}`;
  }
  if (node.type === "Literal") {
    return node.raw;
  }
  if (node.type === "UnaryExpression") {
    const arg = generateCode(
      node.argument as Node,
      failOnForbidden,
      transformIdentifier
    );
    return `${node.operator}${arg}`;
  }
  if (node.type === "BinaryExpression") {
    const left = generateCode(
      node.left as Node,
      failOnForbidden,
      transformIdentifier
    );
    const right = generateCode(
      node.right as Node,
      failOnForbidden,
      transformIdentifier
    );
    return `${left} ${node.operator} ${right}`;
  }
  if (node.type === "ArrayExpression") {
    const elements = node.elements.map((element) =>
      generateCode(element as Node, failOnForbidden, transformIdentifier)
    );
    return `[${elements.join(", ")}]`;
  }
  if (node.type === "CallExpression") {
    if (failOnForbidden) {
      const callee = generateCode(
        node.callee as Node,
        false,
        transformIdentifier
      );
      throw Error(`Cannot call "${callee}"`);
    }
    const callee = generateCode(
      node.callee as Node,
      failOnForbidden,
      transformIdentifier
    );
    const args = node.arguments.map((arg) =>
      generateCode(arg as Node, failOnForbidden, transformIdentifier)
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
  node satisfies never;
  return "";
};

export const validateExpression = (
  code: string,
  transformIdentifier: TransformIdentifier = (id) => id
) => {
  const expression = jsep(code) as Node;
  return generateCode(expression, true, transformIdentifier);
};

const sortTopologically = (
  list: Set<string>,
  depsById: Map<string, Set<string>>,
  explored = new Set<string>(),
  sorted: string[] = []
) => {
  for (const id of list) {
    if (explored.has(id)) {
      continue;
    }
    explored.add(id);
    const deps = depsById.get(id);
    if (deps) {
      sortTopologically(deps, depsById, explored, sorted);
    }
    sorted.push(id);
  }
  return sorted;
};

/**
 * Generates a function body expecting map as _variables argument
 * and outputing map of results
 */
export const generateExpressionsComputation = (
  variables: Set<string>,
  expressions: Map<string, string>
) => {
  const depsById = new Map<string, Set<string>>();
  for (const [id, code] of expressions) {
    const deps = new Set<string>();
    validateExpression(code, (identifier) => {
      if (variables.has(identifier)) {
        return identifier;
      }
      if (expressions.has(identifier)) {
        deps.add(identifier);
        return identifier;
      }
      throw Error(`Unknown dependency "${identifier}"`);
    });
    depsById.set(id, deps);
  }

  const sortedExpressions = sortTopologically(
    new Set(expressions.keys()),
    depsById
  );

  // generate code computing all expressions
  let generatedCode = "";

  for (const id of variables) {
    generatedCode += `const ${id} = _variables.get('${id}');\n`;
  }

  for (const id of sortedExpressions) {
    const code = expressions.get(id);
    if (code === undefined) {
      continue;
    }
    generatedCode += `const ${id} = (${code});\n`;
  }

  generatedCode += `return new Map([\n`;
  for (const id of sortedExpressions) {
    generatedCode += `  ['${id}', ${id}],\n`;
  }
  generatedCode += `]);`;

  return generatedCode;
};

export const executeExpressions = (
  variables: Map<string, unknown>,
  expressions: Map<string, string>
) => {
  const generatedCode = generateExpressionsComputation(
    new Set(variables.keys()),
    expressions
  );
  const executeFn = new Function("_variables", generatedCode);
  const values = executeFn(variables) as Map<string, unknown>;
  return values;
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
