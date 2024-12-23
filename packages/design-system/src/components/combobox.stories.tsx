import { SearchIcon } from "@webstudio-is/icons";
import { useCallback, useState } from "react";
import type {
  UseComboboxState,
  UseComboboxStateChangeOptions,
} from "downshift";
import {
  ComboboxListboxItem,
  useCombobox,
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
      getItems={() => ["Apple", "Banana", "Orange"]}
      onItemSelect={setValue}
      onChange={(value) => {
        setValue(value ?? "");
      }}
    />
  );
};

export const Complex = () => {
  const [value, setValue] = useState("");

  const stateReducer = useCallback(
    (
      _state: UseComboboxState<string>,
      actionAndChanges: UseComboboxStateChangeOptions<string>
    ) => {
      const { type, changes } = actionAndChanges;

      switch (type) {
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
    getItems: () => ["Apple", "Banana", "Orange"],
    value,
    selectedItem: value,
    itemToString: (item) => item ?? "",
    stateReducer,
    onItemSelect: setValue,
    onChange: (value) => {
      setValue(value ?? "");
    },
  });

  return (
    <ComboboxRoot open={isOpen}>
      <Flex {...getComboboxProps()} direction="column" gap="3">
        <ComboboxAnchor asChild>
          <InputField
            prefix={
              <Flex align="center">
                <SearchIcon />
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
                  {...getItemProps({ item, index })}
                  key={index}
                >
                  {item}
                </ComboboxListboxItem>
              );
            })}
            <ComboboxItemDescription
              descriptions={["Hello", "World", "Description"]}
            >
              Description
            </ComboboxItemDescription>
          </ComboboxListbox>
        </ComboboxContent>
      </Flex>
    </ComboboxRoot>
  );
};

export default {
  component: Complex,
};
