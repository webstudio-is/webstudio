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
import { Box } from "./box";
import { Flex } from "./flex";
import { NestedInputButton } from "./nested-input-button";
import { InputField } from "./input-field";

export const ComboboxListbox = styled(
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

export const ComboboxScrollArea = forwardRef(
  (
    { children, ...props }: ComponentProps<typeof ScrollArea>,
    forwardRef: Ref<HTMLDivElement>
  ) => {
    return (
      <ScrollArea css={{ order: 1 }} {...props}>
        <Flex
          ref={forwardRef}
          direction="column"
          css={{ maxHeight: theme.spacing[34] }}
        >
          {children}
        </Flex>
      </ScrollArea>
    );
  }
);
ComboboxScrollArea.displayName = "ComboboxScrollArea";

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
      {...(disabled ? { "aria-disabled": true, disabled: true } : {})}
      {...(selected ? { "aria-current": true } : {})}
      {...(disabled ? {} : rest)}
      withIndicator={selectable}
      text={rest.text ?? "sentence"}
      ref={ref}
    >
      {selectable && selected && <Indicator>{icon}</Indicator>}
      {children}
    </ListboxItem>
  );
};

export const ComboboxListboxItem = forwardRef(ListboxItemBase);

export const ComboboxItemDescription = ({
  children,
  descriptions,
}: {
  children: ReactNode;
  descriptions: ReactNode[];
}) => {
  return (
    <>
      <ComboboxSeparator
        style={{
          display: `var(--ws-combobox-description-display-bottom, none)`,
          order: "var(--ws-combobox-description-order)",
        }}
      />
      <ListboxItem
        css={{
          display: "grid",
        }}
        hint
        style={{
          order: "var(--ws-combobox-description-order)",
        }}
      >
        {descriptions.map((description, index) => (
          <Box
            css={{
              gridColumn: "1",
              gridRow: "1",
              visibility: "hidden",
            }}
            key={index}
          >
            {description}
          </Box>
        ))}
        <Box
          css={{
            gridColumn: "1",
            gridRow: "1",
          }}
        >
          {children}
        </Box>
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
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
          {...props}
          ref={forwardRef}
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
    baseSort: (left, right) =>
      left.rankedValue.localeCompare(right.rankedValue, undefined, {
        numeric: true,
      }),
  });

type ItemToString<Item> = (item: Item | null) => string;

