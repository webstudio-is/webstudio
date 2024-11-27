import { useState, useEffect } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { matchSorter } from "match-sorter";
import { animatableProperties } from "@webstudio-is/css-data";
import {
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
  ComboboxScrollArea,
} from "@webstudio-is/design-system";
import {
  hyphenateProperty,
  toValue,
  type KeywordValue,
  type StyleValue,
  type UnparsedValue,
} from "@webstudio-is/css-engine";
import { setUnion } from "~/shared/shim";
import { $definedStyles } from "../../shared/model";

type AnimatableProperty = (typeof animatableProperties)[number];

const commonTransitionProperties = [
  "all",
  "opacity",
  "margin",
  "padding",
  "border",
  "transform",
  "filter",
  "flex",
  "background-color",
];

const isAnimatableProperty = (
  property: string
): property is AnimatableProperty => {
  if (property === "all") {
    return true;
  }

  return [...commonTransitionProperties, ...animatableProperties].some(
    (item) => item === property
  );
};

type AnimatableProperties = (typeof animatableProperties)[number];
type NameAndLabel = { name: string; label?: string };
type TransitionPropertyProps = {
  value: StyleValue;
  onChange: (value: KeywordValue | UnparsedValue) => void;
};

const commonPropertiesSet = new Set(commonTransitionProperties);

/**
 * animatable and inherited properties
 * on current breakpoints across all states
 */
const $animatableDefinedProperties = computed(
  [$definedStyles],
  (definedStyles) => {
    const animatableProperties = new Set<string>();
    for (const { property } of definedStyles) {
      const hyphenatedProperty = hyphenateProperty(property);
      if (isAnimatableProperty(hyphenatedProperty)) {
        animatableProperties.add(hyphenatedProperty);
      }
    }
    return animatableProperties;
  }
);

export const TransitionProperty = ({
  value,
  onChange,
}: TransitionPropertyProps) => {
  const animatableDefinedProperties = useStore($animatableDefinedProperties);
  const valueString = toValue(value);
  const [inputValue, setInputValue] = useState<string>(valueString);
  useEffect(() => setInputValue(valueString), [valueString]);

  const properties = Array.from(
    setUnion(
      setUnion(animatableDefinedProperties, commonPropertiesSet),
      new Set(animatableProperties)
    )
  );

  const {
    items,
    isOpen,
    getComboboxProps,
    getToggleButtonProps,
    getInputProps,
    getMenuProps,
    getItemProps,
  } = useCombobox<NameAndLabel>({
    getItems: () =>
      properties.map((prop) => ({
        name: prop,
        label: prop === "transform" ? `${prop} (rotate, skew)` : prop,
      })),
    value: { name: inputValue as AnimatableProperties, label: inputValue },
    selectedItem: undefined,
    itemToString: (value) => value?.label || "",
    onItemSelect: (prop) => saveAnimatableProperty(prop.name),
    onChange: (value) => setInputValue(value ?? ""),

    // We are splitting the items into two lists.
    // But when users pass a input, the list is filtered and mixed together.
    // The UI is still showing the lists as separated. But the items are mixed together in background.
    // Since, first we show the properties on instance and then common-properties
    // followed by filtered-properties. We can use matchSorter to sort the items.

    match: (search, itemsToFilter, itemToString) => {
      if (search === "") {
        return itemsToFilter;
      }

      const sortedItems = matchSorter(itemsToFilter, search, {
        keys: [itemToString],
        sorter: (rankedItems) =>
          rankedItems.sort((a, b) => {
            // Keep the proeprties on instance at the top
            if (animatableDefinedProperties.has(a.item.name)) {
              return -1;
            }
            if (animatableDefinedProperties.has(b.item.name)) {
              return 1;
            }

            // Keep the common properties at the top as well
            if (commonPropertiesSet.has(a.item.name)) {
              return -1;
            }
            if (commonPropertiesSet.has(b.item.name)) {
              return 1;
            }

            // Maintain original rank if neither is prioritized
            return a.rank - b.rank;
          }),
      });

      return sortedItems;
    },
  });

  const commonProperties = items.filter(
    (item) =>
      commonPropertiesSet.has(item.name) === true &&
      animatableDefinedProperties.has(item.name) === false
  );
  const filteredProperties = items.filter(
    (item) =>
      commonPropertiesSet.has(item.name) === false &&
      animatableDefinedProperties.has(item.name) === false
  );
  const propertiesDefinedOnInstance: Array<NameAndLabel> = items.filter(
    (item) => animatableDefinedProperties.has(item.name)
  );

  const saveAnimatableProperty = (propertyName: string) => {
    if (isAnimatableProperty(propertyName) === false) {
      return;
    }
    setInputValue(propertyName);
    onChange({ type: "unparsed", value: propertyName });
  };

  const renderItem = (item: NameAndLabel, index: number) => {
    return (
      <ComboboxListboxItem
        {...getItemProps({
          item,
          index,
        })}
        key={item.name}
        selected={item.name === inputValue}
      >
        {item?.label ?? ""}
      </ComboboxListboxItem>
    );
  };

  return (
    <ComboboxRoot open={isOpen}>
      <div {...getComboboxProps()}>
        <ComboboxAnchor>
          <InputField
            autoFocus
            {...getInputProps({
              onKeyDown: (event) => {
                if (event.key === "Enter") {
                  saveAnimatableProperty(inputValue);
                }
                event.stopPropagation();
              },
            })}
            placeholder="all"
            suffix={<NestedInputButton {...getToggleButtonProps()} />}
          />
        </ComboboxAnchor>
        <ComboboxContent align="end" sideOffset={5}>
          <ComboboxListbox {...getMenuProps()}>
            <ComboboxScrollArea>
              {isOpen && (
                <>
                  {propertiesDefinedOnInstance.length > 0 && (
                    <>
                      <ComboboxLabel>Defined</ComboboxLabel>
                      {propertiesDefinedOnInstance.map((property, index) =>
                        renderItem(property, index)
                      )}
                      <ComboboxSeparator />
                    </>
                  )}

                  <ComboboxLabel>Common</ComboboxLabel>
                  {commonProperties.map((property, index) =>
                    renderItem(
                      property,
                      propertiesDefinedOnInstance.length + index
                    )
                  )}
                  <ComboboxSeparator />

                  {filteredProperties.map((property, index) =>
                    renderItem(
                      property,
                      propertiesDefinedOnInstance.length +
                        commonProperties.length +
                        index
                    )
                  )}
                </>
              )}
            </ComboboxScrollArea>
          </ComboboxListbox>
        </ComboboxContent>
      </div>
    </ComboboxRoot>
  );
};
