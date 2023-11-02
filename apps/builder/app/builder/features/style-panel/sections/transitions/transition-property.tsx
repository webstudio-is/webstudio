import { useState } from "react";
import { animatableProperties } from "@webstudio-is/css-data";
import {
  Label,
  InputField,
  Combobox,
  ComboboxAnchor,
  Box,
  useCombobox,
  ComboboxContent,
  ComboboxLabel,
  ComboboxListbox,
  ComboboxSeparator,
  ComboboxListboxItem,
  DeprecatedIconButton,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
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

const fileteredAnimatableProperties = animatableProperties.filter(
  (property) => !commonProperties.includes(property)
);

const transitionProperties: Array<{
  name: AnimatableProperties;
  label: string;
}> = [...commonProperties, ...fileteredAnimatableProperties].map((prop) => ({
  name: prop,
  label: prop,
}));

type NameAndLabel = { name: string; label?: string };

type TransitionPropertyProps = {
  property: KeywordValue;
  onPropertySelection: (property: TupleValueItem) => void;
};

export const TransitionProperty = ({
  property,
  onPropertySelection,
}: TransitionPropertyProps) => {
  const [inputValue, setInputValue] = useState(property?.value ?? "all");

  const {
    getComboboxProps,
    getToggleButtonProps,
    getInputProps,
    getMenuProps,
    getItemProps,
    closeMenu,
  } = useCombobox<NameAndLabel>({
    items: transitionProperties,
    value: { name: inputValue, label: inputValue },
    selectedItem: undefined,
    itemToString: (value) => value?.name ?? "",
    onItemSelect: (prop) => {
      setInputValue(prop.name);
      onPropertySelection({ type: "keyword", value: prop.name });
    },
    onInputChange: (value) => setInputValue(value ?? ""),
  });

  const renderItem = (item: AnimatableProperties) => (
    <ComboboxListboxItem
      {...getItemProps({
        item: { name: item, label: item },
        index: transitionProperties.findIndex((prop) => prop.name === item),
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
        <Box {...getComboboxProps()}>
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
              suffix={
                <DeprecatedIconButton {...getToggleButtonProps()}>
                  <ChevronDownIcon />
                </DeprecatedIconButton>
              }
            />
          </ComboboxAnchor>
          <ComboboxContent align="end" sideOffset={5}>
            <ComboboxListbox {...getMenuProps()}>
              <ComboboxLabel>Common</ComboboxLabel>
              {commonProperties.map(renderItem)}
              <ComboboxSeparator />
              {fileteredAnimatableProperties.map(renderItem)}
            </ComboboxListbox>
          </ComboboxContent>
        </Box>
      </Combobox>
    </>
  );
};
