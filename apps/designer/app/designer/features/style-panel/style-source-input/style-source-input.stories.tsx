import { v4 as uuid } from "uuid";
import type { ComponentStory } from "@storybook/react";
import { useState } from "react";
import { StyleSourceInput } from "./style-source-input";
import noop from "lodash.noop";

export default {
  component: StyleSourceInput,
};

type Item = {
  id: string;
  label: string;
  type: "token" | "local";
  hasMenu: boolean;
};

const localItem: Item = {
  id: "0",
  label: "Local",
  type: "local",
  hasMenu: false,
};

const items: Array<Item> = [
  { id: "1", label: "Apple", type: "token", hasMenu: false },
  { id: "2", label: "Banana", type: "token", hasMenu: false },
  { id: "3", label: "Orange", type: "token", hasMenu: false },
];

export const Initial: ComponentStory<typeof StyleSourceInput> = () => {
  const [value, setValue] = useState<Array<Item>>([localItem]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreate={({ label }) => {
        const item: Item = { id: uuid(), label, type: "token", hasMenu: false };
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
      onChangeItem={noop}
      onDuplicate={noop}
    />
  );
};

export const WithItems: ComponentStory<typeof StyleSourceInput> = () => {
  const [value, setValue] = useState([localItem, ...items]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreate={({ label }) => {
        const item: Item = { id: uuid(), label, type: "token", hasMenu: false };
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
      onChangeItem={noop}
      onDuplicate={noop}
    />
  );
};

export const WithTruncatedItem: ComponentStory<
  typeof StyleSourceInput
> = () => {
  const [value, setValue] = useState<Array<Item>>([
    {
      id: "0",
      label:
        "Local Something Something Something Something Something Something Something Something Something Something Something",
      type: "local",
      hasMenu: false,
    },
  ]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreate={({ label }) => {
        const item: Item = { id: uuid(), label, type: "token", hasMenu: false };
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
      onChangeItem={noop}
      onDuplicate={noop}
    />
  );
};

export const WithMenu: ComponentStory<typeof StyleSourceInput> = () => {
  const [value, setValue] = useState<Array<Item>>([
    { id: "0", label: "Apple", type: "token", hasMenu: true },
  ]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreate={({ label }) => {
        const item: Item = { id: uuid(), label, type: "token", hasMenu: true };
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
      onDuplicate={noop}
      onChangeItem={(changedItem) => {
        setValue(
          value.map((item) => {
            if (item.id === changedItem.id) {
              return changedItem;
            }
            return item;
          })
        );
      }}
    />
  );
};
