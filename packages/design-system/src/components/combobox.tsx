import {
  useState,
  forwardRef,
  useCallback,
  type ComponentProps,
  type ForwardRefRenderFunction,
  useEffect,
  useRef,
} from "react";
import { CheckIcon, ChevronDownIcon } from "@webstudio-is/icons";
import { Popper, PopperContent, PopperAnchor } from "@radix-ui/react-popper";
import {
  DownshiftState,
  UseComboboxStateChangeOptions,
  useCombobox as useDownshiftCombobox,
} from "downshift";
import { matchSorter } from "match-sorter";
import { styled } from "../stitches.config";
import { IconButton } from "./icon-button";
import { itemCss } from "./menu";
import { panelStyles } from "./panel";
import { TextField } from "./text-field";
import { Box } from "./box";
import { Grid } from "./grid";

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

export const ListboxItemBase: ForwardRefRenderFunction<
  HTMLLIElement,
  ComponentProps<typeof ListboxItem> & {
    disabled?: boolean;
    selected?: boolean;
    highlighted?: boolean;
  }
> = (props, ref) => {
  const { disabled, selected, highlighted, children, ...rest } = props;
  return (
    <ListboxItem
      ref={ref}
      {...(disabled ? { "aria-disabled": true, disabled: true } : {})}
      {...(selected ? { "aria-current": true } : {})}
      {...rest}
    >
      <Grid align="center" css={{ gridTemplateColumns: "$4 1fr" }}>
        {selected && <CheckIcon />}
        <Box css={{ gridColumn: 2 }}>{children}</Box>
      </Grid>
    </ListboxItem>
  );
};

export const ComboboxListbox = Listbox;

export const ComboboxListboxItem = forwardRef(ListboxItemBase);

export const ComboboxPrimitive = Popper;

export const ComboboxContent = PopperContent;

export const ComboboxAnchor = PopperAnchor;

type useComboboxProps<Item> = {
  items: ReadonlyArray<Item>;
  itemToString: (item: Item | null) => string;
  value: Item | null; // This is to prevent: "downshift: A component has changed the uncontrolled prop "selectedItem" to be controlled."
  onItemSelect?: (value: Item | null) => void;
  onItemHighlight?: (value: Item | null) => void;
  stateReducer?: (
    state: DownshiftState<Item>,
    changes: UseComboboxStateChangeOptions<Item>
  ) => Partial<UseComboboxStateChangeOptions<Item>>;
};

// eslint-disable-next-line func-style
export function useCombobox<Item>({
  items,
  value,
  itemToString,
  onItemSelect,
  onItemHighlight,
  stateReducer = (state, { changes }) => changes,
}: useComboboxProps<Item>) {
  const [filteredItems, setFilteredItems] = useState(items);
  const cachedItems = useRef(items);

  const downshiftProps = useDownshiftCombobox({
    items: filteredItems as Item[],
    selectedItem: value, // Avoid downshift warning about switching controlled mode
    stateReducer,
    itemToString,
    onInputValueChange({ inputValue }) {
      const foundItems: ReadonlyArray<Item> = matchSorter(
        items,
        inputValue ?? "",
        {
          keys: [(item) => itemToString(item)],
        }
      );
      setFilteredItems(foundItems);
    },
    onSelectedItemChange({ selectedItem }) {
      onItemSelect?.(selectedItem ?? null);
    },
    onHighlightedIndexChange({ highlightedIndex }) {
      if (highlightedIndex !== undefined) {
        onItemHighlight?.(items[highlightedIndex]);
      }
    },
  });

  const { isOpen, getItemProps, highlightedIndex, selectedItem } =
    downshiftProps;

  useEffect(() => {
    cachedItems.current = items;
  }, [items]);

  useEffect(() => {
    if (!isOpen) {
      setFilteredItems(cachedItems.current);
    }
  }, [isOpen]);

  const enhancedGetItemProps = useCallback(
    (options) => {
      return getItemProps({
        highlighted: highlightedIndex === options.index,
        // We need to either deep compare objects here or use itemToString to get primitive types
        selected: itemToString(selectedItem) === itemToString(options.item),
        key: options.id,
        ...options,
      });
    },
    [getItemProps, highlightedIndex, itemToString, selectedItem]
  );

  return {
    ...downshiftProps,
    items: filteredItems, // Return filtered items
    getItemProps: enhancedGetItemProps,
  };
}

type ComboboxProps<Item> = useComboboxProps<Item> & {
  name: string;
  label?: string;
  placeholder?: string;
};

// eslint-disable-next-line func-style
export function Combobox<Item>({
  items,
  value = null,
  name,
  placeholder,
  itemToString,
  onItemSelect,
  onItemHighlight,
}: ComboboxProps<Item>) {
  const {
    items: foundItems,
    getInputProps,
    getComboboxProps,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    isOpen,
  } = useCombobox({
    items,
    value,
    itemToString,
    onItemSelect,
    onItemHighlight,
  });
  return (
    <Popper>
      <Box {...getComboboxProps()}>
        <PopperAnchor>
          <TextField
            {...getInputProps({
              name,
              placeholder,
            })}
            suffix={
              <IconButton {...getToggleButtonProps()}>
                <ChevronDownIcon />
              </IconButton>
            }
          />
        </PopperAnchor>
        <PopperContent>
          <Listbox {...getMenuProps()}>
            {isOpen &&
              foundItems.map((item, index) => {
                return (
                  // eslint-disable-next-line react/jsx-key
                  <ComboboxListboxItem
                    key={index}
                    {...getItemProps({ item, index })}
                  >
                    {itemToString(item)}
                  </ComboboxListboxItem>
                );
              })}
          </Listbox>
        </PopperContent>
      </Box>
    </Popper>
  );
}

Combobox.displayName = "Combobox";
