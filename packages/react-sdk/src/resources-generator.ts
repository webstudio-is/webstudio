import type { DataSources, Page, Resources, Scope } from "@webstudio-is/sdk";
import { generateExpression } from "./expression";

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
  let generatedOutput = "";
  let generatedLoaders = "";
  let hasResources = false;

  for (const dataSource of dataSources.values()) {
    if (dataSource.type !== "resource") {
      continue;
    }
    const resource = resources.get(dataSource.resourceId);
    if (resource === undefined) {
      continue;
    }
    hasResources = true;
    // call resource by bound variable name
    const resourceName = scope.getName(resource.id, dataSource.name);
    generatedOutput += `${resourceName},\n`;
    generatedLoaders += `loadResource({\n`;
    const url = generateExpression({
      expression: resource.url,
      dataSources,
      scope,
    });
    generatedLoaders += `url: ${url},\n`;
    generatedLoaders += `method: "${resource.method}",\n`;
    if (resource.headers.length > 0) {
      generatedLoaders += `headers: [\n`;
      for (const header of resource.headers) {
        header.name;
        const value = generateExpression({
          expression: header.value,
          dataSources,
          scope,
        });
        generatedLoaders += `{ name: "${header.name}", value: ${value} },\n`;
      }
      generatedLoaders += `],\n`;
    }
    if (resource.body !== undefined) {
      const body = generateExpression({
        expression: resource.body,
        dataSources,
        scope,
      });
      generatedLoaders += `body: ${body},\n`;
    }
    generatedLoaders += `}),\n`;
  }

  const paramsVariable = page.pathVariableId
    ? dataSources.get(page.pathVariableId)
    : undefined;
  const paramsName = paramsVariable
    ? scope.getName(paramsVariable.id, paramsVariable.name)
    : undefined;

  let generated = "";
  if (hasResources) {
    generated += `import { loadResource } from "@webstudio-is/sdk";\n`;
  }
  generated += `type Params = Record<string, string | undefined>\n`;
  generated += `export const loadResources = async (_props: { params: Params }) => {\n`;
  if (paramsName !== undefined) {
    generated += `const ${paramsName} = _props.params\n`;
  }
  if (hasResources) {
    generated += `const [\n`;
    generated += generatedOutput;
    generated += `] = await Promise.all([\n`;
    generated += generatedLoaders;
    generated += `])\n`;
  }
  generated += `return {\n`;
  generated += generatedOutput;
  generated += `} as Record<string, unknown>\n`;
  generated += `}\n`;
  return generated;
};
