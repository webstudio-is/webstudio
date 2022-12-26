import { v4 as uuid } from "uuid";
import type { ComponentStory } from "@storybook/react";
import { useState } from "react";
import { StyleSourceInput, type StyleSource } from "./style-source-input";

export default {
  component: StyleSourceInput,
};

export const Simple: ComponentStory<typeof StyleSourceInput> = () => {
  const items: Array<StyleSource> = [
    { id: "1", label: "Apple", type: "token" },
    { id: "2", label: "Banana", type: "token" },
    { id: "3", label: "Orange", type: "token" },
  ];
  const [value, setValue] = useState<Array<StyleSource>>([
    { id: "0", label: "Local", type: "local" },
  ]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onItemCreate={(label) => {
        const item: StyleSource = { id: uuid(), label, type: "token" };
        setValue([...value, item]);
      }}
      onItemSelect={(item) => {
        setValue([...value, item]);
      }}
      onItemRemove={(itemToRemove) => {
        if (itemToRemove.type === "local") {
          return;
        }
        setValue(value.filter((item) => item.id !== itemToRemove.id));
      }}
    />
  );
};
