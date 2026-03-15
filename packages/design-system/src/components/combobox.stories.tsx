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
import { StorySection } from "./storybook";

const BasicDemo = () => {
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

const ComplexDemo = () => {
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

const WithPlaceholderDemo = () => {
  const [value, setValue] = useState("");
  return (
    <Combobox<string>
      value={value}
      itemToString={(item) => item ?? ""}
      getItems={() => ["Apple", "Banana", "Orange"]}
      onItemSelect={setValue}
      onChange={(value) => setValue(value ?? "")}
      placeholder="Search fruits…"
    />
  );
};

const WithAutoFocusDemo = () => {
  const [value, setValue] = useState("");
  return (
    <Combobox<string>
      value={value}
      itemToString={(item) => item ?? ""}
      getItems={() => ["Apple", "Banana", "Orange"]}
      onItemSelect={setValue}
      onChange={(value) => setValue(value ?? "")}
      autoFocus
      placeholder="Focused on mount"
    />
  );
};

const WithErrorColorDemo = () => {
  const [value, setValue] = useState("");
  return (
    <Combobox<string>
      value={value}
      itemToString={(item) => item ?? ""}
      getItems={() => ["Apple", "Banana", "Orange"]}
      onItemSelect={setValue}
      onChange={(value) => setValue(value ?? "")}
      color="error"
      placeholder="Error state"
    />
  );
};

const fruitDescriptions: Record<string, string> = {
  Apple: "A red or green fruit",
  Banana: "A yellow tropical fruit",
  Orange: "A citrus fruit",
} as const;

const WithDescriptionDemo = () => {
  const [value, setValue] = useState("");
  return (
    <Combobox<string>
      value={value}
      itemToString={(item) => item ?? ""}
      getItems={() => ["Apple", "Banana", "Orange"]}
      getDescription={(item) => (item ? fruitDescriptions[item] : undefined)}
      onItemSelect={setValue}
      onChange={(value) => setValue(value ?? "")}
      placeholder="Pick a fruit…"
    />
  );
};

export const ComboboxStory = () => (
  <>
    <StorySection title="Basic">
      <BasicDemo />
    </StorySection>
    <StorySection title="Complex">
      <ComplexDemo />
    </StorySection>
    <StorySection title="With placeholder">
      <WithPlaceholderDemo />
    </StorySection>
    <StorySection title="With auto focus">
      <WithAutoFocusDemo />
    </StorySection>
    <StorySection title="With error color">
      <WithErrorColorDemo />
    </StorySection>
    <StorySection title="With description">
      <WithDescriptionDemo />
    </StorySection>
  </>
);

export default {
  title: "Combobox",
  component: ComboboxStory,
};
