import type { CssRule, Style } from "@webstudio-is/css-data";
import type { Instance, PresetStyles } from "@webstudio-is/react-sdk";

const aggregateCssRules = (
  instance: Instance,
  result: Array<[string, CssRule]>
) => {
  for (const cssRule of instance.cssRules) {
    result.push([instance.id, cssRule]);
  }
  for (const child of instance.children) {
    if (child.type === "text") {
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

export const getPresetStylesMap = (presetStyles?: PresetStyles) => {
  const presetStylesMap = new Map<string, Style>();
  if (presetStyles === undefined) {
    return presetStylesMap;
  }
  for (const { component, property, value } of presetStyles) {
    let style = presetStylesMap.get(component);
    if (style === undefined) {
      style = {};
      presetStylesMap.set(component, style);
    }
    style[property] = value;
  }
  return presetStylesMap;
};
