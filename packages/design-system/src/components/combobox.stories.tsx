import { MagnifyingGlassIcon } from "@webstudio-is/icons";
import { useCallback, useState } from "react";
import type {
  UseComboboxState,
  UseComboboxStateChangeOptions,
} from "downshift";
import {
  ComboboxListboxItem,
  useCombobox,
  comboboxStateChangeTypes,
} from "./combobox";
import { Flex } from "./flex";
import { InputField } from "./input-field";

export const Complex = () => {
  const [value, setValue] = useState<string | null>(null);

  const stateReducer = useCallback(
    (
      state: UseComboboxState<string | null>,
      actionAndChanges: UseComboboxStateChangeOptions<string | null>
    ) => {
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
    },
    []
  );

  const { items, getComboboxProps, getMenuProps, getItemProps, getInputProps } =
    useCombobox<string | null>({
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
    <Flex {...getComboboxProps()} direction="column" gap="3">
      <InputField
        type="search"
        prefix={
          <Flex align="center">
            <MagnifyingGlassIcon />
          </Flex>
        }
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
