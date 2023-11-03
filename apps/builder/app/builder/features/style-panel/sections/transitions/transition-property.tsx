import { useState, useEffect } from "react";
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
type NameAndLabel = { name: string; label?: string };
type TransitionPropertyProps = {
  property: KeywordValue;
  onPropertySelection: (property: TupleValueItem) => void;
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

const comboBoxStyles = css({ zIndex: theme.zIndices[1] });

export const TransitionProperty = ({
  property,
  onPropertySelection,
}: TransitionPropertyProps) => {
  const [inputValue, setInputValue] = useState(property?.value ?? "all");
  useEffect(() => setInputValue(property.value), [property]);

  const {
    items,
    isOpen,
    getComboboxProps,
    getToggleButtonProps,
    getInputProps,
    getMenuProps,
    getItemProps,
  } = useCombobox<NameAndLabel>({
    items: animatableProperties.map((prop) => ({
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
    },
  });

  const renderItem = (item: NameAndLabel, index: number) => (
    <ComboboxListboxItem
      key={item.name}
      selectable={false}
      {...getItemProps({ item, index: items.indexOf(item) })}
    >
      {item.name}
    </ComboboxListboxItem>
  );

  const commonProperties = items.filter(
    (item) =>
      commonPropertiesSet.has(item.name as AnimatableProperties) === true
  );

  const filteredProperties = items.filter(
    (item) =>
      commonPropertiesSet.has(item.name as AnimatableProperties) === false
  );

  return (
    <>
      <Label> Property </Label>
      <Combobox>
        <div {...getComboboxProps()}>
          <ComboboxAnchor>
            <InputField
              autoFocus
              {...getInputProps({ onKeyDown: (e) => e.stopPropagation() })}
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
                  {commonProperties.map(renderItem)}
                  <ComboboxSeparator />
                  {filteredProperties.map(renderItem)}
                </>
              )}
            </ComboboxListbox>
          </ComboboxContent>
        </div>
      </Combobox>
    </>
  );
};
