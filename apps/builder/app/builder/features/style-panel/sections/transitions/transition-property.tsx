import { useState, useEffect } from "react";
import {
  animatableProperties,
  isAnimatableProperty,
} from "@webstudio-is/css-data";
import {
  Label,
  InputField,
  ComboboxRoot,
  ComboboxAnchor,
  useCombobox,
  ComboboxContent,
  ComboboxLabel,
  ComboboxListbox,
  ComboboxListboxItem,
  ComboboxSeparator,
  NestedInputButton,
  Tooltip,
  Text,
  Flex,
  ComboboxScrollArea,
} from "@webstudio-is/design-system";
import type { KeywordValue } from "@webstudio-is/css-engine";
import { matchSorter } from "match-sorter";

type AnimatableProperties = (typeof animatableProperties)[number];
type NameAndLabel = { name: AnimatableProperties; label?: string };
type TransitionPropertyProps = {
  property: KeywordValue;
  onPropertySelection: (params: { property: KeywordValue }) => void;
};

const commonPropertiesSet = new Set<AnimatableProperties>([
  "all",
  "opacity",
  "margin",
  "padding",
  "border",
  "transform",
  "filter",
  "flex",
  "background-color",
]);

const filteredPropertiesSet = new Set<AnimatableProperties>(
  animatableProperties.filter((item) => commonPropertiesSet.has(item) === false)
);

export const TransitionProperty = ({
  property,
  onPropertySelection,
}: TransitionPropertyProps) => {
  const [inputValue, setInputValue] = useState(property.value ?? "all");
  useEffect(() => setInputValue(property.value), [property.value]);

  const {
    items,
    isOpen,
    getComboboxProps,
    getToggleButtonProps,
    getInputProps,
    getMenuProps,
    getItemProps,
  } = useCombobox<NameAndLabel>({
    items: [
      ...Array.from(commonPropertiesSet),
      ...Array.from(filteredPropertiesSet),
    ].map((prop) => ({
      name: prop,
      label: prop,
    })),
    value: { name: inputValue as AnimatableProperties, label: inputValue },
    selectedItem: undefined,
    itemToString: (value) => value?.label || "",
    onItemSelect: (prop) => {
      if (isAnimatableProperty(prop.name) === false) {
        return;
      }
      setInputValue(prop.name);
      onPropertySelection({ property: { type: "keyword", value: prop.name } });
    },
    onInputChange: (value) => setInputValue(value ?? ""),
    /*
      We are splitting the items into two lists.
      But when users pass a input, the list is filtered and mixed together.
      The UI is still showing the lists as separated. But the items are mixed together in background.
      Since, first we show the common-properties followed by filtered-properties. We can use matchSorter to sort the items.
    */
    match: (search, itemsToFilter, itemToString) => {
      if (search === "") {
        return itemsToFilter;
      }

      const sortedItems = matchSorter(itemsToFilter, search, {
        keys: [itemToString],
        sorter: (rankedItems) =>
          rankedItems.sort((a) =>
            commonPropertiesSet.has(a.item.name) ? -1 : 1
          ),
      });

      return sortedItems;
    },
  });

  const commonProperties = items.filter(
    (item) => commonPropertiesSet.has(item.name) === true
  );

  const filteredProperties = items.filter(
    (item) => commonPropertiesSet.has(item.name) === false
  );

  const renderItem = (item: NameAndLabel, index: number) => (
    <ComboboxListboxItem
      key={item.name}
      {...getItemProps({
        item,
        index,
      })}
      selected={item.name === inputValue}
    >
      {item?.label ?? ""}
    </ComboboxListboxItem>
  );

  return (
    <>
      <Flex align="center">
        <Tooltip
          variant="wrapped"
          content={
            <Flex gap="2" direction="column">
              <Text variant="regularBold">Property</Text>
              <Text variant="monoBold" color="moreSubtle">
                transition-property
              </Text>
              <Text>
                Sets the CSS properties that will be affected by the transition.
              </Text>
            </Flex>
          }
        >
          <Label css={{ display: "inline" }}> Property </Label>
        </Tooltip>
      </Flex>
      <ComboboxRoot open={isOpen}>
        <div {...getComboboxProps()}>
          <ComboboxAnchor>
            <InputField
              autoFocus
              {...getInputProps({ onKeyDown: (e) => e.stopPropagation() })}
              placeholder="all"
              suffix={<NestedInputButton {...getToggleButtonProps()} />}
            />
          </ComboboxAnchor>
          <ComboboxContent align="end" sideOffset={5}>
            <ComboboxListbox {...getMenuProps()}>
              <ComboboxScrollArea>
                {isOpen && (
                  <>
                    <ComboboxLabel>Common</ComboboxLabel>
                    {commonProperties.map(renderItem)}
                    <ComboboxSeparator />
                    {filteredProperties.map((property, index) =>
                      /*
                      When rendered in two different lists.
                      We will have two indexes start at '0'. Which leads to
                      - The same focus might be repeated when highlighted.
                      - Using findIndex within getItemProps might make the focus jump around,
                        as it searches the entire list for items.
                        This happens because the list isn't sorted in order but is divided when rendering.
                    */
                      renderItem(property, commonProperties.length + index)
                    )}
                  </>
                )}
              </ComboboxScrollArea>
            </ComboboxListbox>
          </ComboboxContent>
        </div>
      </ComboboxRoot>
    </>
  );
};
