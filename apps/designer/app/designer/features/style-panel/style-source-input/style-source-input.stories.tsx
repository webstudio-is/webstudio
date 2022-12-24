import type { ComponentStory } from "@storybook/react";
import React from "react";
import { StyleSourceInput, type Item } from "./style-source-input";

export default {
  component: StyleSourceInput,
};

export const Simple: ComponentStory<typeof StyleSourceInput> = () => {
  const items: Array<Item> = [
    { id: "1", label: "Apple", type: "token" },
    { id: "2", label: "Banana", type: "token" },
    { id: "3", label: "Orange", type: "token" },
  ];
  const [value, setValue] = React.useState<Array<Item>>([
    { id: "0", label: "Local", type: "local" },
  ]);
  return (
    <StyleSourceInput
      items={items}
      value={value}
      onChangeComplete={(item) => {
        setValue([...value, item]);
      }}
      onRemove={(itemToRemove) => {
        if (itemToRemove.type === "local") {
          return;
        }
        setValue(value.filter((item) => item.id !== itemToRemove.id));
      }}
    />
  );
};
