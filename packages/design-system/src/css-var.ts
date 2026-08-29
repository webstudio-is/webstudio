import type { CssVariableName } from "./colors/__generated__/css-variable-names";

export type { ThemeVariableName } from "./colors/__generated__/css-variable-names";

export const cssVar = (name: CssVariableName, fallback?: string) =>
  fallback === undefined ? `var(${name})` : `var(${name}, ${fallback})`;
