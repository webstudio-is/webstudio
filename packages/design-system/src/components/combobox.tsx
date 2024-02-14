import {
  type ComponentProps,
  type ChangeEvent,
  type ReactNode,
  type Ref,
  type ForwardRefRenderFunction,
  useState,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Portal,
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@radix-ui/react-popover";
import {
  type UseComboboxState,
  type UseComboboxStateChangeOptions,
  type UseComboboxProps as UseDownshiftComboboxProps,
  type UseComboboxGetInputPropsOptions,
  useCombobox as useDownshiftCombobox,
  type UseComboboxGetItemPropsOptions,
} from "downshift";
import { matchSorter } from "match-sorter";
import { styled, theme } from "../stitches.config";
import {
  menuItemCss,
  menuCss,
  menuItemIndicatorCss,
  labelCss,
  separatorCss,
  MenuCheckedIcon,
} from "./menu";

const Listbox = styled(
  "ul",
  {
    margin: "unset", // reset <ul>
    overflow: "auto",
    maxHeight: theme.spacing[34],
    variants: {
      state: { closed: { display: "none" } },
      empty: { true: { display: "none" } },
    },
  },
  menuCss
);

const ListboxItem = styled("li", menuItemCss);

const Indicator = styled("span", menuItemIndicatorCss);

export const ComboboxLabel = styled("li", labelCss);

export const ComboboxSeparator = styled("li", separatorCss);

const ListboxItemBase: ForwardRefRenderFunction<
  HTMLLIElement,
  ComponentProps<typeof ListboxItem> & {
    disabled?: boolean;
    selected?: boolean;
    selectable?: boolean;
    highlighted?: boolean;
    icon?: ReactNode;
  }
> = (props, ref) => {
  const {
    disabled,
    selected,
    selectable = true,
    highlighted,
    children,
    icon = <MenuCheckedIcon />,
    ...rest
  } = props;
  return (
    <ListboxItem
      ref={ref}
      {...(disabled ? { "aria-disabled": true, disabled: true } : {})}
      {...(selected ? { "aria-current": true } : {})}
      {...(disabled ? {} : rest)}
      withIndicator={selectable}
    >
      {selectable && selected && <Indicator>{icon}</Indicator>}
      {children}
    </ListboxItem>
  );
};

export const ComboboxListbox = Listbox;

export const ComboboxListboxItem = forwardRef(ListboxItemBase);

export const Combobox = (props: ComponentProps<typeof Popover>) => {
  return <Popover {...props} modal />;
};

export const ComboboxContent = forwardRef(
  (props: ComponentProps<typeof PopoverContent>, ref: Ref<HTMLDivElement>) => (
    <Portal>
      <PopoverContent
        ref={ref}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
        {...props}
      />
    </Portal>
  )
);
ComboboxContent.displayName = "ComboboxContent";

export const ComboboxAnchor = PopoverAnchor;

type Match<Item> = (
  search: string,
  items: Item[],
  itemToString: (item: Item | null) => string
) => Item[];

const defaultMatch = <Item,>(
  search: string,
  items: Array<Item>,
  itemToString: (item: Item | null) => string
) =>
  matchSorter(items, search, {
    keys: [itemToString],
  });

const useFilter = <Item,>({
  items,
  itemToString,
  match = defaultMatch,
}: {
  items: Array<Item>;
  itemToString: (item: Item | null) => string;
  match?: Match<Item>;
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
  selectedItem: Item | undefined;
  onInputChange?: (value: string | undefined) => void;
  onItemSelect?: (value: Item) => void;
  onItemHighlight?: (value: Item | null) => void;
  stateReducer?: (
    state: UseComboboxState<Item>,
    changes: UseComboboxStateChangeOptions<Item>
  ) => Partial<UseComboboxStateChangeOptions<Item>>;
  match?: Match<Item>;
  defaultHighlightedIndex?: number;
};

export const comboboxStateChangeTypes = useDownshiftCombobox.stateChangeTypes;

export const useCombobox = <Item,>({
  items,
  value,
  selectedItem,
  itemToString,
  onInputChange,
  onItemSelect,
  onItemHighlight,
  stateReducer = (_state, { changes }) => changes,
  match,
  defaultHighlightedIndex = -1,
  ...rest
}: UseComboboxProps<Item>) => {
  const [isOpen, setIsOpen] = useState(false);

  const { filteredItems, filter, resetFilter } = useFilter<Item>({
    items,
    itemToString,
    match,
  });

  if (isOpen && filteredItems.length === 0) {
    setIsOpen(false);
  }

  const downshiftProps = useDownshiftCombobox({
    ...rest,
    items: filteredItems,
    defaultHighlightedIndex,
    selectedItem: selectedItem ?? null, // Prevent downshift warning about switching controlled mode
    isOpen,

    onIsOpenChange({ isOpen, inputValue }) {
      const foundItems =
        match !== undefined
          ? match(inputValue ?? "", items, itemToString)
          : defaultMatch(inputValue ?? "", items, itemToString);

      // Don't set isOpen to true if there are no items to show
      // because otherwise first ESC press will try to close it and only next ESC
      // will reset the value. When list is empty, first ESC should reset the value.
      const nextIsOpen = isOpen === true && foundItems.length !== 0;

      setIsOpen(nextIsOpen);
    },

    stateReducer,
    itemToString,
    inputValue: value ? itemToString(value) : undefined,
    onInputValueChange({ inputValue, type }) {
      if (type === comboboxStateChangeTypes.InputChange) {
        filter(inputValue);
      }
    },
    onSelectedItemChange({ selectedItem, type }) {
      // Don't call onItemSelect when ESC is pressed
      if (type === comboboxStateChangeTypes.InputKeyDownEscape) {
        // Reset intermediate value when ESC is pressed
        onInputChange?.(undefined);
        return;
      }

      if (selectedItem != null) {
        onItemSelect?.(selectedItem);
      }
    },
    onHighlightedIndexChange({ highlightedIndex }) {
      if (highlightedIndex !== undefined) {
        onItemHighlight?.(filteredItems[highlightedIndex] ?? null);
      }
    },
  });

  const { getItemProps, highlightedIndex, getMenuProps, getInputProps } =
    downshiftProps;

  useEffect(() => {
    if (isOpen === false) {
      resetFilter();
    }
  }, [isOpen, resetFilter]);

  const enhancedGetInputProps = useCallback(
    (options?: UseComboboxGetInputPropsOptions) => {
      const inputProps = getInputProps(options);
      return {
        ...inputProps,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          inputProps.onChange(event);
          // If we want controllable input we need to call onInputChange here
          // see https://github.com/downshift-js/downshift/issues/1108
          onInputChange?.(event.target.value);
        },
      };
    },
    [getInputProps, onInputChange]
  );

  const enhancedGetItemProps = useCallback(
    (options: UseComboboxGetItemPropsOptions<Item>) => {
      return {
        highlighted: highlightedIndex === options.index,
        ...getItemProps({
          // We need to either deep compare objects here or use itemToString to get primitive types
          selected:
            selectedItem !== undefined &&
            itemToString(selectedItem) === itemToString(options.item),
          key: options.id,
          ...options,
        }),
      };
    },
    [getItemProps, highlightedIndex, itemToString, selectedItem]
  );

  const enhancedGetMenuProps = useCallback(
    (options?: Parameters<typeof getMenuProps>[0]) => {
      return {
        ...getMenuProps(options, { suppressRefError: true }),
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
    getInputProps: enhancedGetInputProps,
    resetFilter,
  };
};
