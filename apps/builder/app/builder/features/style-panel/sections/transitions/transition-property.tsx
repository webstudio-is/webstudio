import { useState, useEffect, useMemo } from "react";
import {
  animatableProperties,
  commonTransitionProperties,
  isAnimatableProperty,
  propertyDescriptions,
} from "@webstudio-is/css-data";
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
  toValue,
  type KeywordValue,
  type StyleValue,
  type UnparsedValue,
} from "@webstudio-is/css-engine";
import { matchSorter } from "match-sorter";
import { setUnion } from "~/shared/shim";
import { type StyleInfo } from "../../shared/style-info";
import { getAnimatablePropertiesOnInstance } from "./transition-utils";
import { PropertyInlineLabel } from "../../property-label";

type AnimatableProperties = (typeof animatableProperties)[number];
type NameAndLabel = { name: string; label?: string };
type TransitionPropertyProps = {
  property: StyleValue;
  currentStyle: StyleInfo;
  onPropertySelection: (params: {
    property: KeywordValue | UnparsedValue;
  }) => void;
};

const commonPropertiesSet = new Set(commonTransitionProperties);

export const TransitionProperty = ({
  property,
  currentStyle,
  onPropertySelection,
}: TransitionPropertyProps) => {
  const valueString = toValue(property);
  const [inputValue, setInputValue] = useState<string>(valueString);
  useEffect(() => setInputValue(valueString), [valueString]);
  const propertiesDefinedOnInstanceSet = useMemo(
    () => getAnimatablePropertiesOnInstance(currentStyle),
    [currentStyle]
  );

  const properties = Array.from(
    setUnion(
      setUnion(propertiesDefinedOnInstanceSet, commonPropertiesSet),
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
    items: properties.map((prop) => ({
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
            // Prioritize exact matches
            if (a.item.name === search) {
              return -1;
            }
            if (b.item.name === search) {
              return 1;
            }

            // Keep the proeprties on instance at the top
            if (propertiesDefinedOnInstanceSet.has(a.item.name)) {
              return -1;
            }
            if (propertiesDefinedOnInstanceSet.has(b.item.name)) {
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
      propertiesDefinedOnInstanceSet.has(item.name) === false
  );
  const filteredProperties = items.filter(
    (item) =>
      commonPropertiesSet.has(item.name) === false &&
      propertiesDefinedOnInstanceSet.has(item.name) === false
  );
  const propertiesDefinedOnInstance: Array<NameAndLabel> = items.filter(
    (item) => propertiesDefinedOnInstanceSet.has(item.name)
  );

  const saveAnimatableProperty = (propertyName: string) => {
    if (isAnimatableProperty(propertyName) === false) {
      return;
    }
    setInputValue(propertyName);
    onPropertySelection({
      property: { type: "unparsed", value: propertyName },
    });
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
    <>
      <PropertyInlineLabel
        label="Property"
        description={propertyDescriptions.transitionProperty}
        properties={["transitionProperty"]}
      />
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
    </>
  );
};
