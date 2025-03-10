import { forwardRef, useRef, useState, type KeyboardEvent } from "react";
import { matchSorter } from "match-sorter";
import {
  Box,
  ComboboxAnchor,
  ComboboxContent,
  ComboboxItemDescription,
  ComboboxListbox,
  ComboboxListboxItem,
  ComboboxRoot,
  ComboboxScrollArea,
  InputField,
  NestedInputButton,
  Text,
  theme,
  useCombobox,
} from "@webstudio-is/design-system";
import {
  propertiesData,
  shorthandProperties,
  keywordValues,
  propertyDescriptions,
  parseCssValue,
} from "@webstudio-is/css-data";
import {
  cssWideKeywords,
  generateStyleMap,
  hyphenateProperty,
  mergeStyles,
  toValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import {
  deleteProperty,
  setProperty,
} from "../../features/style-panel/shared/use-style-data";
import { composeEventHandlers } from "~/shared/event-utils";
import { parseStyleInput } from "./parse-style-input";

type SearchItem = {
  property: string;
  label: string;
  value?: string;
  key: string;
};

const autoCompleteItems: Array<SearchItem> = [];

const getNewPropertyDescription = (item: null | SearchItem) => {
  let description: string | undefined = `Create CSS variable.`;
  if (item && item.property in propertyDescriptions) {
    description = propertyDescriptions[item.property];
  }
  return <Box css={{ width: theme.spacing[28] }}>{description}</Box>;
};

const getAutocompleteItems = () => {
  if (autoCompleteItems.length > 0) {
    return autoCompleteItems;
  }
  for (const property in propertiesData) {
    autoCompleteItems.push({
      // Allow matching "gr te co" -> "grid-template-columns"
      key: property.replaceAll("-", " "),
      property,
      label: property,
    });
  }

  for (const property of shorthandProperties) {
    autoCompleteItems.push({
      // Allow matching "gr te co" -> "grid-template-columns"
      key: property.replaceAll("-", " "),
      property,
      label: property,
    });
  }

  const ignoreValues = new Set([...cssWideKeywords, ...keywordValues.color]);

  for (const property in keywordValues) {
    const values = keywordValues[property as keyof typeof keywordValues];
    for (const value of values) {
      if (ignoreValues.has(value)) {
        continue;
      }
      const hyphenatedProperty = hyphenateProperty(property);
      autoCompleteItems.push({
        // Allow matching "gr te co" -> "grid-template-columns"
        key: `${hyphenatedProperty.replaceAll("-", " ")} ${value}`,
        property: hyphenatedProperty,
        value,
        label: `${hyphenatedProperty}: ${value}`,
      });
    }
  }

  autoCompleteItems.sort((a, b) =>
    Intl.Collator().compare(a.property, b.property)
  );

  return autoCompleteItems;
};

const matchOrSuggestToCreate = (search: string, items: Array<SearchItem>) => {
  const matched = matchSorter(items, search, {
    keys: ["key"],
  });

  // Limit the array to 100 elements
  matched.length = Math.min(matched.length, 100);

  if (matched.length === 0) {
    const parsedStyleMap = parseStyleInput(search);
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
        value: toValue(value),
        label: `Create "${generateStyleMap(new Map([[property, value]]))}"`,
      });
    }
  }

  return matched;
};

/**
 * Advanced search control supports following interactions
 *
 * - find property
 * - create custom property
 * - submit css declarations
 * - paste css declarations
 *
 */
export const AddStyleInput = forwardRef<
  HTMLInputElement,
  {
    onClose: () => void;
    onSubmit: (css: string) => void;
    onFocus: () => void;
    onBlur: () => void;
  }
>(({ onClose, onSubmit, onFocus, onBlur }, forwardedRef) => {
  const [item, setItem] = useState<SearchItem>({
    property: "",
    label: "",
    key: "",
  });
  const highlightedItemRef = useRef<SearchItem>();

  const combobox = useCombobox<SearchItem>({
    getItems: getAutocompleteItems,
    itemToString: (item) => item?.label ?? "",
    value: item,
    defaultHighlightedIndex: 0,
    getItemProps: () => ({ text: "sentence" }),
    match: matchOrSuggestToCreate,
    onChange: (input) => {
      return setItem({
        property: input ?? "",
        label: input ?? "",
        key: input ?? "",
      });
    },
    onItemSelect: (item) => {
      clear();
      // When there is no value, property can be:
      // - property without value: gap
      // - declaration with value: gap: 10px
      // - block: gap: 10px; margin: 20px;
      if (item.value === undefined) {
        return onSubmit(item.property);
      }
      onSubmit(`${item.property}: ${item.value}`);
    },
    onItemHighlight: (item) => {
      const previousHighlightedItem = highlightedItemRef.current;
      if (item?.value === undefined && previousHighlightedItem) {
        deleteProperty(previousHighlightedItem.property as StyleProperty, {
          isEphemeral: true,
        });
        highlightedItemRef.current = undefined;
        return;
      }

      if (item?.value) {
        const value = parseCssValue(item.property as StyleProperty, item.value);
        setProperty(item.property as StyleProperty)(value, {
          isEphemeral: true,
        });
        highlightedItemRef.current = item;
      }
    },
  });

  const descriptionItem = combobox.items[combobox.highlightedIndex];
  const description = getNewPropertyDescription(descriptionItem);
  const descriptions = combobox.items.map(getNewPropertyDescription);
  const inputProps = combobox.getInputProps();

  const clear = () => {
    setItem({ property: "", label: "", key: "" });
  };

  const handleEnter = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      clear();
      onSubmit(item.property);
    }
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      clear();
      onClose();
    }
  };

  const handleDelete = (event: KeyboardEvent) => {
    // When user hits backspace and there is nothing in the input - we hide the input
    if (event.key === "Backspace" && combobox.inputValue === "") {
      clear();
      onClose();
    }
  };

  const handleKeyDown = composeEventHandlers([
    inputProps.onKeyDown,
    handleEnter,
    handleEscape,
    handleDelete,
  ]);

  const handleBlur = composeEventHandlers([
    inputProps.onBlur,
    () => {
      // When user clicks on a combobox item, input will receive blur event,
      // but we don't want that to be handled upstream because input may get hidden without click getting handled.
      if (combobox.isOpen === false) {
        onBlur();
      }
    },
  ]);

  return (
    <ComboboxRoot open={combobox.isOpen}>
      <div {...combobox.getComboboxProps()}>
        <ComboboxAnchor>
          <InputField
            {...inputProps}
            onFocus={onFocus}
            onBlur={handleBlur}
            inputRef={forwardedRef}
            onKeyDown={handleKeyDown}
            placeholder="Add styles"
            suffix={<NestedInputButton {...combobox.getToggleButtonProps()} />}
          />
        </ComboboxAnchor>
        <ComboboxContent>
          <ComboboxListbox {...combobox.getMenuProps()}>
            <ComboboxScrollArea>
              {combobox.items.map((item, index) => (
                <ComboboxListboxItem
                  {...combobox.getItemProps({ item, index })}
                  key={index}
                >
                  <Text
                    variant="labelsSentenceCase"
                    truncate
                    css={{ maxWidth: "25ch" }}
                  >
                    {item.label}
                  </Text>
                </ComboboxListboxItem>
              ))}
            </ComboboxScrollArea>
            {description && (
              <ComboboxItemDescription descriptions={descriptions}>
                {description}
              </ComboboxItemDescription>
            )}
          </ComboboxListbox>
        </ComboboxContent>
      </div>
    </ComboboxRoot>
  );
});
