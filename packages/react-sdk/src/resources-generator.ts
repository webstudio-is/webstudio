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
  let generatedVariables = "";
  let generatedOutput = "";
  let generatedLoaders = "";
  let hasResources = false;

  for (const dataSource of dataSources.values()) {
    if (dataSource.type === "variable") {
      const name = scope.getName(dataSource.id, dataSource.name);
      const value = JSON.stringify(dataSource.value.value);
      generatedVariables += `let ${name} = ${value}\n`;
    }

    if (dataSource.type === "parameter") {
      // support only page path params parameter
      if (dataSource.id !== page.pathVariableId) {
        continue;
      }
      const name = scope.getName(dataSource.id, dataSource.name);
      generatedVariables += `const ${name} = _props.params\n`;
    }

    if (dataSource.type === "resource") {
      const resource = resources.get(dataSource.resourceId);
      if (resource === undefined) {
        continue;
      }
      hasResources = true;
      // call resource by bound variable name
      const resourceName = scope.getName(resource.id, dataSource.name);
      generatedOutput += `${resourceName},\n`;
      generatedLoaders += `loadResource({\n`;
      generatedLoaders += `id: "${resource.id}",\n`;
      generatedLoaders += `name: ${JSON.stringify(resource.name)},\n`;
      const url = generateExpression({
        expression: resource.url,
        dataSources,
        scope,
      });
      generatedLoaders += `url: ${url},\n`;
      generatedLoaders += `method: "${resource.method}",\n`;
      generatedLoaders += `headers: [\n`;
      for (const header of resource.headers) {
        const value = generateExpression({
          expression: header.value,
          dataSources,
          scope,
        });
        generatedLoaders += `{ name: "${header.name}", value: ${value} },\n`;
      }
      generatedLoaders += `],\n`;
      // prevent computing empty expression
      if (resource.body !== undefined && resource.body.length > 0) {
        const body = generateExpression({
          expression: resource.body,
          dataSources,
          scope,
        });
        generatedLoaders += `body: ${body},\n`;
      }
      generatedLoaders += `}),\n`;
    }
  }

  let generated = "";
  if (hasResources) {
    generated += `import { loadResource } from "@webstudio-is/sdk";\n`;
  }
  generated += `type Params = Record<string, string | undefined>\n`;
  generated += `export const loadResources = async (_props: { params: Params }) => {\n`;
  if (hasResources) {
    generated += generatedVariables;
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
