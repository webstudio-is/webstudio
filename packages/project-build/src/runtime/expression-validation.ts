import { lintExpression } from "@webstudio-is/sdk";

export const getExpressionErrors = (expression: string) =>
  lintExpression({ expression })
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.message);

export const getNamedExpressionErrors = (
  name: string,
  expression: string | undefined
) => {
  if (expression === undefined) {
    return [];
  }
  return getExpressionErrors(expression).map(
    (message) => `${name}: ${message}`
  );
};
