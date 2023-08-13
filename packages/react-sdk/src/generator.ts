import type {
  DataSources,
  Instance,
  Instances,
  Page,
  Props,
} from "@webstudio-is/project-build";
import type { WsComponentMeta } from "./components/component-meta";
import {
  getIndexesWithinAncestors,
  type IndexesWithinAncestors,
} from "./instance-utils";
import {
  encodeDataSourceVariable,
  generateComputingExpressions,
  generateEffectfulExpression,
} from "./expression";
import type { DataSourceValues } from "./context";

type PageData = {
  page: Page;
  metas: Map<Instance["component"], WsComponentMeta>;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
};

export type GeneratedUtils = {
  indexesWithinAncestors: IndexesWithinAncestors;
  executeComputingExpressions: (values: DataSourceValues) => DataSourceValues;
  executeEffectfulExpression: (
    expression: string,
    args: DataSourceValues,
    values: DataSourceValues
  ) => DataSourceValues;
};

/**
 * Generates data based utilities at build time
 * Requires this import statement in scope
 * import * as sdk from "@webstudio-is/react-sdk";
 */
export const generateUtilsExport = (siteData: PageData) => {
  const indexesWithinAncestors = getIndexesWithinAncestors(
    siteData.metas,
    siteData.instances,
    [siteData.page.rootInstanceId]
  );
  let indexesWithinAncestorsEntries = "";
  for (const [key, value] of indexesWithinAncestors) {
    const keyString = JSON.stringify(key);
    const valueString = JSON.stringify(value);
    indexesWithinAncestorsEntries += `[${keyString}, ${valueString}],\n`;
  }
  const generatedIndexesWithinAncestors = `
  const indexesWithinAncestors = new Map<string, number>([
  ${indexesWithinAncestorsEntries}
  ]);
  `;

  const variables = new Set<string>();
  const expressions = new Map<string, string>();
  for (const dataSource of siteData.dataSources.values()) {
    if (dataSource.type === "variable") {
      variables.add(encodeDataSourceVariable(dataSource.id));
    }
    if (dataSource.type === "expression") {
      expressions.set(encodeDataSourceVariable(dataSource.id), dataSource.code);
    }
  }
  const generatedExecuteComputingExpressions = `
  const rawExecuteComputingExpressions = (
    _variables: Map<string, unknown>
  ): Map<string, unknown> => {
    ${generateComputingExpressions(expressions, variables)}
  };
  const executeComputingExpressions = (variables: Map<string, unknown>) => {
    const encodedvariables = sdk.encodeVariablesMap(variables);
    const encodedResult = rawExecuteComputingExpressions(encodedvariables);
    return sdk.decodeVariablesMap(encodedResult);
  };
  `;

  let effectfulExpressionsEntries = "";
  for (const prop of siteData.props.values()) {
    if (prop.type === "action") {
      for (const executableValue of prop.value) {
        const codeString = JSON.stringify(executableValue.code);
        const generatedCode = generateEffectfulExpression(
          executableValue.code,
          new Set(executableValue.args),
          variables
        );
        const generatedFunction = `(_args: Map<string, any>, _variables: Map<string, any>) => { ${generatedCode} }`;

        effectfulExpressionsEntries += `[${codeString}, ${generatedFunction}],\n`;
      }
    }
  }
  const generatedExecuteEffectfulExpression = `const generatedEffectfulExpressions = new Map<
    string,
    (args: Map<string, any>, variables: Map<string, any>) => Map<string, unknown>
  >([
  ${effectfulExpressionsEntries}
  ]);

  const rawExecuteEffectfulExpression = (
    code: string,
    args: Map<string, unknown>,
    variables: Map<string, unknown>
  ): Map<string, unknown> => {
    if(generatedEffectfulExpressions.has(code)) {
      return generatedEffectfulExpressions.get(code)!(args, variables);
    }
    console.error("Effectful expression not found", code);
    throw new Error("Effectful expression not found");
  };

  const executeEffectfulExpression = (
    code: string,
    args: Map<string, unknown>,
    variables: Map<string, unknown>
  ) => {
    const encodedvariables = sdk.encodeVariablesMap(variables);
    const encodedResult = rawExecuteEffectfulExpression(code, args, encodedvariables);
    return sdk.decodeVariablesMap(encodedResult);
  };
  `;

  return `
  /* eslint-disable */

  ${generatedIndexesWithinAncestors.trim()}

  ${generatedExecuteComputingExpressions.trim()}

  ${generatedExecuteEffectfulExpression.trim()}

  export const utils = {
    indexesWithinAncestors,
    executeComputingExpressions,
    executeEffectfulExpression,
  };

  /* eslint-enable */
  `;
};
