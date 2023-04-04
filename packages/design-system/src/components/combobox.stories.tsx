import { MagnifyingGlassIcon } from "@webstudio-is/icons";
import React, { useCallback } from "react";
import { DeprecatedTextField } from "./__DEPRECATED__/text-field";
import {
  ComboboxListboxItem,
  useCombobox,
  comboboxStateChangeTypes,
} from "./combobox";
import { Flex } from "./flex";
import { theme } from "../stitches.config";

export const Complex = () => {
  const [value, setValue] = React.useState<string | null>(null);

  const stateReducer = useCallback((state, actionAndChanges) => {
    const { type, changes } = actionAndChanges;
    switch (type) {
      // on item selection.
      case comboboxStateChangeTypes.ItemClick:
      case comboboxStateChangeTypes.InputKeyDownEnter:
      case comboboxStateChangeTypes.InputBlur:
      case comboboxStateChangeTypes.ControlledPropUpdatedSelectedItem:
        return {
          ...changes,
          // if we have a selected item.
          ...(changes.selectedItem && {
            // we will set the input value to "" (empty string).
            inputValue: "",
          }),
        };

      // Remove "reset" action
      case comboboxStateChangeTypes.InputKeyDownEscape: {
        return {
          ...state,
        };
      }

      default:
        return changes; // otherwise business as usual.
    }
  }, []);

  const { items, getComboboxProps, getMenuProps, getItemProps, getInputProps } =
    useCombobox({
      items: ["Apple", "Banana", "Orange"],
      value,
      selectedItem: value,
      itemToString: (item) => item ?? "",
      stateReducer,
      onItemSelect: (value) => {
        setValue(value);
      },
    });

  return (
    <Flex
      {...getComboboxProps()}
      css={{ flexDirection: "column", gap: theme.spacing[9] }}
    >
      <DeprecatedTextField
        type="search"
        prefix={<MagnifyingGlassIcon />}
        {...getInputProps({})}
      />
      <fieldset>
        <legend>Choose an item</legend>
        <Flex {...getMenuProps()} css={{ flexDirection: "column" }}>
          {items.map((item, index) => {
            return (
              <ComboboxListboxItem
                key={index}
                {...getItemProps({ item, index })}
              >
                {item}
              </ComboboxListboxItem>
            );
          })}
        </Flex>
      </fieldset>
    </Flex>
  );
};

export default {
  component: Complex,
};
