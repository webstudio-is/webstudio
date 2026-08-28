import type { CssVariableName } from "./__generated__/css-variable-names";

export const cssVar = (name: CssVariableName, fallback?: string) =>
  fallback === undefined ? `var(${name})` : `var(${name}, ${fallback})`;
