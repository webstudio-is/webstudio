import { useState } from "react";
import { theme, Combobox, Box } from "@webstudio-is/design-system";
import { propertyDescriptions } from "@webstudio-is/css-data";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { matchSorter } from "match-sorter";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { toKebabCase } from "../../shared/keyword-utils";

type Item = { value: string; label: string };

const matchOrSuggestToCreate = (
  search: string,
  items: Array<Item>,
  itemToString: (item: Item) => string
): Array<Item> => {
  const matched = matchSorter(items, search, {
    keys: [itemToString],
  });

  if (isFeatureEnabled("cssVars") === false) {
    return matched;
  }

  if (
    search.trim() !== "" &&
    itemToString(matched[0]).toLocaleLowerCase() !==
      search.toLocaleLowerCase().trim()
  ) {
    matched.unshift({
      value: search.trim(),
      label: `Create "${search.trim()}"`,
    });
  }
  return matched;
};

export const Add = ({
  onSelect,
  propertyNames,
}: {
  onSelect: (value: string) => void;
  propertyNames: Array<StyleProperty>;
}) => {
  const [item, setItem] = useState<Item>({ value: "", label: "" });

  return (
    <Combobox<Item>
      autoFocus
      placeholder="Find or create a property"
      items={propertyNames.map((value) => ({
        value,
        label: toKebabCase(value),
      }))}
      itemToString={(item) => item?.label ?? ""}
      getItemProps={() => ({ text: "sentence" })}
      onItemSelect={(item) => onSelect(item.value)}
      value={item}
      onInputChange={(value) => {
        setItem({ value: value ?? "", label: value ?? "" });
      }}
      match={matchOrSuggestToCreate}
      getDescription={(item) => {
        let description = `Please look up ${
          item?.value ? `"${toKebabCase(item?.value)}"` : "property"
        } in MDN.`;
        if (item && item.value in propertyDescriptions) {
          description =
            propertyDescriptions[
              item.value as keyof typeof propertyDescriptions
            ];
        }
        return <Box css={{ width: theme.spacing[25] }}>{description}</Box>;
      }}
      defaultHighlightedIndex={0}
    />
  );
};
