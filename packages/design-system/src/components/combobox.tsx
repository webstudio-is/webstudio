import {
  useState,
  forwardRef,
  useCallback,
  type ComponentProps,
  type ForwardRefRenderFunction,
} from "react";
import { CheckIcon, ChevronDownIcon } from "@webstudio-is/icons";
import { Popper, PopperContent, PopperAnchor } from "@radix-ui/react-popper";
import { useCombobox, type UseComboboxGetItemPropsOptions } from "downshift";
import { matchSorter } from "match-sorter";
import { styled } from "../stitches.config";
import { IconButton } from "./icon-button";
import { itemCss } from "./menu";
import { panelStyles } from "./panel";
import { TextField } from "./text-field";
import { Box } from "./box";
import { Grid } from "./grid";

type Label = string;

type BaseItem = { label: Label; disabled?: boolean } | Label;

type ComboboxTextFieldProps<Item> = {
  inputProps: ComponentProps<typeof TextField>;
  toggleProps: ComponentProps<typeof IconButton>;
  highlightedItem?: Item;
};

const ComboboxTextFieldBase: ForwardRefRenderFunction<
  HTMLDivElement,
  ComboboxTextFieldProps<BaseItem>
> = ({ inputProps, toggleProps }, ref) => {
  return (
    <TextField
      ref={ref}
      suffix={
        <IconButton {...toggleProps}>
          <ChevronDownIcon />
        </IconButton>
      }
      {...inputProps}
    />
  );
};

export const ComboboxTextField = forwardRef(ComboboxTextFieldBase);

ComboboxTextField.displayName = "ComboboxTextField";

const Listbox = styled("ul", {
  margin: 0,
  padding: 0,
  overflow: "auto",
  minWidth: 124,
  maxHeight: 190,
  py: "$1",
  backgroundColor: "$colors$slate4",
  borderRadius: "$1",
  boxShadow:
    "0px 2px 7px rgba(0, 0, 0, 0.1), 0px 5px 17px rgba(0, 0, 0, 0.15), inset 0 0 1px 1px $colors$slate1, 0 0 0 1px $colors$slate8",
  "&:empty": {
    display: "none",
  },
});

const ListboxItem = styled("li", {
  all: "unset",
  fontSize: "$2",
  lineHeight: 1,
  color: "$hiContrast",
  display: "flex",
  alignItems: "center",
  height: "$5",
  padding: "0 $2",
  position: "relative",
  "&[aria-selected=true]": {
    backgroundColor: "$blue10",
    color: "white",
  },
});

type ListProps<Item> = {
  containerProps: ComponentProps<typeof Listbox>;
  items: ReadonlyArray<Item>;
  getItemProps: (
    options: UseComboboxGetItemPropsOptions<Item>
  ) => ComponentProps<typeof ListboxItem>;
  highlightedIndex: number;
  selectedItem: Item | null;
  itemToString: (item: Item | null) => string;
};

export const List = <Item extends BaseItem>({
  containerProps,
  items,
  getItemProps,
  highlightedIndex,
  selectedItem,
  itemToString,
}: ListProps<Item>) => {
  return (
    <Listbox {...containerProps}>
      {items.map((item, index) => {
        const itemProps: Record<string, unknown> = getItemProps({
          item,
          index,
          key: index,
          ...(typeof item === "object" && item.disabled
            ? { "data-disabled": true, disabled: true }
            : {}),
          ...(highlightedIndex === index ? { "data-found": true } : {}),
        });

        return (
          // eslint-disable-next-line react/jsx-key
          <ListboxItem {...itemProps}>
            <Grid align="center" css={{ gridTemplateColumns: "$4 1fr" }}>
              {selectedItem === item && <CheckIcon />}
              <Box css={{ gridColumn: 2 }}>{itemToString(item)}</Box>
            </Grid>
          </ListboxItem>
        );
      })}
    </Listbox>
  );
};

export const ComboboxPopperContent = PopperContent;

