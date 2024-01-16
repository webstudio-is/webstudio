import { getPagePath, type Pages, type Props } from "@webstudio-is/sdk";

type PageData = {
  pages: Pages;
  props: Props;
};

/**
 * Generates data based utilities at build time
 */
export const generateUtilsExport = (siteData: PageData) => {
  // list of paths from pages to use framework link component
  // for ui routes
  const pagesPaths: string[] = [siteData.pages.homePage.path];
  for (const page of siteData.pages.pages) {
    const path = getPagePath(page.id, siteData.pages);
    pagesPaths.push(path);
  }

  const generatedPagesPaths = `export const pagesPaths = new Set(${JSON.stringify(
    pagesPaths
  )})`;

  // method and action per instance extracted from props
  const formsProperties = new Map<
    string,
    { method?: string; action?: string }
  >();
  for (const prop of siteData.props.values()) {
    if (prop.type === "string") {
      if (prop.name === "action" || prop.name === "method") {
        let properties = formsProperties.get(prop.instanceId);
        if (properties === undefined) {
          properties = {};
        }
        properties[prop.name] = prop.value;
        formsProperties.set(prop.instanceId, properties);
      }
    }
  }
  const generatedFormsProperties = `export const formsProperties = new Map<string, { method?: string, action?: string }>(${JSON.stringify(
    Array.from(formsProperties.entries())
  )})`;

  return `
  ${generatedPagesPaths}

  ${generatedFormsProperties}
  `;
};
