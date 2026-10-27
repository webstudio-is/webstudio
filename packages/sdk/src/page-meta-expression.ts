import {
  isValidExpression,
  parseStaticMemberPath,
} from "@webstudio-is/expression";

/** Match the page metadata generator's treatment of plain text. */
export const normalizeStringExpression = (expression: string) => {
  const trimmedExpression = expression.trim();
  if (isValidExpression(trimmedExpression)) {
    if (
      parseStaticMemberPath(trimmedExpression)?.length === 1 &&
      trimmedExpression !== "undefined" &&
      trimmedExpression.includes("$ws$") === false
    ) {
      return JSON.stringify(expression);
    }
    return expression;
  }
  if (trimmedExpression.includes("$ws$")) {
    return expression;
  }
  return JSON.stringify(expression);
};
