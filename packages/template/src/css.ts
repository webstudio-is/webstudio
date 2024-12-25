import { parseCss } from "@webstudio-is/css-data";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";

export type TemplateStyleDecl = {
  state?: string;
  property: StyleProperty;
  value: StyleValue;
};

export const css = (strings: TemplateStringsArray): TemplateStyleDecl[] => {
  const cssString = `.styles{ ${strings.join()} }`;
  const styles: TemplateStyleDecl[] = [];
  for (const { state, property, value } of parseCss(cssString)) {
    styles.push({ state, property, value });
  }
  return styles;
};
