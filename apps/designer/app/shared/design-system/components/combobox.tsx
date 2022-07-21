import { CheckIcon } from "@radix-ui/react-icons";
import { Popper, PopperAnchor, PopperContent } from "@radix-ui/react-popper";
import { useCombobox } from "downshift";
import { matchSorter } from "match-sorter";
import { ComponentProps, useState } from "react";
import { Box, Grid } from "..";
import { styled } from "../stitches.config";
import { IconButton } from "./icon-button";
import { itemCss } from "./menu";
import { panelStyles } from "./panel";
import { TextField } from "./text-field";

type BaseItem = { label: string; disabled?: boolean } | string;

type ComboboxProps<Item> = {
  name: string;
  items: Array<Item>;
  value?: Item;
  onItemSelect?: (value: Item) => void;
  onItemHighlight?: (value?: Item) => void;
  itemToString?: (item: Item) => string;
  disclosure?: (items: {
    inputProps: ComponentProps<typeof TextField>;
    toggleProps: ComponentProps<typeof IconButton>;
  }) => JSX.Element;
};

const Listbox = styled("ul", panelStyles, {
  padding: 0,
  margin: 0,
  overflow: "auto",
  // @todo need some non-hardcoded value
  maxHeight: 400,
  minWidth: 230,
});
const ListboxItem = styled("li", itemCss, {
  padding: 0,
  margin: 0,
});

export const Combobox = <Item extends BaseItem>({
  items,
  value,
  name,
  itemToString = (item) => item?.label ?? item ?? "",
  onItemSelect,
  onItemHighlight,
  disclosure = ({ inputProps }) => <TextField {...inputProps} />,
}: ComboboxProps<Item>) => {
  const [filteredItems, setFilteredItems] = useState(items);
  const {
    isOpen,
    getToggleButtonProps,
    // getLabelProps,
    getMenuProps,
    getInputProps,
    getComboboxProps,
    highlightedIndex,
    getItemProps,
    selectedItem,
  } = useCombobox({
    onInputValueChange({ inputValue }) {
      if (inputValue) {
        const filteredItems = matchSorter(items, inputValue, {
          ...(items[0]?.label ? { keys: ["label"] } : {}),
        });
        setFilteredItems(filteredItems);
      }
    },
    items: filteredItems,
    selectedItem: value,
    itemToString,
    onSelectedItemChange({ selectedItem }) {
      if (selectedItem) {
        onItemSelect?.(selectedItem);
      }
    },
    onHighlightedIndexChange({ highlightedIndex }) {
      if (highlightedIndex !== undefined) {
        onItemHighlight?.(items[highlightedIndex]);
      }
    },
  });

  const inputProps = getInputProps({ name });
  const toggleProps = getToggleButtonProps();
  const comboboxProps = getComboboxProps();
  const menuProps = getMenuProps();

  return (
    <Popper>
      <Box {...comboboxProps}>
        <PopperAnchor asChild>
          {disclosure({ inputProps, toggleProps })}
        </PopperAnchor>
        {isOpen && (
          <PopperContent align="start" sideOffset={5}>
            <Listbox {...menuProps}>
              {filteredItems.map((item, index) => {
                const itemProps = getItemProps({
                  item,
                  index,
                  key: index,
                  ...(item.disabled
                    ? { "data-disabled": true, disabled: true }
                    : {}),
                  ...(highlightedIndex === index ? { "data-found": true } : {}),
                });

                return (
                  // eslint-disable-next-line react/jsx-key
                  <ListboxItem {...itemProps}>
                    <Grid
                      align="center"
                      css={{ gridTemplateColumns: "20px 1fr" }}
                    >
                      {selectedItem === item && <CheckIcon />}
                      <Box css={{ gridColumn: 2 }}>{itemToString(item)}</Box>
                    </Grid>
                  </ListboxItem>
                );
              })}
            </Listbox>
          </PopperContent>
        )}
      </Box>
    </Popper>
  );
};
