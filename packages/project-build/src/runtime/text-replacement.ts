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
