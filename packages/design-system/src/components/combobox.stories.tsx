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
  ComboboxContent,
  Combobox,
  ComboboxListbox,
  ComboboxAnchor,
  ComboboxItemDescription,
} from "./combobox";
import { Flex } from "./flex";
import { InputField } from "./input-field";

export const Complex = () => {
  const [value, setValue] = useState("");

  const stateReducer = useCallback(
    (
      state: UseComboboxState<string>,
      actionAndChanges: UseComboboxStateChangeOptions<string>
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

  const {
    items,
    getComboboxProps,
    getMenuProps,
    getItemProps,
    getInputProps,
    isOpen,
  } = useCombobox<string>({
    items: ["Apple", "Banana", "Orange"],
    value,
    selectedItem: value,
    itemToString: (item) => item ?? "",
    stateReducer,
    onItemSelect: setValue,
    onInputChange: (value) => {
      if (value) {
        setValue(value);
      }
    },
  });

  return (
    <Combobox open={isOpen}>
      <Flex {...getComboboxProps()} direction="column" gap="3">
        <ComboboxAnchor>
          <InputField
            prefix={
              <Flex align="center">
                <MagnifyingGlassIcon />
              </Flex>
            }
            {...getInputProps({ value })}
          />
        </ComboboxAnchor>
        <ComboboxContent>
          <ComboboxListbox {...getMenuProps()}>
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
            <ComboboxItemDescription>Description</ComboboxItemDescription>
          </ComboboxListbox>
        </ComboboxContent>
      </Flex>
    </Combobox>
  );
};

export default {
  component: Complex,
};
