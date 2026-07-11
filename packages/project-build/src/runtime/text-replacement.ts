export type TextReplacementInput = {
  find: string;
  replace: string;
  match: "exact" | "substring";
};

export const replaceTextValue = (value: string, input: TextReplacementInput) =>
  input.match === "exact"
    ? value === input.find
      ? input.replace
      : value
    : value.replaceAll(input.find, input.replace);

export const getStaticStringLiteral = (expression: string | undefined) => {
  if (expression === undefined) {
    return;
  }
  try {
    const value = JSON.parse(expression);
    return typeof value === "string" && JSON.stringify(value) === expression
      ? value
      : undefined;
  } catch {
    return;
  }
};
