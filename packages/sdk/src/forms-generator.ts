import type { Props } from "./schema/props";

/**
 * Generates data based utilities at build time
 */
export const generateFormsProperties = (props: Props) => {
  // method and action per instance extracted from props
  const formsProperties = new Map<
    string,
    { method?: string; action?: string }
  >();
  for (const prop of props.values()) {
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
  const entriesString = JSON.stringify(Array.from(formsProperties.entries()));
  let generated = "";
  generated += `type FormProperties = { method?: string, action?: string }\n`;
  generated += `export const formsProperties = new Map<string, FormProperties>(${entriesString})\n`;
  return generated;
};
