import jsep from "jsep";
import jsepAssignment from "@jsep-plugin/assignment";
import type {
  UpdateExpression,
  AssignmentExpression,
} from "@jsep-plugin/assignment";
import type { DataSources, Props, Scope } from "@webstudio-is/sdk";

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

/*

// header

let formState_1 = _getVariable('#formState_1')
let set$formState = value => _setVariable('#formStateId', value)

// body

let formInitial_1 = formState_1 === 'initial'

let onStateChange_1 = (state) => {
  formState_1 = state;

  set$formState(formState_1)
}

// footer

let _output = new Map();
_output.set('#', formState_1)
_output.set('#', formInitial_1)
_output.set('#', onStateChange_1)
return _output

*/

type DataSourceId = string;
type DataSourceOrPropId = string;
type VariableName = string;

export const generateDataSources = ({
  scope,
  typed = false,
  dataSources,
  props,
}: {
  scope: Scope;
  typed?: boolean;
  dataSources: DataSources;
  props: Props;
}) => {
  const variables = new Map<
    DataSourceId,
    { valueName: VariableName; setterName: VariableName; initialValue: unknown }
  >();
  let body = "";
  const output = new Map<DataSourceOrPropId, VariableName>();

  for (const dataSource of dataSources.values()) {
    if (dataSource.type === "variable") {
      // save variables to generate header and footer depending on environment
      const valueName = scope.getName(dataSource.id, dataSource.name);
      const setterName = scope.getName(
        `set$${dataSource.id}`,
        `set$${dataSource.name}`
      );
      const initialValue = dataSource.value.value;
      output.set(dataSource.id, valueName);
      variables.set(dataSource.id, { valueName, setterName, initialValue });
    }
  }

  for (const prop of props.values()) {
    // generate prop expressions
    if (prop.type === "dataSource") {
      const dataSource = dataSources.get(prop.value);
      if (dataSource?.type !== "expression") {
        continue;
      }
      const name = scope.getName(prop.id, prop.name);
      output.set(prop.id, name);
      const code = validateExpression(dataSource.code, {
        transformIdentifier: (identifier) => {
          const depId = decodeDataSourceVariable(identifier);
          const dep = depId ? dataSources.get(depId) : undefined;
          if (dep) {
            return scope.getName(dep.id, dep.name);
          }
          // eslint-disable-next-line no-console
          console.error(`Unknown dependency "${identifier}"`);
          return identifier;
        },
      });
      body += `let ${name} = (${code});\n`;
    }

    // generate actions assigning variables and invoking their setters
    if (prop.type === "action") {
      const name = scope.getName(prop.id, prop.name);
      output.set(prop.id, name);
      const setters = new Set<DataSourceId>();
      let args: undefined | string[] = undefined;
      let newCode = "";
      for (const value of prop.value) {
        args = value.args;
        newCode += validateExpression(value.code, {
          effectful: true,
          transformIdentifier: (identifier, assignee) => {
            if (args?.includes(identifier)) {
              return identifier;
            }
            const depId = decodeDataSourceVariable(identifier);
            const dep = depId ? dataSources.get(depId) : undefined;
            if (dep) {
              const name = scope.getName(dep.id, dep.name);
              if (assignee) {
                setters.add(dep.id);
              }
              return name;
            }
            // eslint-disable-next-line no-console
            console.error(`Unknown dependency "${identifier}"`);
            return identifier;
          },
        });
        newCode += `\n`;
      }
      if (args === undefined) {
        continue;
      }
      if (typed) {
        args = args.map((arg) => `${arg}: any`);
      }
      body += `let ${name} = (${args.join(", ")}) => {\n`;
      body += newCode;
      for (const dataSourceId of setters.values()) {
        const variable = variables.get(dataSourceId);
        if (variable) {
          body += `${variable.setterName}(${variable.valueName})\n`;
        }
      }
      body += `}\n`;
    }
  }

  return {
    variables,
    body,
    output,
  };
};
