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
  source: "token" | "local";
  hasMenu: boolean;
  state: ItemState;
};

const localItem: Item = {
  id: "0",
  label: "Local",
  source: "local",
  hasMenu: false,
  state: "initial",
};

const items: Array<Item> = [
  {
    id: "1",
    label: "Apple",
    source: "token",
    hasMenu: false,
    state: "initial",
  },
  {
    id: "2",
    label: "Banana",
    source: "token",
    hasMenu: false,
    state: "initial",
  },
  {
    id: "3",
    label: "Orange",
    source: "token",
    hasMenu: false,
    state: "initial",
  },
];

const createItem = (
  label: string,
  value: Array<Item>,
  setValue: (value: Array<Item>) => void
) => {
  const item: Item = {
    id: uuid(),
    label,
    source: "token",
    hasMenu: false,
    state: "initial",
  };
  setValue([...value, item]);
};

const removeItem = (
  itemToRemove: Item,
  value: Array<Item>,
  setValue: (value: Array<Item>) => void
) => {
  if (itemToRemove.source === "local") {
    return;
  }
  setValue(value.filter((item) => item.id !== itemToRemove.id));
};

export const Basic: ComponentStory<typeof StyleSourceInput> = () => {
  const [value, setValue] = useState([localItem, ...items]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreateItem={({ label }) => {
        createItem(label, value, setValue);
      }}
      onSelectItem={(item) => {
        setValue([...value, item]);
      }}
      onRemoveItem={(itemToRemove) => {
        removeItem(itemToRemove, value, setValue);
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
      source: "local",
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
        createItem(label, value, setValue);
      }}
      onSelectItem={(item) => {
        setValue([...value, item]);
      }}
      onRemoveItem={(itemToRemove) => {
        removeItem(itemToRemove, value, setValue);
      }}
      onSort={setValue}
    />
  );
};

export const Complete: ComponentStory<typeof StyleSourceInput> = () => {
  const [value, setValue] = useState<Array<Item>>([
    ...items,
    {
      id: "0",
      label: "Grape",
      source: "token",
      hasMenu: true,
      state: "initial",
    },
  ]);
  const [editingItemId, setEditingItemId] = useState<string>();
  const [currentItemId, setCurrentItemId] = useState<string | undefined>(
    value.at(-1)?.id
  );
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      editingItemId={editingItemId}
      currentItemId={currentItemId}
      onChangeCurrent={setCurrentItemId}
      onChangeEditing={setEditingItemId}
      onCreateItem={({ label }) => {
        createItem(label, value, setValue);
      }}
      onSelectItem={(item) => {
        setValue([...value, item]);
      }}
      onRemoveItem={(itemToRemove) => {
        removeItem(itemToRemove, value, setValue);
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
        setEditingItemId(duplicatedItem.id);
      }}
      onSort={setValue}
    />
  );
};
