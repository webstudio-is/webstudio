import { useState, useEffect } from "react";
import {
  animatableProperties,
  isAnimatableProperty,
} from "@webstudio-is/css-data";
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
    items: animatableProperties.map((prop) => ({
      name: prop,
      label: prop,
    })),
    value: { name: inputValue, label: inputValue },
    selectedItem: undefined,
    itemToString: (value) => value?.name ?? "",
    onItemSelect: (prop) => {
      if (isAnimatableProperty(prop.name) === false) {
        return;
      }
      setInputValue(prop.name);
      onPropertySelection({ type: "keyword", value: prop.name });
    },
    onInputChange: (value) => setInputValue(value ?? ""),
  });

  const renderItem = (item: NameAndLabel, index) => (
    <ComboboxListboxItem
      key={item.name}
      selectable={false}
      {...getItemProps({
        item,
        index,
      })}
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
            </ComboboxListbox>
          </ComboboxContent>
        </div>
      </Combobox>
    </>
  );
};
