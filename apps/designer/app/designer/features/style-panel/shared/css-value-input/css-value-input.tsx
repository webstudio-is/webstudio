import {
  Box,
  TextField,
  useCombobox,
  comboboxStateChangeTypes,
  ComboboxPopper,
  ComboboxPopperContent,
  ComboboxPopperAnchor,
  ComboboxListbox,
  ComboboxListboxItem,
  IconButton,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import {
  KeywordValue,
  StyleProperty,
  StyleValue,
  Unit,
  units,
} from "@webstudio-is/react-sdk";
import { useCallback, useEffect, useState } from "react";
import { parseCssValue } from "../parse-css-value";

const sortedUnits = units
  .slice(0)
  .sort((v) =>
    ["%", "px", "rem", "em", "ch", "vh", "vw", "hv", "vmin", "vmax"].includes(v)
      ? -1
      : 1
  );

type CssValueInputProps = {
  property: StyleProperty;
  value: StyleValue;
  items?: Array<KeywordValue>;
  onChange: (value: StyleValue) => void;
  onChangeComplete: (value: StyleValue) => void;
};

export const CssValueInput = ({
  property,
  value,
  items: itemsProp = [],
  onChange,
  onChangeComplete,
}: CssValueInputProps) => {
  const isInvalid = false;
  const onItemSelect = () => {};

  const stateReducer = useCallback((state, action) => {
    switch (action.type) {
      case comboboxStateChangeTypes.InputChange: {
      }
    }

    return action.changes;
  }, []);

  const {
    items,
    getInputProps,
    getComboboxProps,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    isOpen,
  } = useCombobox({
    items: itemsProp,
    value,
    itemToString: (item) => item?.value ?? "",
    onItemSelect,
    stateReducer,
  });

  const inputProps = getInputProps();

  console.log({ value, inputProps });

  useEffect(() => {
    if (inputProps.value === value.value) return;
    // @todo parseCssValue was done in setValue in useStyleData, now we need to move it to controls, otherwise we are going to do it twice with this one.
    const nextValue = parseCssValue(
      property,
      inputProps.value,
      "unit" in value ? value.unit : undefined
    );
    onChange?.(nextValue);
  }, [inputProps.value, value]);

  return (
    <ComboboxPopper>
      <Box {...getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextField
            {...inputProps}
            name={property}
            state={isInvalid ? "invalid" : undefined}
            suffix={
              <IconButton {...getToggleButtonProps()}>
                <ChevronDownIcon />
              </IconButton>
            }
          />
        </ComboboxPopperAnchor>
        <ComboboxPopperContent align="start" sideOffset={5}>
          <ComboboxListbox {...getMenuProps()}>
            {isOpen &&
              items.map((item, index) => (
                <ComboboxListboxItem
                  {...getItemProps({ item, index })}
                  key={index}
                >
                  {item.value}
                </ComboboxListboxItem>
              ))}
          </ComboboxListbox>
        </ComboboxPopperContent>
      </Box>
    </ComboboxPopper>
  );
};
