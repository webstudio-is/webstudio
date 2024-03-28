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
import { ScrollArea } from "./scroll-area";
import { Flex } from "./flex";
import { InputField, NestedInputButton } from "..";

const Listbox = styled(
  "ul",
  {
    display: "flex",
    flexDirection: "column",
    margin: "unset", // reset <ul>
    listStyle: "none",
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

export const ComboboxListbox = forwardRef<
  HTMLUListElement,
  ComponentProps<typeof Listbox>
>(({ children, ...props }, ref) => {
  return (
    <Listbox {...props} ref={ref}>
      <ScrollArea>
        <Flex direction="column" css={{ maxHeight: theme.spacing[34] }}>
          {children}
        </Flex>
      </ScrollArea>
    </Listbox>
  );
});

ComboboxListbox.displayName = "ComboboxListbox";

export const ComboboxListboxItem = forwardRef(ListboxItemBase);

export const ComboboxItemDescription = ({
  children,
  style,
  ...props
}: ComponentProps<typeof ListboxItem>) => {
  return (
    <>
      <ComboboxSeparator
        style={{
          display: `var(--ws-combobox-description-display-bottom, none)`,
          order: "var(--ws-combobox-description-order)",
        }}
      />
      <ListboxItem
        {...props}
        hint
        style={{ ...style, order: "var(--ws-combobox-description-order)" }}
      >
        {children}
      </ListboxItem>
      <ComboboxSeparator
        style={{
          display: `var(--ws-combobox-description-display-top, none)`,
          order: "var(--ws-combobox-description-order)",
        }}
      />
    </>
  );
};

export const ComboboxRoot = (props: ComponentProps<typeof Popover>) => {
  return <Popover {...props} modal />;
};

const StyledPopoverContent = styled(PopoverContent, {
  "&[data-side=top]": {
    "--ws-combobox-description-display-top": "block",
    "--ws-combobox-description-order": 0,
  },
  "&[data-side=bottom]": {
    "--ws-combobox-description-display-bottom": "block",
    "--ws-combobox-description-order": 2,
  },
});

export const ComboboxContent = forwardRef(
  (
    { style, ...props }: ComponentProps<typeof PopoverContent>,
    forwardRef: Ref<HTMLDivElement>
  ) => {
    return (
      <Portal>
        <StyledPopoverContent
          ref={forwardRef}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
          {...props}
        />
      </Portal>
    );
  }
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

const defaultItemToString = <Item,>(item: Item) =>
  typeof item === "string" ? item : "";

const useFilter = <Item,>({
  items,
  itemToString = defaultItemToString,
  match = defaultMatch,
}: {
  items: Array<Item>;
  itemToString?: (item: Item | null) => string;
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

type ItemToString<Item> = (item: Item | null) => string;

type UseComboboxProps<Item> = UseDownshiftComboboxProps<Item> & {
  items: Array<Item>;
  itemToString: ItemToString<Item>;
  getItemProps?: (
    options: UseComboboxGetItemPropsOptions<Item>
  ) => ComponentProps<typeof ComboboxListboxItem>;
  value: Item | null; // This is to prevent: "downshift: A component has changed the uncontrolled prop "selectedItem" to be controlled."
  selectedItem?: Item;
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
  getItemProps,
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
  const selectedItemRef = useRef<Item>();

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
        // We are using a ref because we need to call onItemSelect after the component is closed
        // otherwise popover will take focus from on click and you can't focus something else after onItemSelect imediately
        selectedItemRef.current = selectedItem;
      }
    },
    onHighlightedIndexChange({ highlightedIndex }) {
      if (highlightedIndex !== undefined) {
        onItemHighlight?.(filteredItems[highlightedIndex] ?? null);
      }
    },
  });

  useEffect(() => {
    if (isOpen === false) {
      resetFilter();
    }
  }, [isOpen, resetFilter]);

  useEffect(() => {
    // Selecting the item when the popover is closed.
    if (isOpen === false && selectedItemRef.current) {
      onItemSelect?.(selectedItemRef.current);
      selectedItemRef.current = undefined;
    }
  }, [isOpen, onItemSelect]);

  const enhancedGetInputProps = useCallback(
    (options?: UseComboboxGetInputPropsOptions) => {
      const inputProps = downshiftProps.getInputProps(options);
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
    [downshiftProps.getInputProps, onInputChange]
  );

  const enhancedGetItemProps = useCallback(
    (options: UseComboboxGetItemPropsOptions<Item>) => {
      const itemOptions = {
        // We need to either deep compare objects here or use itemToString to get primitive types
        selected:
          selectedItem !== undefined &&
          itemToString(selectedItem) === itemToString(options.item),
        key: options.id,
        ...options,
      };

      return {
        highlighted: downshiftProps.highlightedIndex === options.index,
        ...downshiftProps.getItemProps(itemOptions),
        ...getItemProps?.(itemOptions),
      };
    },
    [
      downshiftProps.getItemProps,
      downshiftProps.highlightedIndex,
      itemToString,
      selectedItem,
      getItemProps,
    ]
  );

  const enhancedGetMenuProps = useCallback(
    (options?: Parameters<typeof downshiftProps.getMenuProps>[0]) => {
      return {
        ...downshiftProps.getMenuProps(options, { suppressRefError: true }),
        state: isOpen ? "open" : "closed",
        empty: filteredItems.length === 0,
      };
    },
    [downshiftProps.getMenuProps, isOpen, filteredItems.length]
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

export const Combobox = <Item,>({
  autoFocus,
  ...props
}: UseComboboxProps<Item> & Omit<ComponentProps<"input">, "value">) => {
  const combobox = useCombobox<Item>(props);

  return (
    <ComboboxRoot open={combobox.isOpen}>
      <div {...combobox.getComboboxProps()}>
        <ComboboxAnchor>
          <InputField
            {...combobox.getInputProps()}
            autoFocus={autoFocus}
            suffix={<NestedInputButton {...combobox.getToggleButtonProps()} />}
          />
        </ComboboxAnchor>
        <ComboboxContent align="start" sideOffset={2}>
          <ComboboxListbox {...combobox.getMenuProps()}>
            {combobox.isOpen &&
              combobox.items.map((item, index) => {
                return (
                  <ComboboxListboxItem
                    key={index}
                    selectable={false}
                    {...combobox.getItemProps({ item, index })}
                  >
                    {props.itemToString(item)}
                  </ComboboxListboxItem>
                );
              })}
          </ComboboxListbox>
        </ComboboxContent>
      </div>
    </ComboboxRoot>
  );
};
