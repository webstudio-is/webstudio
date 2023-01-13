import type { Style } from "@webstudio-is/css-data";
import type { PresetStyles, Styles } from "@webstudio-is/react-sdk";

type StyleRule = {
  instanceId: string;
  breakpointId: string;
  style: Style;
};

export const getStyleRules = (styles?: Styles) => {
  const stylesMap = new Map<string, StyleRule>();
  if (styles === undefined) {
    return [];
  }
  for (const { breakpointId, instanceId, property, value } of styles) {
    const id = `${breakpointId}:${instanceId}`;
    let styleRule = stylesMap.get(id);
    if (styleRule === undefined) {
      styleRule = { breakpointId, instanceId, style: {} };
      stylesMap.set(id, styleRule);
    }
    styleRule.style[property] = value;
  }
  return Array.from(stylesMap.values());
};

type PresetStyleRule = {
  component: string;
  style: Style;
};

export const getPresetStyleRules = (presetStyles?: PresetStyles) => {
  const presetStylesMap = new Map<string, PresetStyleRule>();
  if (presetStyles === undefined) {
    return [];
  }
  for (const { component, property, value } of presetStyles) {
    let presetStyleRule = presetStylesMap.get(component);
    if (presetStyleRule === undefined) {
      presetStyleRule = { component, style: {} };
      presetStylesMap.set(component, presetStyleRule);
    }
    presetStyleRule.style[property] = value;
  }
  return Array.from(presetStylesMap.values());
};
