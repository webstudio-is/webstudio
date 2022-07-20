import { ComponentStory } from "@storybook/react";
import React from "react";
import { Combobox } from "~/shared/design-system";
import { TextField } from "./text-field";

export default {
  component: Combobox,
};

export const Simple: ComponentStory<typeof Combobox> = () => {
  const options = [
    { label: "Apple" },
    { label: "Banana" },
    { label: "Orange" },
  ];
  const [value, setValue] = React.useState(options[0]);
  return (
    <Combobox
      name="fruit"
      options={options}
      value={value}
      onOptionSelect={setValue}
    />
  );
};
export const CustomInput: ComponentStory<typeof Combobox> = () => {
  const options = [
    { label: "Apple", value: "apple", disabled: true },
    { label: "Banana", value: "banana" },
    { label: "Orange", value: "orange" },
  ];
  const [value, setValue] = React.useState(options[0]);

  return (
    <Combobox
      name="fruit"
      options={options}
      value={value}
      onOptionSelect={setValue}
      onOptionHighlight={(option) => {
        console.log(option);
      }}
      disclosure={(props) => (
        <TextField
          {...props}
          onKeyDown={(event) => {
            props.onKeyDown(event);
            switch (event.key) {
              case "Enter": {
                console.log(props.value);
                break;
              }
            }
          }}
          onBlur={(event) => {
            props.onBlur(event);
            console.log(props.value);
          }}
        />
      )}
    />
  );
};
