import { useState } from "react";
import { animatableProperties } from "@webstudio-is/css-data";
import {
  Label,
  InputField,
  Combobox,
  ComboboxAnchor,
  useCombobox,
  ComboboxContent,
  ComboboxLabel,
  ComboboxListbox,
  ComboboxListboxItem,
  ComboboxSeparator,
  theme,
  css,
  NestedInputButton,
} from "@webstudio-is/design-system";
import type { KeywordValue, TupleValueItem } from "@webstudio-is/css-engine";

type AnimatableProperties = (typeof animatableProperties)[number];

const commonProperties: AnimatableProperties[] = [
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

const commonPropertiesSet: Set<AnimatableProperties> = new Set(
  commonProperties
);

const animatablePropertiesSet: Set<AnimatableProperties> = new Set(
  animatableProperties.filter((property) => !commonPropertiesSet.has(property))
);

const allPropertiesSet: Set<AnimatableProperties> = new Set([
  ...commonProperties,
  ...animatableProperties,
]);

type NameAndLabel = { name: string; label?: string };

type TransitionPropertyProps = {
  property: KeywordValue;
  onPropertySelection: (property: TupleValueItem) => void;
};

const comboBoxStyles = css({ zIndex: theme.zIndices[1] });

export const TransitionProperty = ({
  property,
  onPropertySelection,
}: TransitionPropertyProps) => {
  const [inputValue, setInputValue] = useState(property?.value ?? "all");
  const [filteredProperties, setFilteredProperties] = useState(
    animatablePropertiesSet
  );
  const [commonlyDisplayedProperties, setCommonlyDisplayedProperties] =
    useState(commonPropertiesSet);

  const {
    getComboboxProps,
    getToggleButtonProps,
    getInputProps,
    getMenuProps,
    getItemProps,
    closeMenu,
    isOpen,
  } = useCombobox<NameAndLabel>({
    items: Array.from(allPropertiesSet).map((prop) => ({
      name: prop,
      label: prop,
    })),
    value: { name: inputValue, label: inputValue },
    selectedItem: undefined,
    itemToString: (value) => value?.name ?? "",
    onItemSelect: (prop) => {
      setInputValue(prop.name);
      onPropertySelection({ type: "keyword", value: prop.name });
    },
    onInputChange: (value) => {
      if (value === undefined) {
        return "";
      }
      setInputValue(value);
      filterProperties(value);
    },
  });

  const filterProperties = (value: string) => {
    const filtered = new Set<AnimatableProperties>();
    animatablePropertiesSet.forEach((property) => {
      if (property.includes(value)) {
        filtered.add(property);
      }
    });
    setFilteredProperties(filtered);

    const commonFiltered = new Set<AnimatableProperties>();
    commonPropertiesSet.forEach((property) => {
      if (property.includes(value)) {
        commonFiltered.add(property);
      }
    });
    setCommonlyDisplayedProperties(commonFiltered);
  };

  const renderMatchingItems = (properties: Set<AnimatableProperties>) => {
    const matchedItems: AnimatableProperties[] = Array.from(properties);
    return matchedItems.map(renderItem);
  };

  const renderItem = (item: AnimatableProperties) => (
    <ComboboxListboxItem
      {...getItemProps({
        item: { name: item, label: item },
        index: Array.from(allPropertiesSet).findIndex((prop) => prop === item),
      })}
      key={item}
    >
      {item}
    </ComboboxListboxItem>
  );

  return (
    <>
      <Label> Property </Label>
      <Combobox>
        <div {...getComboboxProps()}>
          <ComboboxAnchor>
            <InputField
              autoFocus
              {...getInputProps({
                onKeyDown: (event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onPropertySelection({
                      type: "keyword",
                      value: inputValue,
                    });
                    closeMenu();
                  }
                },
              })}
              placeholder="all"
              suffix={<NestedInputButton {...getToggleButtonProps()} />}
            />
          </ComboboxAnchor>
          <ComboboxContent
            align="end"
            sideOffset={5}
            className={comboBoxStyles()}
          >
            <ComboboxListbox {...getMenuProps()}>
              {isOpen && (
                <>
                  <ComboboxLabel>Common</ComboboxLabel>
                  {renderMatchingItems(commonlyDisplayedProperties)}
                  <ComboboxSeparator />
                  <ComboboxLabel>Filtered</ComboboxLabel>
                  {renderMatchingItems(filteredProperties)}
                </>
              )}
            </ComboboxListbox>
          </ComboboxContent>
        </div>
      </Combobox>
    </>
  );
};
