import { nanoid } from "nanoid";
import type { ComponentStory } from "@storybook/react";
import { useState } from "react";
import { StyleSourceInput, type ItemState, type ItemSource } from ".";

export default {
  component: StyleSourceInput,
};

type Item = {
  id: string;
  label: string;
  source: ItemSource;
  isEditable: boolean;
  state: ItemState;
};

const localItem: Item = {
  id: nanoid(),
  label: "Local",
  source: "local",
  isEditable: false,
  state: "selected",
};

const getItems = (): Array<Item> => [
  {
    id: nanoid(),
    label: "Token",
    source: "token",
    isEditable: true,
    state: "unselected",
  },
  {
    id: nanoid(),
    label: "Tag",
    source: "tag",
    isEditable: true,
    state: "unselected",
  },
  {
    id: nanoid(),
    label: "State",
    source: "state",
    isEditable: true,
    state: "unselected",
  },
];

const createItem = (
  label: string,
  value: Array<Item>,
  setValue: (value: Array<Item>) => void
) => {
  const item: Item = {
    id: nanoid(),
    label,
    source: "token",
    isEditable: true,
    state: "selected",
  };
  const nextValue = value.map((item) => {
    if (item.state === "selected") {
      return {
        ...item,
        state: "unselected" as const,
      };
    }
    return item;
  });
  setValue([...nextValue, item]);
};

const removeItem = (
  itemIdToRemove: Item["id"],
  value: Array<Item>,
  setValue: (value: Array<Item>) => void
) => {
  setValue(value.filter((item) => item.id !== itemIdToRemove));
};

export const Basic: ComponentStory<typeof StyleSourceInput> = () => {
  const [value, setValue] = useState([localItem, ...getItems()]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={getItems()}
      value={value}
      onCreateItem={(label) => {
        createItem(label, value, setValue);
      }}
      onSelectAutocompleteItem={(item) => {
        setValue([...value, item]);
      }}
      onRemoveItem={(itemId) => {
        removeItem(itemId, value, setValue);
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
      id: nanoid(),
      label:
        "Local Something Something Something Something Something Something Something Something Something Something Something",
      source: "local",
      isEditable: true,
      state: "selected",
    },
  ]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={getItems()}
      value={value}
      onCreateItem={(label) => {
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
    localItem,
    ...getItems(),
    {
      id: nanoid(),
      label: "Disabled",
      source: "token",

      isEditable: true,
      state: "disabled",
    },
  ]);
  const [editingItemId, setEditingItemId] = useState<undefined | Item["id"]>();

  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={getItems()}
      value={value}
      editingItemId={editingItemId}
      onSelectItem={(itemToSelect) => {
        setValue(
          value.map((item) => {
            if (item.id === itemToSelect?.id) {
              return { ...item, state: "selected" };
            }
            if (item.state === "selected") {
              return { ...item, state: "unselected" };
            }
            return item;
          })
        );
      }}
      onEditItem={setEditingItemId}
      onCreateItem={(label) => {
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
      onDisableItem={(itemIdToDisable) => {
        setValue(
          value.map((item) => {
            if (item.id === itemIdToDisable) {
              return { ...item, state: "disabled" };
            }
            return item;
          })
        );
      }}
      onEnableItem={(itemIdToEnable) => {
        setValue(
          value.map((item) => {
            if (item.id === itemIdToEnable) {
              return { ...item, state: "unselected" };
            }
            return item;
          })
        );
      }}
      onSort={setValue}
    />
  );
};