type UseComboboxProps<Item> = Omit<UseDownshiftComboboxProps<Item>, "items"> & {
  getItems: () => Array<Item>;
  itemToString: ItemToString<Item>;
  getDescription?: (item: Item | null) => ReactNode;
  getItemProps?: (
    options: UseComboboxGetItemPropsOptions<Item>
  ) => ComponentProps<typeof ComboboxListboxItem>;
  value: Item | null; // This is to prevent: "downshift: A component has changed the uncontrolled prop "selectedItem" to be controlled."
  selectedItem?: Item;
  onChange?: (value: string | undefined) => void;
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

const isNumericString = (input: string) =>
  String(input).trim().length !== 0 && Number.isNaN(Number(input)) === false;

export const useCombobox = <Item,>({
  getItems,
  value,
  selectedItem,
  getItemProps,
  itemToString,
  onChange,
  onItemSelect,
  onItemHighlight,
  stateReducer = (_state, { changes }) => changes,
  match = defaultMatch,
  defaultHighlightedIndex = -1,
  ...rest
}: UseComboboxProps<Item>) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedItemRef = useRef<undefined | Item>(undefined);
  const itemsCache = useRef<Item[]>([]);
  const [matchedItems, setMatchedItems] = useState<Item[]>([]);

  const downshiftProps = useDownshiftCombobox({
    ...rest,
    items: matchedItems,
    defaultHighlightedIndex,
    selectedItem: selectedItem ?? null, // Prevent downshift warning about switching controlled mode
    isOpen,

    onIsOpenChange(state) {
      const { type, isOpen, inputValue } = state;

      // Tab from the input with menu opened should reset the input value if nothing is selected
      if (type === comboboxStateChangeTypes.InputBlur) {
        onChange?.(undefined);
        // If the input is blurred, we want to close the menu and reset the value to the selected item.
        setIsOpen(false);
        setMatchedItems([]);
        return;
      }

      // Don't open the combobox if the input is a number and the user is using the arrow keys.
      // This prevents the combobox from opening when the user is trying to increment or decrement a number.
      if (
        (type === comboboxStateChangeTypes.InputKeyDownArrowDown ||
          type === comboboxStateChangeTypes.InputKeyDownArrowUp) &&
        inputValue !== undefined &&
        isNumericString(inputValue)
      ) {
        return;
      }

      // If the menu is opened using the up or down arrows, we want to display all items without applying any filters.
      if (
        isOpen &&
        (type === comboboxStateChangeTypes.InputKeyDownArrowDown ||
          type === comboboxStateChangeTypes.InputKeyDownArrowUp)
      ) {
        const matchedItems = getItems();
        setMatchedItems(matchedItems);
        setIsOpen(matchedItems.length > 0);

        return;
      }

      if (isOpen) {
        itemsCache.current = getItems();
        // Don't set isOpen to true if there are no items to show
        // because otherwise first ESC press will try to close it and only next ESC
        // will reset the value. When list is empty, first ESC should reset the value.
        setMatchedItems(itemsCache.current);
        setIsOpen(itemsCache.current.length > 0);
      } else {
        setMatchedItems([]);
        setIsOpen(false);
      }
    },

    stateReducer,
    itemToString,
    inputValue: value ? itemToString(value) : "",
    onInputValueChange(state) {
      const { inputValue, type } = state;
      if (type === comboboxStateChangeTypes.InputChange) {
        const matchedItems = match(
          inputValue ?? "",
          itemsCache.current,
          itemToString
        );
        setIsOpen(matchedItems.length > 0);
        setMatchedItems(matchedItems);
      }
    },
    onSelectedItemChange({ selectedItem, type }) {
      // Don't call onItemSelect when ESC is pressed
      if (type === comboboxStateChangeTypes.InputKeyDownEscape) {
        // Reset intermediate value when ESC is pressed
        onChange?.(undefined);
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
        onItemHighlight?.(matchedItems[highlightedIndex] ?? null);
      }
    },
  });

  useEffect(() => {
    // Selecting the item when the popover is closed.
    if (isOpen === false && selectedItemRef.current) {
      onItemSelect?.(selectedItemRef.current);
      selectedItemRef.current = undefined;
    }
  }, [isOpen, onItemSelect]);

  const downshiftGetInputProps = downshiftProps.getInputProps;
  const enhancedGetInputProps = useCallback(
    (options?: UseComboboxGetInputPropsOptions) => {
      const inputProps = downshiftGetInputProps(options);
      return {
        ...inputProps,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          inputProps.onChange(event);
          // If we want controllable input we need to call onChange here
          // see https://github.com/downshift-js/downshift/issues/1108
          onChange?.(event.target.value);
        },
      };
    },
    [downshiftGetInputProps, onChange]
  );

  const downshiftHighlightedIndex = downshiftProps.highlightedIndex;
  const downshiftGetItemProps = downshiftProps.getItemProps;
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
        highlighted: downshiftHighlightedIndex === options.index,
        ...downshiftGetItemProps(itemOptions),
        ...getItemProps?.(itemOptions),
      };
    },
    [
      downshiftHighlightedIndex,
      downshiftGetItemProps,
      itemToString,
      selectedItem,
      getItemProps,
    ]
  );

  const downshiftGetMenuProps = downshiftProps.getMenuProps;
  const enhancedGetMenuProps = useCallback(
    (options?: Parameters<typeof downshiftGetMenuProps>[0]) => {
      return {
        ...downshiftGetMenuProps(options, { suppressRefError: true }),
        state: isOpen ? "open" : "closed",
        empty: matchedItems.length === 0,
      };
    },
    [downshiftGetMenuProps, isOpen, matchedItems.length]
  );

  return {
    ...downshiftProps,
    items: matchedItems,
    getItemProps: enhancedGetItemProps,
    getMenuProps: enhancedGetMenuProps,
    getInputProps: enhancedGetInputProps,
  };
};

type ComboboxProps<Item> = UseComboboxProps<Item> &
  Pick<
    ComponentProps<typeof InputField>,
    "autoFocus" | "placeholder" | "color" | "suffix" | "onBlur"
  >;

export const Combobox = <Item,>({
  autoFocus,
  getDescription,
  placeholder,
  color,
  suffix,
  onBlur,
  ...props
}: ComboboxProps<Item>) => {
  const combobox = useCombobox<Item>(props);

  const descriptionItem =
    combobox.highlightedIndex === -1
      ? combobox.selectedItem
      : combobox.items[combobox.highlightedIndex];

  const description = getDescription?.(descriptionItem);
  const descriptions = combobox.items.map((item) => getDescription?.(item));

  return (
    <ComboboxRoot open={combobox.isOpen}>
      <Box {...combobox.getComboboxProps()}>
        <ComboboxAnchor>
          <InputField
            {...combobox.getInputProps()}
            placeholder={placeholder}
            autoFocus={autoFocus}
            onBlur={onBlur}
            color={color}
            suffix={
              suffix ?? (
                <NestedInputButton {...combobox.getToggleButtonProps()} />
              )
            }
          />
        </ComboboxAnchor>
        <ComboboxContent>
          <ComboboxListbox {...combobox.getMenuProps()}>
            <ComboboxScrollArea>
              {combobox.isOpen &&
                combobox.items.map((item, index) => {
                  return (
                    <ComboboxListboxItem
                      selectable={false}
                      {...combobox.getItemProps({ item, index })}
                      key={index}
                    >
                      {props.itemToString(item)}
                    </ComboboxListboxItem>
                  );
                })}
            </ComboboxScrollArea>
            {description && (
              <ComboboxItemDescription descriptions={descriptions}>
                {description}
              </ComboboxItemDescription>
            )}
          </ComboboxListbox>
        </ComboboxContent>
      </Box>
    </ComboboxRoot>
  );
};
