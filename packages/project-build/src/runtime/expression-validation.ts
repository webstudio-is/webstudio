import { lintExpression } from "@webstudio-is/sdk";
import { z } from "zod";
import type { SemanticValidationIssue } from "./errors";

export const getExpressionErrorMessages = (
  options: Parameters<typeof lintExpression>[0]
) =>
  lintExpression(options)
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.message);

export const getExpressionErrors = (expression: string) =>
  getExpressionErrorMessages({ expression });

export const hasExpressionDiagnostics = (
  options: Parameters<typeof lintExpression>[0]
) => lintExpression(options).length > 0;

export const expressionWarningSchema = z.object({
  severity: z.literal("warning"),
  code: z.string(),
  path: z.array(z.string()),
  message: z.string(),
  range: z.object({
    from: z.number().int().nonnegative(),
    to: z.number().int().nonnegative(),
  }),
  remediation: z.string(),
  instanceId: z.string().optional(),
  resourceId: z.string().optional(),
});

export type ExpressionWarning = z.infer<typeof expressionWarningSchema>;

export const getExpressionWarnings = ({
  path,
  instanceId,
  resourceId,
  ...options
}: Parameters<typeof lintExpression>[0] & {
  path: string[];
  instanceId?: string;
  resourceId?: string;
}): ExpressionWarning[] =>
  lintExpression(options)
    .filter(({ severity }) => severity !== "error")
    .map(({ from, to, message }) => ({
      severity: "warning",
      code: "expression_lint_warning",
      path,
      message,
      range: { from, to },
      remediation:
        "Use a variable available at this element or resource scope, then verify the rendered dynamic value.",
      ...(instanceId === undefined ? {} : { instanceId }),
      ...(resourceId === undefined ? {} : { resourceId }),
    }));

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
