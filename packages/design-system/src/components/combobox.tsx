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
  type DownshiftState,
  type UseComboboxStateChangeOptions,
  type UseComboboxProps as UseDownshiftComboboxProps,
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
  p: "$spacing$3",
  margin: 0,
  overflow: "auto",
  // @todo need some non-hardcoded value
  maxHeight: 400,
  minWidth: 214,
  variants: {
    state: {
      open: {},
      closed: {
        display: "none",
      },
    },
    empty: {
      true: {
        display: "none",
      },
    },
  },
});

const ListboxItem = styled("li", itemCss, {
  padding: "0 $spacing$5",
  margin: 0,
  borderRadius: "$borderRadius$4",
});

const ListboxItemBase: ForwardRefRenderFunction<
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
      <Grid align="center" css={{ gridTemplateColumns: "$spacing$10 1fr" }}>
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

const defaultMatch = <Item,>(
  search: string,
  items: Array<Item>,
  itemToString: (item: Item | null) => string
) =>
  matchSorter(items, search, {
    keys: [(item) => itemToString(item)],
  });

const useFilter = <Item,>({
  items,
  itemToString,
  match = defaultMatch,
}: {
  items: Array<Item>;
  itemToString: (item: Item | null) => string;
  match?: typeof defaultMatch;
}) => {
  const [filteredItems, setFilteredItems] = useState<Array<Item>>(items);
  const cachedItems = useRef(items);

  const filter = useCallback(
    (search?: string) => {
      const foundItems = match(search ?? "", items, itemToString);
      setFilteredItems(foundItems);
    },
    [itemToString, items, match]
  );

  const resetFilter = useCallback(() => {
    setFilteredItems(cachedItems.current);
  }, []);

  useEffect(() => {
    cachedItems.current = items;
  }, [items]);

  return {
    filteredItems,
    filter,
    resetFilter,
  };
};

type UseComboboxProps<Item> = UseDownshiftComboboxProps<Item> & {
  items: Array<Item>;
  itemToString: (item: Item | null) => string;
  value: Item | null; // This is to prevent: "downshift: A component has changed the uncontrolled prop "selectedItem" to be controlled."
  onInputChange?: (value: string | undefined) => void;
  onItemSelect?: (value: Item | null) => void;
  onItemHighlight?: (value: Item | null) => void;
  stateReducer?: (
    state: DownshiftState<Item>,
    changes: UseComboboxStateChangeOptions<Item>
  ) => Partial<UseComboboxStateChangeOptions<Item>>;
  match?: typeof defaultMatch;
};

export const comboboxStateChangeTypes = useDownshiftCombobox.stateChangeTypes;

export const useCombobox = <Item,>({
  items,
  value,
  itemToString,
  onInputChange,
  onItemSelect,
  onItemHighlight,
  stateReducer = (state, { changes }) => changes,
  match,
  ...rest
}: UseComboboxProps<Item>) => {
  const { filteredItems, filter, resetFilter } = useFilter<Item>({
    items,
    itemToString,
    match,
  });

  const downshiftProps = useDownshiftCombobox({
    ...rest,
    items: filteredItems,
    defaultHighlightedIndex: -1,
    selectedItem: value, // Prevent downshift warning about switching controlled mode
    stateReducer,
    itemToString,
    onInputValueChange({ inputValue, type }) {
      if (type === comboboxStateChangeTypes.InputChange) {
        filter(inputValue);
        onInputChange?.(inputValue);
      }
    },
    onSelectedItemChange({ selectedItem }) {
      onItemSelect?.(selectedItem ?? null);
    },
    onHighlightedIndexChange({ highlightedIndex }) {
      if (highlightedIndex !== undefined) {
        onItemHighlight?.(filteredItems[highlightedIndex] ?? null);
      }
    },
  });

  const { isOpen, getItemProps, highlightedIndex, selectedItem, getMenuProps } =
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

  const enhancedGetMenuProps = useCallback(
    (options?: Parameters<typeof getMenuProps>[0]) => {
      return {
        ...getMenuProps(options),
        state: isOpen ? "open" : "closed",
        empty: filteredItems.length === 0,
      };
    },
    [getMenuProps, isOpen, filteredItems.length]
  );

  return {
    ...downshiftProps,
    items: filteredItems,
    getItemProps: enhancedGetItemProps,
    getMenuProps: enhancedGetMenuProps,
    resetFilter,
  };
};

type ComboboxProps<Item> = UseComboboxProps<Item> & {
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
