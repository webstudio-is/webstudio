import { useState } from "react";
import { animatableProperties } from "@webstudio-is/css-data";
import {
  Label,
  InputField,
  Combobox,
  ComboboxAnchor,
  Box,
  useCombobox,
  IconButton,
  ComboboxContent,
  ComboboxLabel,
  ComboboxListbox,
  ComboboxSeparator,
  ComboboxListboxItem,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import { humanizeString } from "~/shared/string-utils";
import type { KeywordValue, TupleValueItem } from "@webstudio-is/css-engine";

const commonProperties = [
  "all",
  "opacity",
  "margin",
  "padding",
  "border",
  "transform",
  "filter",
  "flex",
  "background-color",
  "font-color",
] as const;

type CommonProperties = (typeof commonProperties)[number];

const fileteredAnimatableProperties = animatableProperties.filter(
  (property) => !commonProperties.includes(property as CommonProperties)
);

type AnimatableProperties =
  | CommonProperties
  | (typeof fileteredAnimatableProperties)[number];

type TransitionPropertyProps = {
  property: KeywordValue;
  onPropertySelection: (property: TupleValueItem) => void;
};

export const TransitionProperty = ({
  property,
  onPropertySelection,
}: TransitionPropertyProps) => {
  const [selectedProperty, setSelectedProeprty] =
    useState<AnimatableProperties>(
      (property?.value as AnimatableProperties) ?? "all"
    );

  const {
    getComboboxProps,
    getToggleButtonProps,
    getInputProps,
    getMenuProps,
    getItemProps,
  } = useCombobox<AnimatableProperties>({
    items: [
      ...commonProperties,
      ...fileteredAnimatableProperties,
    ] as AnimatableProperties[],
    value: selectedProperty,
    selectedItem: selectedProperty,
    itemToString: (item) =>
      typeof item === "string" ? humanizeString(item) : "",
    onItemSelect(value) {
      setSelectedProeprty(value);
      onPropertySelection({ type: "keyword", value });
    },
  });

  const renderItem = (item: AnimatableProperties) => (
    <ComboboxListboxItem
      {...getItemProps({
        item,
        index: [...commonProperties, ...fileteredAnimatableProperties].indexOf(
          item
        ),
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
              {...getInputProps()}
              suffix={
                <IconButton {...getToggleButtonProps()}>
                  <ChevronDownIcon />
                </IconButton>
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
