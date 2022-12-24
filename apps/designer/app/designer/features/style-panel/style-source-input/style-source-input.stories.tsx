import type { ComponentStory } from "@storybook/react";
import React from "react";
import { StyleSourceInput, type Item } from "./style-source-input";

export default {
  component: StyleSourceInput,
};

export const Simple: ComponentStory<typeof StyleSourceInput> = () => {
  const items: Array<Item> = [
    { label: "Apple", type: "token" },
    { label: "Banana", type: "token" },
    { label: "Orange", type: "token" },
  ];
  const [value, setValue] = React.useState<Array<Item>>([]);
  return (
    <StyleSourceInput
      items={items}
      value={value}
      onChangeComplete={(item) => {
        setValue([...value, item]);
      }}
      onRemove={(itemToRemove) => {
        // @todo use id
        setValue(value.filter((item) => item !== itemToRemove));
      }}
    />
  );
};
