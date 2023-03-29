import { noCase } from "no-case";
import { titleCase } from "title-case";

export const humanizeString = (string: string): string =>
  titleCase(noCase(string));
