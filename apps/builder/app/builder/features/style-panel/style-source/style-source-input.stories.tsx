import { nanoid } from "nanoid";
import type { ComponentStory } from "@storybook/react";
import { useState } from "react";
import { StyleSourceInput, type ItemSource } from ".";

export default {
  component: StyleSourceInput,
};

type Item = {
  id: string;
  label: string;
  source: ItemSource;
  disabled: boolean;
};

const localItem: Item = {
  id: nanoid(),
  label: "Local",
  source: "local",
  disabled: false,
};

const getItems = (): Array<Item> => [
  {
    id: nanoid(),
    label: "Token",
    source: "token",
    disabled: false,
  },
  {
    id: nanoid(),
    label: "Tag",
    source: "tag",
    disabled: false,
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
    disabled: false,
  };
  setValue([...value, item]);
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
      selectedItemId={localItem.id}
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
      disabled: false,
    },
  ]);
  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={getItems()}
      value={value}
      selectedItemId={value[0].id}
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
      disabled: true,
    },
  ]);
  const [selectedItemId, setSelectedItemId] = useState<undefined | Item["id"]>(
    localItem.id
  );
  const [editingItemId, setEditingItemId] = useState<undefined | Item["id"]>();

  return (
    <StyleSourceInput
      css={{ width: 300 }}
      items={getItems()}
      value={value}
      selectedItemId={selectedItemId}
      editingItemId={editingItemId}
      onSelectItem={(itemToSelect) => {
        setSelectedItemId(itemToSelect?.id);
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
              return { ...item, disabled: true };
            }
            return item;
          })
        );
      }}
      onEnableItem={(itemIdToEnable) => {
        setValue(
          value.map((item) => {
            if (item.id === itemIdToEnable) {
              return { ...item, disabled: false };
            }
            return item;
          })
        );
      }}
      onSort={setValue}
    />
  );
};
