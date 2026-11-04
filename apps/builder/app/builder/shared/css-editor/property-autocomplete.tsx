import { matchSorter } from "match-sorter";
import { Box, Flex, theme } from "@webstudio-is/design-system";
import {
  camelCaseProperty,
  propertiesData,
  shorthandProperties,
  keywordValues,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
  cssWideKeywords,
  generateStyleMap,
  mergeStyles,
  toValue,
  type CssProperty,
} from "@webstudio-is/css-engine";
import {
  $availableVariables,
  $cssVarsMap,
} from "~/builder/features/style-panel/shared/model";
import { parseStyleInput, splitStyleInputAtColon } from "./parse-style-input";
import { PropertyStatusDescription } from "~/builder/features/style-panel/property-status";

export type SearchItem = {
  property: string;
  label: string;
  value?: string;
  key: string;
};

export const getNewPropertyDescription = (item: null | SearchItem) => {
  let description: string | undefined = "Add CSS property.";
  if (item?.property.startsWith("--")) {
    description = "Create CSS variable.";
  }
  if (item) {
    description =
      propertyDescriptions[camelCaseProperty(item.property as CssProperty)] ??
      description;
  }
  return (
    <Box css={{ width: theme.spacing[28] }}>
      <Flex direction="column" gap="2">
        {description}
        {item && <PropertyStatusDescription property={item.property} />}
      </Flex>
    </Box>
  );
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

let cachedVariables: ReturnType<typeof $availableVariables.get> | undefined;
let cachedItems: SearchItem[] = [];

export const getAutocompleteItems = () => {
  const variables = $availableVariables.get();
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
  items: Array<SearchItem>
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
    const { styleMap: parsedStyleMap } = parseStyleInput(
      search,
      $cssVarsMap.get()
    );
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
