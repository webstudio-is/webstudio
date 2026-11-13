import type { SemanticColorName } from "./colors/__generated__/css-variable-names";

declare const declaredCssVariableNameBrand: unique symbol;

export type DeclaredCssVariableName = `--${string}` & {
  readonly [declaredCssVariableNameBrand]: true;
};

type ColorVariableName =
  | `--theme-${string}`
  | `--scheme-${string}`
  | `--color-${string}`
  | `--background-${string}`
  | `--foreground-${string}`
  | `--border-${string}`
  | `--overlay-${string}`;

export const declareCssVar = <const Name extends `--${string}`>(
  name: Name & (Name extends ColorVariableName ? never : unknown)
) => name as unknown as Name & DeclaredCssVariableName;

export const cssVar = (
  name: SemanticColorName | DeclaredCssVariableName,
  fallback?: string
) => (fallback === undefined ? `var(${name})` : `var(${name}, ${fallback})`);
