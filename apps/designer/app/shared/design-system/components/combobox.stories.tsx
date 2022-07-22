import { action } from "@storybook/addon-actions";
import { ComponentStory } from "@storybook/react";
import React from "react";
import { Combobox, ComboboxTextField } from "./combobox";

export default {
  component: Combobox,
};

export const Simple: ComponentStory<typeof Combobox> = () => {
  const items = [{ label: "Apple" }, { label: "Banana" }, { label: "Orange" }];
  const [value, setValue] = React.useState(items[0]);
  return (
    <Combobox
      name="fruit"
      items={items}
      value={value}
      onItemSelect={setValue}
    />
  );
};

export const CustomInput: ComponentStory<typeof Combobox> = () => {
  const items = [
    { label: "Apple", value: "apple", disabled: true },
    { label: "Banana", value: "banana" },
    { label: "Orange", value: "orange" },
  ];
  const [value, setValue] = React.useState(items[0]);

  return (
    <Combobox
      name="fruit"
      items={items}
      value={value}
      onItemSelect={setValue}
      onItemHighlight={(item) => {
        action("Highlight")(item);
      }}
      disclosure={({ inputProps, toggleProps }) => (
        <ComboboxTextField
          toggleProps={toggleProps}
          inputProps={{
            ...inputProps,
            onKeyDown: (event) => {
              inputProps.onKeyDown?.(event);
              switch (event.key) {
                case "Enter": {
                  action("Enter")(inputProps.value);
                  break;
                }
              }
            },
            onBlur: (event) => {
              inputProps.onBlur?.(event);
              action("Blur")(inputProps.value);
            },
          }}
        />
      )}
    />
  );
};
