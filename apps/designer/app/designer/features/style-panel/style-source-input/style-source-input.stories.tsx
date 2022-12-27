import { v4 as uuid } from "uuid";
import type { ComponentStory } from "@storybook/react";
import { useState } from "react";
import { StyleSourceInput } from "./style-source-input";

export default {
  component: StyleSourceInput,
};

const items = [
  { id: "1", label: "Apple", type: "token" },
  { id: "2", label: "Banana", type: "token" },
  { id: "3", label: "Orange", type: "token" },
];

export const Initial: ComponentStory<typeof StyleSourceInput> = () => {
  const [value, setValue] = useState([
    { id: "0", label: "Local", type: "local" },
  ]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreate={({ label }) => {
        const item = { id: uuid(), label, type: "token" };
        setValue([...value, item]);
      }}
      onSelect={(item) => {
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

export const WithItems: ComponentStory<typeof StyleSourceInput> = () => {
  const [value, setValue] = useState([
    { id: "0", label: "Local", type: "local" },
    ...items,
  ]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreate={({ label }) => {
        const item = { id: uuid(), label, type: "token" };
        setValue([...value, item]);
      }}
      onSelect={(item) => {
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

export const WithTruncatedItem: ComponentStory<
  typeof StyleSourceInput
> = () => {
  const [value, setValue] = useState([
    {
      id: "0",
      label:
        "Local Something Something Something Something Something Something Something Something Something Something Something",
      type: "local",
    },
  ]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreate={({ label }) => {
        const item = { id: uuid(), label, type: "token" };
        setValue([...value, item]);
      }}
      onSelect={(item) => {
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
