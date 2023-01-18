import type { ComponentStory } from "@storybook/react";
import { MagnifyingGlassIcon } from "@webstudio-is/icons";
import React, { useCallback } from "react";
import { TextField } from "./text-field";
import {
  Combobox,
  ComboboxListboxItem,
  useCombobox,
  comboboxStateChangeTypes,
} from "./combobox";
import { Flex } from "./flex";
import { theme } from "../stitches.config";

export default {
  component: Combobox,
};

export const Simple: ComponentStory<typeof Combobox> = () => {
  const items = [{ label: "Apple" }, { label: "Banana" }, { label: "Orange" }];
  const [value, setValue] = React.useState<typeof items[number] | null>(null);
  return (
    <Combobox
      name="fruit"
      placeholder="Select a fruit"
      items={items}
      value={value}
      selectedItem={value}
      onItemSelect={(value) => {
        // If the value is cleared, we revert to previous state
        if (value !== null) {
          setValue(value);
        }
      }}
      itemToString={(item) => item?.label ?? ""}
    />
  );
};

export const Complex: ComponentStory<typeof Combobox> = () => {
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
      <TextField
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
