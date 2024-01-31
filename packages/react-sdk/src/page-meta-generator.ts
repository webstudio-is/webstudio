import type { Asset, DataSources, Page, Scope } from "@webstudio-is/sdk";
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
  scope,
  page,
  dataSources,
}: {
  scope: Scope;
  page: Page;
  dataSources: DataSources;
}) => {
  const titleExpression = generateExpression({
    expression: page.title,
    dataSources,
    scope,
  });
  const descriptionExpression = generateExpression({
    expression: page.meta.description ?? "undefined",
    dataSources,
    scope,
  });
  const excludePageFromSearchExpression = generateExpression({
    expression: page.meta.excludePageFromSearch ?? "undefined",
    dataSources,
    scope,
  });
  const socialImageAssetIdExpression = JSON.stringify(
    page.meta.socialImageAssetId
  );
  const socialImageUrlExpression = generateExpression({
    expression: page.meta.socialImageUrl ?? "undefined",
    dataSources,
    scope,
  });
  let generated = "";
  generated += `export const getPageMeta = ({}: {\n`;
  generated += `  params: Record<string, undefined | string>;\n`;
  generated += `  resources: Record<string, any>;\n`;
  generated += `}): PageMeta => {\n`;
  generated += `  return {\n`;
  generated += `    title: ${titleExpression},\n`;
  generated += `    description: ${descriptionExpression},\n`;
  generated += `    excludePageFromSearch: ${excludePageFromSearchExpression},\n`;
  generated += `    socialImageAssetId: ${socialImageAssetIdExpression},\n`;
  generated += `    socialImageUrl: ${socialImageUrlExpression},\n`;
  generated += `    custom: [\n`;
  if (page.meta.custom) {
    for (const customMeta of page.meta.custom) {
      if (customMeta.property.trim().length === 0) {
        continue;
      }
      const propertyExpression = JSON.stringify(customMeta.property);
      const contentExpression = generateExpression({
        scope,
        dataSources,
        expression: customMeta.content,
      });
      generated += `      {\n`;
      generated += `        property: ${propertyExpression},\n`;
      generated += `        content: ${contentExpression},\n`;
      generated += `      },\n`;
    }
  }
  generated += `    ],\n`;
  generated += `  };\n`;
  generated += `};\n`;
  return generated;
};
