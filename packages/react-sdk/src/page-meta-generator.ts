import {
  createScope,
  type Asset,
  type DataSources,
  type Page,
  type Scope,
} from "@webstudio-is/sdk";
import { generateExpression } from "./expression";

export type PageMeta = {
  title: string;
  description?: string;
  excludePageFromSearch?: boolean;
  socialImageAssetId?: Asset["id"];
  socialImageUrl?: string;
  custom: Array<{ property: string; content: string }>;
};

export const generatePageMeta = ({
  globalScope,
  page,
  dataSources,
}: {
  globalScope: Scope;
  page: Page;
  dataSources: DataSources;
}) => {
  // reserve parameter names passed to generated function
  const localScope = createScope(["params", "resources"]);
  const usedDataSources: DataSources = new Map();
  const titleExpression = generateExpression({
    expression: page.title,
    dataSources,
    usedDataSources,
    scope: localScope,
  });
  const descriptionExpression = generateExpression({
    expression: page.meta.description ?? "undefined",
    dataSources,
    usedDataSources,
    scope: localScope,
  });
  const excludePageFromSearchExpression = generateExpression({
    expression: page.meta.excludePageFromSearch ?? "undefined",
    dataSources,
    usedDataSources,
    scope: localScope,
  });
  const socialImageAssetIdExpression = JSON.stringify(
    page.meta.socialImageAssetId
  );
  const socialImageUrlExpression = generateExpression({
    expression: page.meta.socialImageUrl ?? "undefined",
    dataSources,
    usedDataSources,
    scope: localScope,
  });
  let customExpression = "";
  customExpression += `[\n`;
  for (const customMeta of page.meta.custom ?? []) {
    if (customMeta.property.trim().length === 0) {
      continue;
    }
    const propertyExpression = JSON.stringify(customMeta.property);
    const contentExpression = generateExpression({
      expression: customMeta.content,
      dataSources,
      usedDataSources,
      scope: localScope,
    });
    customExpression += `      {\n`;
    customExpression += `        property: ${propertyExpression},\n`;
    customExpression += `        content: ${contentExpression},\n`;
    customExpression += `      },\n`;
  }
  customExpression += `    ]`;
  let generated = "";
  generated += `export const getPageMeta = ({\n`;
  generated += `  params,\n`;
  generated += `  resources,\n`;
  generated += `}: {\n`;
  generated += `  params: Record<string, undefined | string>;\n`;
  generated += `  resources: Record<string, any>;\n`;
  generated += `}): PageMeta => {\n`;
  for (const dataSource of usedDataSources.values()) {
    if (dataSource.type === "variable") {
      const valueName = localScope.getName(dataSource.id, dataSource.name);
      const initialValueString = JSON.stringify(dataSource.value.value);
      generated += `  let ${valueName} = ${initialValueString}\n`;
      continue;
    }
    if (dataSource.type === "parameter") {
      if (dataSource.id === page.pathVariableId) {
        const valueName = localScope.getName(dataSource.id, dataSource.name);
        generated += `  let ${valueName} = params\n`;
      }
      continue;
    }
    if (dataSource.type === "resource") {
      const valueName = localScope.getName(dataSource.id, dataSource.name);
      // use global scope only to retrieve resource names
      const resourceName = globalScope.getName(
        dataSource.resourceId,
        dataSource.name
      );
      generated += `  let ${valueName} = resources.${resourceName}\n`;
      continue;
    }
  }
  generated += `  return {\n`;
  generated += `    title: ${titleExpression},\n`;
  generated += `    description: ${descriptionExpression},\n`;
  generated += `    excludePageFromSearch: ${excludePageFromSearchExpression},\n`;
  generated += `    socialImageAssetId: ${socialImageAssetIdExpression},\n`;
  generated += `    socialImageUrl: ${socialImageUrlExpression},\n`;
  generated += `    custom: ${customExpression},\n`;
  generated += `  };\n`;
  generated += `};\n`;
  return generated;
};
