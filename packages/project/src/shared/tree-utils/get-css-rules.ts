import type { CssRule } from "@webstudio-is/css-data";
import type { Instance } from "@webstudio-is/react-sdk";

const aggregateCssRules = (
  instance: Instance,
  result: Array<[string, CssRule]>
) => {
  for (const cssRule of instance.cssRules) {
    result.push([instance.id, cssRule]);
  }
  for (const child of instance.children) {
    if (typeof child === "string") {
      continue;
    }
    aggregateCssRules(child, result);
  }
};

export const getCssRules = (instance?: Instance) => {
  const result: Array<[string, CssRule]> = [];
  if (instance) {
    aggregateCssRules(instance, result);
  }
  return result;
};
