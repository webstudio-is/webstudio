import type { DataSources, Page, Resources, Scope } from "@webstudio-is/sdk";
import { generateExpression } from "./expression";

const getjsonCode = `
const _getjson = async (url: string) => {
  const response = await fetch(url)
  if (response.ok) {
    const data = await response.json()
    return data;
  }
  return {
    error: await response.text()
  }
}
`.trimStart();

export const generateResourcesLoader = ({
  scope,
  page,
  dataSources,
  resources,
}: {
  scope: Scope;
  page: Page;
  dataSources: DataSources;
  resources: Resources;
}) => {
  let generatedStores = "";
  let generatedLoaders = "";
  let hasGetjson = false;

  for (const dataSource of dataSources.values()) {
    if (dataSource.type !== "resource") {
      continue;
    }
    const resource = resources.get(dataSource.resourceId);
    if (resource === undefined) {
      continue;
    }
    // call resource by bound variable name
    const resourceName = scope.getName(resource.id, dataSource.name);
    if (resource.type === "getjson") {
      hasGetjson = true;
      const url = generateExpression({
        expression: resource.url,
        dataSources,
        scope,
      });
      generatedStores += `${resourceName},\n`;
      generatedLoaders += `_getjson(${url}),\n`;
    }
  }

  const paramsVariable = page.pathVariableId
    ? dataSources.get(page.pathVariableId)
    : undefined;
  const paramsName = paramsVariable
    ? scope.getName(paramsVariable.id, paramsVariable.name)
    : undefined;

  let generated = "";
  if (hasGetjson) {
    generated += getjsonCode;
  }
  generated += `type Params = Record<string, string | undefined>\n`;
  generated += `export const loadResources = async (_props: { params: Params }) => {\n`;
  if (paramsName !== undefined) {
    generated += `const ${paramsName} = _props.params\n`;
  }
  generated += `const [\n`;
  generated += generatedStores;
  generated += `] = await Promise.all([\n`;
  generated += generatedLoaders;
  generated += `])\n`;
  generated += `return {\n`;
  generated += generatedStores;
  generated += `} as Record<string, unknown>\n`;
  generated += `}\n`;
  return generated;
};
