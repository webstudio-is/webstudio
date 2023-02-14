import snakeCase from "lodash.snakecase";
import capitalize from "lodash.capitalize";

export const humanizeString = (string: string): string => {
  return snakeCase(string).split("_").map(capitalize).join(" ");
};
