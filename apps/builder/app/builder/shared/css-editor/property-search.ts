import { matchSorter } from "match-sorter";
import { toValue } from "@webstudio-is/css-engine";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

export const getMatchingProperties = (
  declarations: ComputedStyleDecl[],
  searchTerm: string | undefined
) => {
  if (searchTerm === undefined) {
    return;
  }
  const styles = declarations.map(({ property, cascadedValue }) => ({
    key: `${property.replaceAll("-", " ")} ${toValue(cascadedValue)}`,
    property,
  }));
  return matchSorter(styles, searchTerm, { keys: ["key"] }).map(
    ({ property }) => property
  );
};
