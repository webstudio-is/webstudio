import type { CssVariableName } from "./colors/__generated__/css-variable-names";

export const declareCssVar = <const Name extends `--${string}`>(name: Name) =>
  name;

export const cssVar = (name: CssVariableName, fallback?: string) =>
  fallback === undefined ? `var(${name})` : `var(${name}, ${fallback})`;
