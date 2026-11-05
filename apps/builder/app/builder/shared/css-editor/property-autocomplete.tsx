import { matchSorter } from "match-sorter";
import {
  propertiesData,
  shorthandProperties,
  keywordValues,
} from "@webstudio-is/css-data";
import {
  cssWideKeywords,
  generateStyleMap,
  mergeStyles,
  toValue,
} from "@webstudio-is/css-engine";
import { parseStyleInput, splitStyleInputAtColon } from "./parse-style-input";

export type SearchItem = {
  property: string;
  label: string;
  value?: string;
  key: string;
};

const collator = new Intl.Collator();
const staticAutocompleteItems: SearchItem[] = [];
for (const property in propertiesData) {
  staticAutocompleteItems.push({
    // Allow matching "gr te co" -> "grid-template-columns"
    key: property.replaceAll("-", " "),
    property,
    label: property,
  });
}

for (const property of shorthandProperties) {
  staticAutocompleteItems.push({
    // Allow matching "gr te co" -> "grid-template-columns"
    key: property.replaceAll("-", " "),
    property,
    label: property,
  });
}

const ignoreValues = new Set([...cssWideKeywords, ...keywordValues.color]);

for (const [property, values] of Object.entries(keywordValues)) {
  for (const value of values ?? []) {
    if (ignoreValues.has(value)) {
      continue;
    }
    staticAutocompleteItems.push({
      // Allow matching "gr te co" -> "grid-template-columns"
      key: `${property.replaceAll("-", " ")} ${value}`,
      property,
      value,
      label: `${property}: ${value}`,
    });
  }
}

let cachedVariables: ReadonlyArray<{ value: string }> | undefined;
let cachedItems: SearchItem[] = [];

export const getAutocompleteItems = (
  variables: ReadonlyArray<{ value: string }>
) => {
  if (variables === cachedVariables) {
    return cachedItems;
  }

  cachedVariables = variables;
  cachedItems = [...staticAutocompleteItems];
  for (const varValue of variables) {
    const property = `--${varValue.value}`;
    cachedItems.push({ key: property, property, label: property });
  }
  cachedItems.sort((a, b) => collator.compare(a.property, b.property));

  return cachedItems;
};

export const matchOrSuggestToCreate = (
  search: string,
  items: Array<SearchItem>,
  cssVars: Map<string, string>
) => {
  const searchWithSpaces = search.startsWith("--")
    ? search
    : search.replaceAll("-", " ");
  const matched = matchSorter(items, searchWithSpaces, {
    keys: ["key"],
  });

  // Limit the array to 100 elements
  matched.length = Math.min(matched.length, 100);

  if (matched.length === 0) {
    const hasValue = splitStyleInputAtColon(search) !== undefined;
    const { styleMap: parsedStyleMap } = parseStyleInput(search, cssVars);
    const styleMap = mergeStyles(parsedStyleMap);

    // When parsedStyles is more than one, user entered a shorthand.
    // We will suggest to insert their shorthand first.
    if (styleMap.size > 1) {
      matched.push({
        key: "",
        property: search,
        label: `Create "${search}"`,
      });
    }
    // Now we will suggest to insert each longhand separately.
    for (const [property, value] of styleMap) {
      matched.push({
        key: "",
        property,
        value: hasValue ? toValue(value) : undefined,
        label: `Create "${generateStyleMap(new Map([[property, value]]))}"`,
      });
    }
  }

  return matched;
};
