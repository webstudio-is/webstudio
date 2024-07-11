import { parseCss } from "@webstudio-is/css-data";

export const parseCssFragment = (css: string, fallbackProperty: string) => {
  let parsed = parseCss(`.styles{${css}}`);
  if (parsed.length === 0) {
    parsed = parseCss(`.styles{${fallbackProperty}: ${css}}`);
  }
  return new Map(
    parsed.map((styleDecl) => [styleDecl.property, styleDecl.value])
  );
};
