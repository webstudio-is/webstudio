import type { Asset, Assets } from "./schema/assets";
import type { DataSources } from "./schema/data-sources";
import type { Page } from "./schema/pages";
import { type Scope, createScope } from "./scope";
import { generateExpression, SYSTEM_VARIABLE_ID } from "./expression";

export type PageMeta = {
  title: string;
  description?: string;
  excludePageFromSearch?: boolean;
  language?: string;
  socialImageAssetName?: Asset["name"];
  socialImageUrl?: string;
  status?: number;
  redirect?: string;
  custom: Array<{ property: string; content: string }>;
};

export const generatePageMeta = ({
  globalScope,
  page,
  dataSources,
  assets,
}: {
  globalScope: Scope;
  page: Page;
  dataSources: DataSources;
  assets: Assets;
}) => {
  // reserve parameter names passed to generated function
  const localScope = createScope(["system", "resources"]);
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
  const languageExpression = generateExpression({
    expression: page.meta.language ?? "undefined",
    dataSources,
    usedDataSources,
    scope: localScope,
  });
  const socialImageAssetNameExpression = JSON.stringify(
    page.meta.socialImageAssetId
      ? assets.get(page.meta.socialImageAssetId)?.name
      : undefined
  );
  const socialImageUrlExpression = generateExpression({
    expression: page.meta.socialImageUrl ?? "undefined",
    dataSources,
    usedDataSources,
    scope: localScope,
  });
  const statusExpression = generateExpression({
    expression: page.meta.status ?? "undefined",
    dataSources,
    usedDataSources,
    scope: localScope,
  });
  const redirectExpression = generateExpression({
    expression: page.meta.redirect ?? "undefined",
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
  generated += `  system,\n`;
  generated += `  resources,\n`;
  generated += `}: {\n`;
  generated += `  system: System;\n`;
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
      if (
        dataSource.id === page.systemDataSourceId ||
        dataSource.id === SYSTEM_VARIABLE_ID
      ) {
        const valueName = localScope.getName(dataSource.id, dataSource.name);
        generated += `  let ${valueName} = system\n`;
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
  generated += `    language: ${languageExpression},\n`;
  generated += `    socialImageAssetName: ${socialImageAssetNameExpression},\n`;
  generated += `    socialImageUrl: ${socialImageUrlExpression},\n`;
  generated += `    status: ${statusExpression},\n`;
  generated += `    redirect: ${redirectExpression},\n`;
  generated += `    custom: ${customExpression},\n`;
  generated += `  };\n`;
  generated += `};\n`;
  return generated;
};
