import { v4 as uuid } from "uuid";
import type { ComponentStory } from "@storybook/react";
import { useState } from "react";
import { StyleSourceInput, type ItemState, type ItemSource } from "./";

export default {
  component: StyleSourceInput,
};

type Item = {
  id: string;
  label: string;
  source: ItemSource;
  hasMenu: boolean;
  state: ItemState;
};

const items: Array<Item> = [
  {
    id: uuid(),
    label: "Local",
    source: "local",
    hasMenu: false,
    state: "unselected",
  },
  {
    id: uuid(),
    label: "Apple",
    source: "token",
    hasMenu: false,
    state: "unselected",
  },
  {
    id: uuid(),
    label: "Banana",
    source: "tag",
    hasMenu: false,
    state: "unselected",
  },
  {
    id: uuid(),
    label: "Orange",
    source: "state",
    hasMenu: false,
    state: "unselected",
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
    hasMenu: true,
    state: "unselected",
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
  const [value, setValue] = useState(items);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={items}
      value={value}
      onCreateItem={({ label }) => {
        createItem(label, value, setValue);
      }}
      onSelectAutocompleteItem={(item) => {
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
      id: uuid(),
      label:
        "Local Something Something Something Something Something Something Something Something Something Something Something",
      source: "local",
      hasMenu: false,
      state: "unselected",
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
      onSelectAutocompleteItem={(item) => {
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
      id: uuid(),
      label: "Grape",
      source: "token",
      hasMenu: true,
      state: "selected",
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
      onSelectItem={setCurrentItemId}
      onChangeEditing={setEditingItemId}
      onCreateItem={({ label }) => {
        createItem(label, value, setValue);
      }}
      onSelectAutocompleteItem={(item) => {
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
              return { ...item, state: "unselected" };
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
