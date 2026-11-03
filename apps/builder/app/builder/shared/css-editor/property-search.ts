import { matchSorter } from "match-sorter";
import {
  toValue,
  type CssProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";

type SearchableDeclaration = { property: CssProperty } & (
  | { cascadedValue: StyleValue }
  | { value: StyleValue }
);

export const getMatchingDeclarations = <
  Declaration extends SearchableDeclaration,
>(
  declarations: Declaration[],
  searchTerm: string | undefined
) => {
  if (searchTerm === undefined) {
    return;
  }
  const styles = declarations.map((declaration) => ({
    key: `${declaration.property.replaceAll("-", " ")} ${toValue(
      "cascadedValue" in declaration
        ? declaration.cascadedValue
        : declaration.value
    )}`,
    declaration,
  }));
  return matchSorter(styles, searchTerm, { keys: ["key"] }).map(
    ({ declaration }) => declaration
  );
};