type ComboboxProps<Item> = {
  name: string;
  label?: string;
  placeholder?: string;
  items: ReadonlyArray<Item>;
  value?: Item;
  onItemSelect?: (value?: Item) => void;
  selected?: Item;
  onItemHighlight?: (value?: Item) => void;
  itemToString?: (item?: Item | null) => string;
  renderTextField?: (
    props: ComponentProps<typeof ComboboxTextField>
  ) => JSX.Element;
  renderList?: (props: ListProps<Item>) => JSX.Element;
  renderPopperContent?: (
    props: ComponentProps<typeof ComboboxPopperContent>
  ) => JSX.Element;
};

export const Combobox = <Item extends BaseItem>({
  items,
  value,
  selected = value,
  name,
  placeholder,
  itemToString = (item) =>
    item != null && typeof item == "object" && "label" in item
      ? item.label
      : item ?? "",
  onItemSelect,
  onItemHighlight,
  renderTextField = (props) => <ComboboxTextField {...props} />,
  // IMPORTANT! Without Item passed to list <List<Item> typescript is 10x slower!
  renderList = (props) => <List<Item> {...props} />,
  renderPopperContent = (props) => <ComboboxPopperContent {...props} />,
}: ComboboxProps<Item>) => {
  const [foundItems, setFoundItems] = useState(items);
  const stateReducer = useCallback((state, actionAndChanges) => {
    const { type, changes } = actionAndChanges;
    switch (type) {
      // on item selection.
      case useCombobox.stateChangeTypes.ItemClick:
      case useCombobox.stateChangeTypes.InputKeyDownEnter:
      case useCombobox.stateChangeTypes.InputBlur:
      case useCombobox.stateChangeTypes.ControlledPropUpdatedSelectedItem:
        return {
          ...changes,
          // if we had an item selected.
          ...(changes.selectedItem && {
            // we will set the input value to be empty since we display it using prefix
            inputValue: "",
          }),
        };
      // Clear input value on escape
      case useCombobox.stateChangeTypes.InputKeyDownEscape:
        return {
          ...changes,
          inputValue: "",
          selectedItem: null,
        };
      // Reset selectedItem when there is selection and we type something
      case useCombobox.stateChangeTypes.InputChange:
        return {
          ...changes,
          selectedItem: null,
        };
      default:
        return changes; // otherwise business as usual.
    }
  }, []);
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
    items: foundItems as Item[],
    selectedItem: value ?? null, // Avoid downshift warning about switching controlled mode
    stateReducer,
    itemToString,
    onInputValueChange({ inputValue }) {
      const options =
        typeof items[0] === "object" && "label" in items[0]
          ? { keys: ["label"] }
          : undefined;
      const foundItems = matchSorter(items, inputValue ?? "", options);
      setFoundItems(foundItems);
    },
    onSelectedItemChange({ selectedItem }) {
      onItemSelect?.(selectedItem ?? undefined);
    },
    onHighlightedIndexChange({ highlightedIndex }) {
      if (highlightedIndex !== undefined) {
        onItemHighlight?.(items[highlightedIndex]);
      }
    },
  });

  const inputProps: Record<string, unknown> = getInputProps({
    name,
    placeholder: selectedItem ? "" : placeholder, // Placeholder should not be visible when we have selected item
    prefix: itemToString?.(selectedItem ?? undefined),
    onKeyDown: (event) => {
      // When we press Backspace and the input is empty,
      // we should to clear the selection
      // @todo: it would be much better to handle this in reducer but downshift doesn't handle this event
      if (event.key === "Backspace" && selectedItem !== null) {
        onItemSelect?.(undefined);
      }
    },
  });
  const toggleProps: Record<string, unknown> = getToggleButtonProps();
  const comboboxProps: Record<string, unknown> = getComboboxProps();
  const menuProps: Record<string, unknown> = getMenuProps();
  const highlightedItem = foundItems[highlightedIndex];

  return (
    <Popper>
      <Box {...comboboxProps}>
        <PopperAnchor>
          {renderTextField({
            inputProps,
            toggleProps,
            highlightedItem,
          })}
        </PopperAnchor>
        {renderPopperContent({
          style: { zIndex: 1 },
          align: "end",
          sideOffset: 8,
          children: renderList({
            containerProps: menuProps,
            items: isOpen ? foundItems : [],
            getItemProps,
            highlightedIndex,
            selectedItem: selected as Item,
            itemToString,
          }),
        })}
      </Box>
    </Popper>
  );
};

Combobox.displayName = "Combobox";
