import {
  useState,
  forwardRef,
  useEffect,
  type ComponentProps,
  type ForwardRefRenderFunction,
  ForwardedRef,
} from "react";
import { CheckIcon, ChevronDownIcon } from "@webstudio-is/icons";
import { Popper, PopperContent, PopperAnchor } from "@radix-ui/react-popper";
import { useCombobox, type UseComboboxGetItemPropsOptions } from "downshift";
import { matchSorter } from "match-sorter";
import { CSS, styled } from "../stitches.config";
import { IconButton } from "./icon-button";
import { itemCss } from "./menu";
import { panelStyles } from "./panel";
import { TextField } from "./text-field";
import { Box } from "./box";
import { Grid } from "./grid";

type Label = string;

export type ComboboxBaseItem = { label: Label; disabled?: boolean } | Label;

type ComboboxTextFieldProps<Item> = {
  inputProps: ComponentProps<typeof TextField>;
  toggleProps: ComponentProps<typeof IconButton>;
  highlightedItem?: Item;
};

const ComboboxTextFieldBase: ForwardRefRenderFunction<
  HTMLDivElement,
  ComboboxTextFieldProps<ComboboxBaseItem>
> = ({ inputProps, toggleProps }, ref) => {
  return (
    <Box ref={ref} css={{ position: "relative" }}>
      <TextField css={{ paddingRight: "$4" }} {...inputProps} />
      <IconButton
        {...toggleProps}
        css={{
          position: "absolute",
          transform: "translateX(-100%)",
          width: "$4",
        }}
      >
        <ChevronDownIcon />
      </IconButton>
    </Box>
  );
};

export const ComboboxTextField = forwardRef(ComboboxTextFieldBase);

ComboboxTextField.displayName = "ComboboxTextField";

const Listbox = styled("ul", panelStyles, {
  padding: 0,
  margin: 0,
  overflow: "auto",
  // @todo need some non-hardcoded value
  maxHeight: 400,
  minWidth: 230,
});

type ListboxItemProps<Item> = {
  selected: boolean;
  item: Item;
  itemToString: (item: Item | null) => string;
  itemProps: ComponentProps<"li">;
};

const ListboxItemBase = <Item extends ComboboxBaseItem>(
  { selected, item, itemToString, itemProps }: ListboxItemProps<Item>,
  ref: ForwardedRef<HTMLLIElement>
) => {
  return (
    <li
      className={itemCss({
        padding: 0,
        margin: 0,
      })}
      {...itemProps}
      ref={ref}
    >
      <Grid align="center" css={{ gridTemplateColumns: "$4 1fr" }}>
        {selected === true ? <CheckIcon /> : null}
        <Box css={{ gridColumn: 2 }}>{itemToString(item)}</Box>
      </Grid>
    </li>
  );
};

export const ComboboxListboxItem = forwardRef(ListboxItemBase);

ComboboxListboxItem.displayName = "ComboboxListboxItem";

type ListProps<Item> = {
  containerProps: ComponentProps<typeof Listbox>;
  items: Array<Item>;
  getItemProps: (
    options: UseComboboxGetItemPropsOptions<Item>
  ) => ComponentProps<typeof ComboboxListboxItem>;
  highlightedIndex: number;
  selectedItem: Item | null;
  itemToString: (item: Item | null) => string;
  renderItem: (props: ListboxItemProps<Item>) => JSX.Element;
};

export const ComboboxList = <Item extends ComboboxBaseItem>({
  containerProps,
  items,
  getItemProps,
  highlightedIndex,
  selectedItem,
  itemToString,
  renderItem,
}: ListProps<Item>) => {
  return (
    <Listbox {...containerProps}>
      {items.map((item, index) => {
        const itemProps = getItemProps({
          item,
          index,
          key: index,
          ...(typeof item === "object" && item.disabled
            ? { "data-disabled": true, disabled: true }
            : {}),
          ...(highlightedIndex === index ? { "data-found": true } : {}),
        });
        return renderItem({
          itemProps,
          selected: selectedItem === item,
          item,
          itemToString,
        });
      })}
    </Listbox>
  );
};

export const ComboboxPopperContent = PopperContent;

type ComboboxProps<Item> = {
  name: string;
  label?: string;
  items: Array<Item>;
  value?: Item;
  selectedItem?: Item;
  open?: boolean;
  onItemSelect?: (value: Item) => void;
  onItemHighlight?: (value?: Item) => void;
  itemToString?: (item: Item | null) => string;
  renderTextField?: (
    props: ComponentProps<typeof ComboboxTextField>
  ) => JSX.Element;
  renderList?: (props: ListProps<Item>) => JSX.Element;
  renderPopperContent?: (
    props: ComponentProps<typeof ComboboxPopperContent>
  ) => JSX.Element;
  renderItem: (props: ListboxItemProps<Item>) => JSX.Element;
};

export const Combobox = <Item extends ComboboxBaseItem>({
  items,
  value,
  name,
  open,
  itemToString = (item) =>
    typeof item === "object" && item !== null && "label" in item
      ? item.label
      : item ?? "",
  onItemSelect,
  onItemHighlight,
  renderTextField = (props) => <ComboboxTextField {...props} />,
  // IMPORTANT! Without Item passed to list <ComboboxList<Item> typescript is 10x slower!
  renderList = (props) => <ComboboxList<Item> {...props} />,
  renderPopperContent = (props) => <ComboboxPopperContent {...props} />,
  renderItem = (props) => <ComboboxListboxItem {...props} />,
}: ComboboxProps<Item>) => {
  const [foundItems, setFoundItems] = useState(items);
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
    isOpen: open,
    onInputValueChange({ inputValue }) {
      if (inputValue) {
        const options =
          typeof items[0] === "object" && "label" in items[0]
            ? { keys: ["label"] }
            : undefined;
        const foundItems = matchSorter(items, inputValue, options);
        setFoundItems(foundItems);
      }
    },
    items: foundItems,
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

  useEffect(() => {
    if (isOpen === false) {
      setFoundItems(items);
    }
  }, [isOpen, items]);

  const inputProps: Record<string, unknown> = getInputProps({ name });
  const toggleProps: Record<string, unknown> = getToggleButtonProps();
  const comboboxProps: Record<string, unknown> = getComboboxProps();
  const menuProps: Record<string, unknown> = getMenuProps();
  const highlightedItem = foundItems[highlightedIndex];
  return (
    <Popper>
      <Box {...comboboxProps}>
        <PopperAnchor asChild>
          {renderTextField({ inputProps, toggleProps, highlightedItem })}
        </PopperAnchor>
        {renderPopperContent({
          style: { zIndex: 1 },
          children: renderList({
            containerProps: menuProps,
            items: isOpen ? foundItems : [],
            getItemProps,
            highlightedIndex,
            selectedItem,
            itemToString,
            renderItem,
          }),
        })}
      </Box>
    </Popper>
  );
};

Combobox.displayName = "Combobox";
