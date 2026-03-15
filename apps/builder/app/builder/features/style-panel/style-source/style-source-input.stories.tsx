import { nanoid } from "nanoid";
import { useState } from "react";
import { Flex, StorySection, Text, theme } from "@webstudio-is/design-system";
import {
  type ItemSelector,
  type ItemSource,
  StyleSourceInput as StyleSourceInputComponent,
} from ".";

export default {
  title: "Style panel/Style Source Input",
  component: StyleSourceInputComponent,
};

type Item = {
  id: string;
  label: string;
  source: ItemSource;
  disabled: boolean;
  states: string[];
};

const localItem: Item = {
  id: nanoid(),
  label: "Local",
  source: "local",
  disabled: false,
  states: [],
};

const getItems = (): Array<Item> => [
  {
    id: nanoid(),
    label: "Token",
    source: "token",
    disabled: false,
    states: [],
  },
  {
    id: nanoid(),
    label: "Tag",
    source: "tag",
    disabled: false,
    states: [],
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
    states: [],
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

export const StyleSourceInput = () => {
  const [value, setValue] = useState<Array<Item>>([
    localItem,
    ...getItems(),
    {
      id: nanoid(),
      label: "Disabled",
      source: "token",
      disabled: true,
      states: [],
    },
  ]);
  const [selectedItemSelector, setSelectedItemSelector] = useState<
    undefined | ItemSelector
  >({ styleSourceId: localItem.id });
  const [editingItemId, setEditingItemId] = useState<undefined | Item["id"]>();

  const truncatedId = nanoid();
  const [truncated, setTruncated] = useState<Array<Item>>([
    {
      id: truncatedId,
      label:
        "Local Something Something Something Something Something Something Something",
      source: "token",
      disabled: false,
      states: [],
    },
  ]);

  return (
    <StorySection title="Style Source Input">
      <Flex
        direction="column"
        gap="5"
        css={{ maxWidth: theme.sizes.sidebarWidth }}
      >
        <Flex direction="column" gap="1">
          <Text variant="labels">Complete (with editing & disabling)</Text>
          <StyleSourceInputComponent
            inputRef={() => {}}
            css={{ width: theme.sizes.sidebarWidth }}
            items={getItems()}
            value={value}
            selectedItemSelector={selectedItemSelector}
            editingItemId={editingItemId}
            onSelectItem={setSelectedItemSelector}
            onEditItem={setEditingItemId}
            onCreateItem={(label) => {
              createItem(label, value, setValue);
            }}
            onSelectAutocompleteItem={(item) => {
              setValue([...value, item]);
            }}
            onDetachItem={(itemToRemove) => {
              removeItem(itemToRemove, value, setValue);
            }}
            onChangeItem={(changedItem) => {
              setValue(
                value.map((item) =>
                  item.id === changedItem.id ? changedItem : item
                )
              );
            }}
            onDisableItem={(id) => {
              setValue(
                value.map((item) =>
                  item.id === id ? { ...item, disabled: true } : item
                )
              );
            }}
            onEnableItem={(id) => {
              setValue(
                value.map((item) =>
                  item.id === id ? { ...item, disabled: false } : item
                )
              );
            }}
            onSort={setValue}
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">Truncated item</Text>
          <StyleSourceInputComponent
            inputRef={() => {}}
            css={{ width: theme.sizes.sidebarWidth }}
            items={getItems()}
            value={truncated}
            selectedItemSelector={{ styleSourceId: truncatedId }}
            onCreateItem={(label) => {
              createItem(label, truncated, setTruncated);
            }}
            onSelectAutocompleteItem={(item) => {
              setTruncated([...truncated, item]);
            }}
            onDetachItem={(id) => {
              removeItem(id, truncated, setTruncated);
            }}
            onSort={setTruncated}
          />
        </Flex>
      </Flex>
    </StorySection>
  );
};
