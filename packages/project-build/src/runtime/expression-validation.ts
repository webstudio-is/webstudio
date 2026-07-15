import { lintExpression } from "@webstudio-is/sdk";
import type { SemanticValidationIssue } from "./errors";

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

export const getNamedExpressionValidationIssues = (
  name: string,
  expression: string | undefined,
  options: { hint?: string; example?: string } = {}
): SemanticValidationIssue[] => {
  if (expression === undefined) {
    return [];
  }
  return getExpressionErrors(expression).map((detail) => ({
    code: "invalid_expression",
    path: name.split("."),
    message: ["Invalid Webstudio expression", options.hint]
      .filter(Boolean)
      .join(": "),
    constraint: "valid_webstudio_expression",
    example: options.example ?? "item.title",
    detail,
  }));
};

export const getNamedExpressionErrors = (
  name: string,
  expression: string | undefined,
  options: { hint?: string } = {}
) =>
  getNamedExpressionValidationIssues(name, expression, options).map((issue) =>
    [
      name,
      "Invalid expression",
      options.hint,
      issue.detail === undefined ? undefined : `Parser detail: ${issue.detail}`,
    ]
      .filter(Boolean)
      .join(": ")
  );
