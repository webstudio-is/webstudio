import { lintExpression } from "@webstudio-is/sdk";

export const getExpressionErrors = (expression: string) =>
  lintExpression({ expression })
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.message);

export const getExpressionErrorMessages = (
  options: Parameters<typeof lintExpression>[0]
) =>
  lintExpression(options)
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.message);

export const hasExpressionDiagnostics = (
  options: Parameters<typeof lintExpression>[0]
) => lintExpression(options).length > 0;

export const getNamedExpressionErrors = (
  name: string,
  expression: string | undefined,
  options: { hint?: string } = {}
) => {
  if (expression === undefined) {
    return [];
  }
  return getExpressionErrors(expression).map((message) =>
    [name, "Invalid expression", options.hint, `Parser detail: ${message}`]
      .filter(Boolean)
      .join(": ")
  );
};
