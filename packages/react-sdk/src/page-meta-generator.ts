import type { Asset, DataSources, Page } from "@webstudio-is/sdk";

export type PageMeta = {
  title: string;
  description?: string;
  excludePageFromSearch?: boolean;
  socialImageAssetId?: Asset["id"];
  custom: Array<{ property: string; content: string }>;
};

export const generatePageMeta = ({
  page,
}: {
  page: Page;
  dataSources: DataSources;
}) => {
  const titleExpression = JSON.stringify(page.title);
  const descriptionExpression = JSON.stringify(page.meta.description);
  const excludePageFromSearchExpression = JSON.stringify(
    page.meta.excludePageFromSearch
  );
  const socialImageAssetIdExpression = JSON.stringify(
    page.meta.socialImageAssetId
  );
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
  generated += `    custom: [\n`;
  if (page.meta.custom) {
    for (const customMeta of page.meta.custom) {
      if (customMeta.property.trim().length === 0) {
        continue;
      }
      const propertyExpression = JSON.stringify(customMeta.property);
      const contentExpression = JSON.stringify(customMeta.content);
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
