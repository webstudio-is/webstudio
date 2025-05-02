import { parseCss } from "@webstudio-is/css-data";
import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";

export type TemplateStyleDecl = {
  state?: string;
  property: CssProperty;
  value: StyleValue;
};

export const css = (
  strings: TemplateStringsArray,
  ...values: string[]
): TemplateStyleDecl[] => {
  const cssString = `.styles{ ${String.raw({ raw: strings }, ...values)} }`;
  const styles: TemplateStyleDecl[] = [];
  for (const { state, property, value } of parseCss(cssString)) {
    styles.push({ state, property: property, value });
  }
  return styles;
};
