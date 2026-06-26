import { lintExpression } from "@webstudio-is/sdk";

export const getExpressionErrorMessages = (
  options: Parameters<typeof lintExpression>[0]
) =>
  lintExpression(options)
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.message);

export const hasExpressionDiagnostics = (
  options: Parameters<typeof lintExpression>[0]
) => lintExpression(options).length > 0;
