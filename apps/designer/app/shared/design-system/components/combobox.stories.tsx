import { ComponentStory } from "@storybook/react";
import React from "react";
import { Combobox } from "~/shared/design-system";

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
      items={options}
      value={value}
      onValueChange={setValue}
    />
  );
};
