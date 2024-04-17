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
  ComboboxRoot,
  ComboboxListbox,
  ComboboxAnchor,
  ComboboxItemDescription,
  Combobox,
} from "./combobox";
import { Flex } from "./flex";
import { InputField } from "./input-field";

export const Basic = () => {
  const [value, setValue] = useState("");
  return (
    <Combobox<string>
      value={value}
      itemToString={(item) => item ?? ""}
      items={["Apple", "Banana", "Orange"]}
      onItemSelect={setValue}
      onInputChange={(value) => {
        setValue(value ?? "");
      }}
    />
  );
};

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
    <ComboboxRoot open={isOpen}>
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
    </ComboboxRoot>
  );
};

export default {
  component: Complex,
};
