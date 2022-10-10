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

export const ComboboxPopper = Popper;

export const ComboboxPopperContent = PopperContent;

export const ComboboxPopperAnchor = PopperAnchor;

const useFilter = <Item,>({
  items,
  itemToString,
}: {
  items: Array<Item>;
  itemToString: (item: Item | null) => string;
}) => {
  const [filteredItems, setFilteredItems] = useState<Array<Item>>(items);
  const cachedItems = useRef(items);

  useEffect(() => {
    cachedItems.current = items;
  }, [items]);

  const filter = useCallback(
    (search?: string) => {
      const foundItems: Array<Item> = matchSorter(items, search ?? "", {
        keys: [(item) => itemToString(item)],
      });
      setFilteredItems(foundItems);
    },
    [itemToString, items]
  );

  const resetFilter = useCallback(() => {
    setFilteredItems(cachedItems.current);
  }, []);

  return {
    filteredItems,
    filter,
    resetFilter,
  };
};

type useComboboxProps<Item> = {
  items: Array<Item>;
  itemToString: (item: Item | null) => string;
  value: Item | null; // This is to prevent: "downshift: A component has changed the uncontrolled prop "selectedItem" to be controlled."
  onItemSelect?: (value: Item | null) => void;
  onItemHighlight?: (value: Item | null) => void;
  stateReducer?: (
    state: DownshiftState<Item>,
    changes: UseComboboxStateChangeOptions<Item>
  ) => Partial<UseComboboxStateChangeOptions<Item>>;
};

export const useCombobox = <Item,>({
  items,
  value,
  itemToString,
  onItemSelect,
  onItemHighlight,
  stateReducer = (state, { changes }) => changes,
}: useComboboxProps<Item>) => {
  const { filteredItems, filter, resetFilter } = useFilter<Item>({
    items,
    itemToString,
  });

  const downshiftProps = useDownshiftCombobox({
    items: filteredItems,
    selectedItem: value, // Prevent downshift warning about switching controlled mode
    stateReducer,
    itemToString,
    onInputValueChange({ inputValue }) {
      filter(inputValue);
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
    if (isOpen === false) {
      resetFilter();
    }
  }, [isOpen, resetFilter]);

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
    items: filteredItems,
    getItemProps: enhancedGetItemProps,
  };
};

type ComboboxProps<Item> = useComboboxProps<Item> & {
  name: string;
  label?: string;
  placeholder?: string;
};

export const Combobox = <Item,>({
  items,
  value = null,
  name,
  placeholder,
  itemToString,
  onItemSelect,
  onItemHighlight,
}: ComboboxProps<Item>) => {
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
};

Combobox.displayName = "Combobox";
