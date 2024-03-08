import type { Props } from "@webstudio-is/sdk";

type PageData = {
  props: Props;
};

/**
 * Generates data based utilities at build time
 */
export const generateUtilsExport = (siteData: PageData) => {
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
  ${generatedFormsProperties}
  `;
};
