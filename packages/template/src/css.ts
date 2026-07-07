import { parseCss } from "@webstudio-is/css-data";
import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";

export type TemplateStyleDecl = {
  breakpoint?: string;
  state?: string;
  property: CssProperty;
  value: StyleValue;
};

export const parseTemplateCss = (source: string): TemplateStyleDecl[] => {
  const cssString = `.styles{ ${source} }`;
  const styles: TemplateStyleDecl[] = [];
  for (const { breakpoint, state, property, value } of parseCss(
    cssString,
    new Map()
  ).styles) {
    styles.push({ breakpoint, state, property: property, value });
  }
  return styles;
};

export const css = (
  strings: TemplateStringsArray,
  ...values: string[]
): TemplateStyleDecl[] => {
  return parseTemplateCss(String.raw({ raw: strings }, ...values));
};
