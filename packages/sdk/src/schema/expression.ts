import { parseDirectPathExpression } from "@webstudio-is/expression";
import { z } from "zod";

export const expressionBindingMode = z
  .enum(["read", "readwrite"])
  .describe(
    'Use "readwrite" only for a direct path into a source that supports writes; use "read" for every other expression.'
  );

export type ExpressionBindingMode = z.infer<typeof expressionBindingMode>;

export const expressionBindingShape = {
  type: z.literal("expression"),
  value: z.string(),
  // Optional only for persisted bindings created before modes existed. New
  // bindings must always choose an explicit mode.
  mode: expressionBindingMode.optional(),
};

export type ExpressionBinding = z.infer<typeof expressionBinding>;

export const getExpressionBindingError = ({
  value,
  mode,
}: Pick<ExpressionBinding, "value" | "mode">) => {
  if (mode === "readwrite" && parseDirectPathExpression(value) === undefined) {
    return "Read-write expressions must be a direct static path";
  }
};

export const expressionBinding = z
  .object(expressionBindingShape)
  .superRefine((binding, context) => {
    const error = getExpressionBindingError(binding);
    if (error !== undefined) {
      context.addIssue({ code: "custom", path: ["value"], message: error });
    }
  });
