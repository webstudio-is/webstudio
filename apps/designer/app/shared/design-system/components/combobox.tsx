import {
  useState,
  forwardRef,
  type ElementRef,
  type ComponentProps,
} from "react";
import { CheckIcon, ChevronDownIcon } from "~/shared/icons";
import { Popper, PopperContent, PopperAnchor } from "@radix-ui/react-popper";
import { useCombobox } from "downshift";
import { matchSorter } from "match-sorter";
import { styled, type CSS } from "../stitches.config";
import { IconButton } from "./icon-button";
import { itemCss } from "./menu";
import { panelStyles } from "./panel";
import { TextField } from "./text-field";
import { Box } from "./box";
import { Flex } from "./flex";
import { Grid } from "./grid";

type BaseItem = { label: string; disabled?: boolean } | string;

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

type ComboboxTextFieldProps = {
  inputProps: ComponentProps<typeof TextField>;
  toggleProps: ComponentProps<typeof IconButton>;
};

export const ComboboxTextField = forwardRef<
  ElementRef<typeof Flex>,
  ComboboxTextFieldProps
>(({ inputProps, toggleProps }, ref) => {
  return (
    <Flex ref={ref}>
      <TextField {...inputProps} />
      <IconButton variant="ghost" size="1" {...toggleProps}>
        <ChevronDownIcon />
      </IconButton>
    </Flex>
  );
});

type ComboboxProps<Item> = {
  name: string;
  items: Array<Item>;
  value?: Item;
  onItemSelect?: (value: Item) => void;
  onItemHighlight?: (value?: Item) => void;
  itemToString?: (item: Item | null) => string;
  disclosure?: (props: ComponentProps<typeof ComboboxTextField>) => JSX.Element;
  // @todo should we spread those props flat?
  popperProps?: ComponentProps<typeof PopperContent>;
  listCss?: CSS;
};

export const Combobox = <Item extends BaseItem>({
  items,
  value,
  name,
  itemToString = (item) =>
    item !== null && "label" in item ? item.label : item ?? "",
  onItemSelect,
  onItemHighlight,
  disclosure = ({ inputProps, toggleProps }) => (
    <ComboboxTextField inputProps={inputProps} toggleProps={toggleProps} />
  ),
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
          ...("label" in items[0] ? { keys: ["label"] } : {}),
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

  const inputProps: Record<string, unknown> = getInputProps({ name });
  const toggleProps: Record<string, unknown> = getToggleButtonProps();
  const comboboxProps: Record<string, unknown> = getComboboxProps();
  const menuProps: Record<string, unknown> = getMenuProps();

  return (
    <Popper>
      <Box {...comboboxProps}>
        <PopperAnchor asChild>
          {disclosure({ inputProps, toggleProps })}
        </PopperAnchor>
        <Listbox {...menuProps}>
          {isOpen &&
            filteredItems.map((item, index) => {
              const itemProps: Record<string, unknown> = getItemProps({
                item,
                index,
                key: index,
                ...("disabled" in item && item.disabled
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
      </Box>
    </Popper>
  );
};
