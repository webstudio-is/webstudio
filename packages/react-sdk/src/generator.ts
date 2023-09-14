import {
  createScope,
  type DataSources,
  type Instance,
  type Instances,
  type Page,
  type Props,
} from "@webstudio-is/sdk";
import type { WsComponentMeta } from "./components/component-meta";
import {
  getIndexesWithinAncestors,
  type IndexesWithinAncestors,
} from "./instance-utils";
import { generateDataSources } from "./expression";

type PageData = {
  page: Page;
  metas: Map<Instance["component"], WsComponentMeta>;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
};

export type GeneratedUtils = {
  indexesWithinAncestors: IndexesWithinAncestors;
  getDataSourcesLogic: (
    getVariable: (id: string) => unknown,
    setVariable: (id: string, value: unknown) => void
  ) => Map<string, unknown>;
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

  const { variables, body, output } = generateDataSources({
    scope: createScope(["_getVariable", "_setVariable", "_output"]),
    typed: true,
    dataSources: siteData.dataSources,
    props: siteData.props,
  });
  let generatedDataSources = "";
  generatedDataSources += `const getDataSourcesLogic = (\n`;
  generatedDataSources += `  _getVariable: (id: string) => unknown,\n`;
  generatedDataSources += `  _setVariable: (id: string, value: unknown) => void\n`;
  generatedDataSources += `) => {\n`;
  for (const [dataSourceId, variable] of variables) {
    const { valueName, setterName } = variable;
    const initialValue = JSON.stringify(variable.initialValue);
    generatedDataSources += `let ${valueName} = _getVariable("${dataSourceId}") ?? ${initialValue};\n`;
    generatedDataSources += `let ${setterName} = (value: unknown) => _setVariable("${dataSourceId}", value);\n`;
  }
  generatedDataSources += body;
  generatedDataSources += `let _output = new Map();\n`;
  for (const [dataSourceId, variableName] of output) {
    generatedDataSources += `_output.set('${dataSourceId}', ${variableName})\n`;
  }
  generatedDataSources += `return _output\n`;
  generatedDataSources += `}\n`;

  return `
  /* eslint-disable */

  ${generatedIndexesWithinAncestors.trim()}

  ${generatedDataSources}

  export const utils = {
    indexesWithinAncestors,
    getDataSourcesLogic,
  };

  /* eslint-enable */
  `;
};
