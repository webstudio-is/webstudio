import { type ComponentProps, useState } from "react";
import { CheckIcon } from "@radix-ui/react-icons";
import { Popper, PopperContent, PopperAnchor } from "@radix-ui/react-popper";
import { useCombobox } from "downshift";
import { matchSorter } from "match-sorter";
import { styled, type CSS } from "../stitches.config";
import { itemCss } from "./menu";
import { panelStyles } from "./panel";
import { IconButton } from "./icon-button";
import { TextField } from "./text-field";
import { Box } from "./box";

type BaseItem = { label: string; disabled?: boolean };

const getTextValue = <Item extends BaseItem>(item?: Item) => {
  return item ? item.label : "";
};

type ComboboxProps<Item> = {
  name: string;
  items: Array<Item>;
  value?: Item;
  onItemSelect?: (value: Item) => void;
  onItemHighlight?: (value?: Item) => void;
  disclosure?: (items: {
    inputProps: ComponentProps<typeof TextField>;
    toggleProps: ComponentProps<typeof IconButton>;
  }) => JSX.Element;
  // @todo should we spread those props flat?
  popperProps?: ComponentProps<typeof PopperContent>;
  listCss: CSS;
};

const Listbox = styled("ul", panelStyles, {
  padding: 0,
  margin: 0,
  overflow: "auto",
  // @todo need some non-hardcoded value
  maxHeight: 400,
});
const ListboxItem = styled("li", itemCss);

export const Combobox = <Item extends BaseItem>({
  items,
  value,
  name,
  popperProps,
  listCss,
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
          keys: ["label", "value"],
        });
        setFilteredItems(filteredItems);
      }
    },
    items: filteredItems,
    selectedItem: value,
    itemToString(item) {
      return item ? item.label : "";
    },
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
          <PopperContent {...popperProps}>
            <Listbox {...menuProps} css={listCss}>
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
                  <ListboxItem {...itemProps}>
                    {selectedItem === item && <CheckIcon />}
                    {getTextValue<Item>(item)}
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
