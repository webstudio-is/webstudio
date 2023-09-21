import type { Props } from "@webstudio-is/sdk";
import type { IndexesWithinAncestors } from "./instance-utils";

type PageData = {
  props: Props;
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
 */
export const generateUtilsExport = (siteData: PageData) => {
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
