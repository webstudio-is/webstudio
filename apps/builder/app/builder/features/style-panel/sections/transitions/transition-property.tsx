import { useState } from "react";
import { animatableProperties } from "@webstudio-is/css-data";
import {
  Label,
  theme,
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
import type { KeywordValue } from "@webstudio-is/css-engine";

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
];

const fileteredAnimatableProperties = animatableProperties.filter(
  (property) => !commonProperties.includes(property)
);

type TransitionPropertyProps = {
  property: KeywordValue | null;
};

export const TransitionProperty = ({ property }: TransitionPropertyProps) => {
  const [selectedProperty, setSelectedProeprty] = useState<string>(
    property?.value ?? "all"
  );

  const {
    getComboboxProps,
    getToggleButtonProps,
    getInputProps,
    getMenuProps,
    getItemProps,
  } = useCombobox<string>({
    items: [...commonProperties, ...fileteredAnimatableProperties],
    value: selectedProperty,
    selectedItem: selectedProperty,
    itemToString: (item) =>
      typeof item === "string" ? humanizeString(item) : "",
    onItemSelect(value) {
      setSelectedProeprty(value);
    },
  });

  const renderItem = (item: string) => (
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
            <ComboboxListbox
              {...getMenuProps()}
              css={{ zIndex: theme.zIndices[1] }}
            >
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
