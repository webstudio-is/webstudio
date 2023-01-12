import { v4 as uuid } from "uuid";
import type { ComponentStory } from "@storybook/react";
import { useState } from "react";
import { StyleSourceInput, type ItemState } from "./";

export default {
  component: StyleSourceInput,
};

type Item = {
  id: string;
  label: string;
  type: "token" | "local";
  hasMenu: boolean;
  state: ItemState;
};

const localItem: Item = {
  id: "0",
  label: "Local",
  type: "local",
  hasMenu: false,
  state: "initial",
};

const items: Array<Item> = [
  { id: "1", label: "Apple", type: "token", hasMenu: false, state: "initial" },
  {
    id: "2",
    label: "Banana",
    type: "token",
    hasMenu: false,
    state: "initial",
  },
  {
    id: "3",
    label: "Orange",
    type: "token",
    hasMenu: false,
    state: "initial",
  },
];

export const Initial: ComponentStory<typeof StyleSourceInput> = () => {
  const [value, setValue] = useState<Array<Item>>([localItem]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreateItem={({ label }) => {
        const item: Item = {
          id: uuid(),
          label,
          type: "token",
          hasMenu: false,
          state: "initial",
        };
        setValue([...value, item]);
      }}
      onSelectItem={(item) => {
        setValue([...value, item]);
      }}
      onRemoveItem={(itemToRemove) => {
        if (itemToRemove.type === "local") {
          return;
        }
        setValue(value.filter((item) => item.id !== itemToRemove.id));
      }}
      onSort={setValue}
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
      onCreateItem={({ label }) => {
        const item: Item = {
          id: uuid(),
          label,
          type: "token",
          hasMenu: false,
          state: "initial",
        };
        setValue([...value, item]);
      }}
      onSelectItem={(item) => {
        setValue([...value, item]);
      }}
      onRemoveItem={(itemToRemove) => {
        if (itemToRemove.type === "local") {
          return;
        }
        setValue(value.filter((item) => item.id !== itemToRemove.id));
      }}
      onSort={setValue}
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
      state: "initial",
    },
  ]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreateItem={({ label }) => {
        const item: Item = {
          id: uuid(),
          label,
          type: "token",
          hasMenu: false,
          state: "initial",
        };
        setValue([...value, item]);
      }}
      onSelectItem={(item) => {
        setValue([...value, item]);
      }}
      onRemoveItem={(itemToRemove) => {
        if (itemToRemove.type === "local") {
          return;
        }
        setValue(value.filter((item) => item.id !== itemToRemove.id));
      }}
      onSort={setValue}
    />
  );
};

export const WithMenu: ComponentStory<typeof StyleSourceInput> = () => {
  const [value, setValue] = useState<Array<Item>>([
    {
      id: "0",
      label: "Apple",
      type: "token",
      hasMenu: true,
      state: "initial",
    },
  ]);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      editingIndex={editingIndex}
      onCreateItem={({ label }) => {
        const item: Item = {
          id: uuid(),
          label,
          type: "token",
          hasMenu: true,
          state: "initial",
        };
        setValue([...value, item]);
      }}
      onSelectItem={(item) => {
        setValue([...value, item]);
      }}
      onRemoveItem={(itemToRemove) => {
        if (itemToRemove.type === "local") {
          return;
        }
        setValue(value.filter((item) => item.id !== itemToRemove.id));
      }}
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
      onDisableItem={(itemToDisable) => {
        setValue(
          value.map((item) => {
            if (item.id === itemToDisable.id) {
              return { ...item, state: "disabled" };
            }
            return item;
          })
        );
      }}
      onEnableItem={(itemToEnable) => {
        setValue(
          value.map((item) => {
            if (item.id === itemToEnable.id) {
              return { ...item, state: "initial" };
            }
            return item;
          })
        );
      }}
      onDuplicateItem={(itemToDuplicate) => {
        const duplicatedItem = {
          ...itemToDuplicate,
          id: uuid(),
          label: itemToDuplicate.label + " Copy",
        };
        const nextValue = value.map((item) => {
          if (item.id === itemToDuplicate.id) {
            return duplicatedItem;
          }
          return item;
        });
        setValue(nextValue);
        setEditingIndex(nextValue.indexOf(duplicatedItem));
      }}
      onSort={setValue}
    />
  );
};
