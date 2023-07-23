import jsep from "jsep";
import jsepAssignment from "@jsep-plugin/assignment";
import type {
  UpdateExpression,
  AssignmentExpression,
} from "@jsep-plugin/assignment";

jsep.plugins.register(jsepAssignment);

type TransformIdentifier = (id: string, assignee: boolean) => string;

type Node = jsep.CoreExpression | UpdateExpression | AssignmentExpression;

const generateCode = (
  node: Node,
  failOnForbidden: boolean,
  effectful: boolean,
  transformIdentifier: TransformIdentifier
): string => {
  if (node.type === "Identifier") {
    return transformIdentifier(node.name, false);
  }
  if (node.type === "MemberExpression") {
    if (failOnForbidden) {
      const object = generateCode(
        node.object as Node,
        false,
        effectful,
        transformIdentifier
      );
      const property = generateCode(
        node.property as Node,
        false,
        effectful,
        transformIdentifier
      );
      throw Error(`Cannot access "${property}" of "${object}"`);
    }
    const object = generateCode(
      node.object as Node,
      failOnForbidden,
      effectful,
      transformIdentifier
    );
    const property = generateCode(
      node.property as Node,
      failOnForbidden,
      effectful,
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
      effectful,
      transformIdentifier
    );
    return `${node.operator}${arg}`;
  }
  if (node.type === "BinaryExpression") {
    const left = generateCode(
      node.left as Node,
      failOnForbidden,
      effectful,
      transformIdentifier
    );
    const right = generateCode(
      node.right as Node,
      failOnForbidden,
      effectful,
      transformIdentifier
    );
    return `${left} ${node.operator} ${right}`;
  }
  if (node.type === "ArrayExpression") {
    const elements = node.elements.map((element) =>
      generateCode(
        element as Node,
        failOnForbidden,
        effectful,
        transformIdentifier
      )
    );
    return `[${elements.join(", ")}]`;
  }
  if (node.type === "CallExpression") {
    if (failOnForbidden) {
      const callee = generateCode(
        node.callee as Node,
        false,
        effectful,
        transformIdentifier
      );
      throw Error(`Cannot call "${callee}"`);
    }
    const callee = generateCode(
      node.callee as Node,
      failOnForbidden,
      effectful,
      transformIdentifier
    );
    const args = node.arguments.map((arg) =>
      generateCode(arg as Node, failOnForbidden, effectful, transformIdentifier)
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
    if (effectful === false) {
      throw Error(`Cannot use assignment in this expression`);
    }
    const left = generateCode(
      node.left as Node,
      failOnForbidden,
      effectful,
      // override and mark all identifiers inside of left expression as assignee
      (id) => transformIdentifier(id, true)
    );
    const right = generateCode(
      node.right as Node,
      failOnForbidden,
      effectful,
      transformIdentifier
    );
    return `${left} ${node.operator} ${right}`;
  }
  if (node.type === "UpdateExpression") {
    throw Error(`"${node.operator}" operator is not supported`);
  }
  node satisfies never;
  return "";
};

export const validateExpression = (
  code: string,
  options?: { effectful?: boolean; transformIdentifier?: TransformIdentifier }
) => {
  const { effectful = false, transformIdentifier = (id: string) => id } =
    options ?? {};
  const expression = jsep(code) as Node;
  return generateCode(expression, true, effectful, transformIdentifier);
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
export const generateComputingExpressions = (
  expressions: Map<string, string>,
  allowedVariables: Set<string>
) => {
  const depsById = new Map<string, Set<string>>();
  const inputVariables = new Set<string>();
  for (const [id, code] of expressions) {
    const deps = new Set<string>();
    validateExpression(code, {
      transformIdentifier: (identifier) => {
        if (allowedVariables.has(identifier)) {
          inputVariables.add(identifier);
          return identifier;
        }
        if (expressions.has(identifier)) {
          deps.add(identifier);
          return identifier;
        }
        throw Error(`Unknown dependency "${identifier}"`);
      },
    });
    depsById.set(id, deps);
  }

  const sortedExpressions = sortTopologically(
    new Set(expressions.keys()),
    depsById
  );

  // generate code computing all expressions
  let generatedCode = "";

  for (const id of inputVariables) {
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

export const executeComputingExpressions = (
  expressions: Map<string, string>,
  variables: Map<string, unknown>
) => {
  const generatedCode = generateComputingExpressions(
    expressions,
    new Set(variables.keys())
  );
  const executeFn = new Function("_variables", generatedCode);
  const values = executeFn(variables) as Map<string, unknown>;
  return values;
};

export const generateEffectfulExpression = (
  code: string,
  args: Set<string>,
  allowedVariables: Set<string>
) => {
  const inputVariables = new Set<string>();
  const outputVariables = new Set<string>();
  validateExpression(code, {
    effectful: true,
    transformIdentifier: (identifier, assignee) => {
      if (args.has(identifier)) {
        return identifier;
      }
      if (allowedVariables.has(identifier)) {
        if (assignee) {
          outputVariables.add(identifier);
        } else {
          inputVariables.add(identifier);
        }
        return identifier;
      }
      throw Error(`Unknown dependency "${identifier}"`);
    },
  });

  // generate code computing all expressions
  let generatedCode = "";

  for (const id of args) {
    generatedCode += `let ${id} = _args.get('${id}');\n`;
  }
  for (const id of inputVariables) {
    generatedCode += `let ${id} = _variables.get('${id}');\n`;
  }
  for (const id of outputVariables) {
    if (inputVariables.has(id) === false) {
      generatedCode += `let ${id};\n`;
    }
  }

  generatedCode += `${code};\n`;

  generatedCode += `return new Map([\n`;
  for (const id of outputVariables) {
    generatedCode += `  ['${id}', ${id}],\n`;
  }
  generatedCode += `]);`;

  return generatedCode;
};

export const executeEffectfulExpression = (
  code: string,
  args: Map<string, unknown>,
  variables: Map<string, unknown>
) => {
  const generatedCode = generateEffectfulExpression(
    code,
    new Set(args.keys()),
    new Set(variables.keys())
  );
  const executeFn = new Function("_variables", "_args", generatedCode);
  const values = executeFn(variables, args) as Map<string, unknown>;
  return values;
};

const computeExpressionDependencies = (
  expressions: Map<string, string>,
  expressionId: string,
  dependencies: Map<string, Set<string>>
) => {
  // prevent recalculating expressions over again
  const depsById = dependencies.get(expressionId);
  if (depsById) {
    return depsById;
  }
  const parentDeps = new Set<string>();
  const code = expressions.get(expressionId);
  if (code === undefined) {
    return parentDeps;
  }
  // write before recursive call to avoid infinite cycle
  dependencies.set(expressionId, parentDeps);
  validateExpression(code, {
    transformIdentifier: (id) => {
      parentDeps.add(id);
      const childDeps = computeExpressionDependencies(
        expressions,
        id,
        dependencies
      );
      for (const depId of childDeps) {
        parentDeps.add(depId);
      }
      return id;
    },
  });
  return parentDeps;
};

export const computeExpressionsDependencies = (
  expressions: Map<string, string>
) => {
  const dependencies = new Map<string, Set<string>>();
  for (const id of expressions.keys()) {
    computeExpressionDependencies(expressions, id, dependencies);
  }
  return dependencies;
};

type Values = Map<string, unknown>;

const dataSourceVariablePrefix = "$ws$dataSource$";

// data source id is generated with nanoid which has "-" in alphabeta
// here "-" is encoded with "__DASH__' in variable name
// https://github.com/ai/nanoid/blob/047686abad8f15aff05f3a2eeedb7c98b6847392/url-alphabet/index.js

export const encodeDataSourceVariable = (id: string) => {
  const encoded = id.replaceAll("-", "__DASH__");
  return `${dataSourceVariablePrefix}${encoded}`;
};

export const encodeVariablesMap = (values: Values) => {
  const encodedValues: Values = new Map();
  for (const [id, value] of values) {
    encodedValues.set(encodeDataSourceVariable(id), value);
  }
  return encodedValues;
};

export const decodeDataSourceVariable = (name: string) => {
  if (name.startsWith(dataSourceVariablePrefix)) {
    const encoded = name.slice(dataSourceVariablePrefix.length);
    return encoded.replaceAll("__DASH__", "-");
  }
  return;
};

export const decodeVariablesMap = (values: Values) => {
  const decodedValues: Values = new Map();
  for (const [name, value] of values) {
    const id = decodeDataSourceVariable(name);
    if (id !== undefined) {
      decodedValues.set(id, value);
    }
  }
  return decodedValues;
};
