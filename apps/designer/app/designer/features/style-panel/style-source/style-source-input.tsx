/*
 * Style Source Input functionality
 * - Type a new input with autocomplete
 * - Select an existing source from a list
 * - Enter a new source
 * - Hover the source to see the menu
 * - Menu provides: Remove, Duplicate, Disable, Edit name
 * - Drag and drop to reorder
 * - Click to toggle select/unselect
 * - Double click to edit name
 * - Local source can only be disabled, nothing else should be possible
 * - Hit Backspace to delete the last Source item when you are in the input
 */

import {
  Box,
  ComboboxListbox,
  ComboboxListboxItem,
  ComboboxPopper,
  ComboboxPopperAnchor,
  ComboboxPopperContent,
  TextFieldContainer,
  TextFieldInput,
  useTextFieldFocus,
  useCombobox,
  type CSS,
} from "@webstudio-is/design-system";
import {
  forwardRef,
  useState,
  type ComponentProps,
  type ForwardRefRenderFunction,
  type RefObject,
} from "react";
import { mergeRefs } from "@react-aria/utils";
import {
  ItemSource,
  menuCssVars,
  StyleSource,
  type ItemState,
} from "./style-source";
import { useSortable } from "./use-sortable";
import { theme } from "@webstudio-is/design-system";

type IntermediateItem = {
  id: string;
  label: string;
  isEditable: boolean;
  state: ItemState;
  source: ItemSource;
};

type TextFieldBaseWrapperProps<Item> = Omit<ComponentProps<"input">, "value"> &
  Pick<
    ComponentProps<typeof TextFieldContainer>,
    "variant" | "state" | "css"
  > & {
    value: Array<Item>;
    label: string;
    disabled?: boolean;
    containerRef?: RefObject<HTMLDivElement>;
    inputRef?: RefObject<HTMLInputElement>;
    onRemoveItem?: (item: Item) => void;
    onChangeItem?: (item: Item) => void;
    onDisableItem?: (item: Item) => void;
    onEnableItem?: (item: Item) => void;
    onSort?: (items: Array<Item>) => void;
    onSelectItem?: (item?: Item) => void;
    onEditItem?: (item?: Item) => void;
    editingItem?: Item;
  };

const TextFieldBase: ForwardRefRenderFunction<
  HTMLDivElement,
  TextFieldBaseWrapperProps<IntermediateItem>
> = (props, forwardedRef) => {
  const {
    css,
    disabled,
    containerRef,
    inputRef,
    state,
    variant: textFieldVariant,
    onFocus,
    onBlur,
    onClick,
    type,
    onKeyDown,
    label,
    value,
    onRemoveItem,
    onChangeItem,
    onDisableItem,
    onEnableItem,
    onSort,
    onSelectItem,
    onEditItem,
    editingItem,
    ...textFieldProps
  } = props;
  const [internalInputRef, focusProps] = useTextFieldFocus({
    disabled,
    onFocus,
    onBlur,
  });
  const { sortableRefCallback, dragItemId, placementIndicator } = useSortable({
    items: value,
    onSort,
  });

  return (
    <TextFieldContainer
      {...focusProps}
      aria-disabled={disabled}
      ref={mergeRefs(forwardedRef, containerRef ?? null, sortableRefCallback)}
      state={state}
      variant={textFieldVariant}
      css={{ ...css, px: theme.spacing[3], py: theme.spacing[2] }}
      style={
        dragItemId ? menuCssVars({ show: false, override: true }) : undefined
      }
      onKeyDown={onKeyDown}
    >
      {value.map((item, index) => (
        <StyleSource
          id={item.id}
          isDragging={item.id === dragItemId}
          isEditing={item.id === editingItem?.id}
          state={item.state}
          source={item.source}
          isEditable={item.isEditable}
          onChangeEditing={(isEditing) => {
            onEditItem?.(isEditing ? item : undefined);
          }}
          onChangeState={(state) => {
            if (state === "disabled") {
              onDisableItem?.(item);
            }
            if (state === "unselected") {
              onEnableItem?.(item);
            }
          }}
          onSelect={() => {
            onSelectItem?.(item.state === "selected" ? undefined : item);
          }}
          onChangeValue={(label) => {
            onEditItem?.();
            onChangeItem?.({ ...item, label });
          }}
          onRemove={() => {
            onRemoveItem?.(item);
          }}
          label={item.label}
          key={index}
        />
      ))}
      {placementIndicator}
      {/* We want input to be the first element in DOM so it receives the focus first */}
      {editingItem?.id === undefined && (
        <TextFieldInput
          {...textFieldProps}
          value={label}
          type={type}
          disabled={disabled}
          onClick={onClick}
          ref={mergeRefs(internalInputRef, inputRef ?? null)}
          autoFocus
          aria-label="New Style Source Input"
        />
      )}
    </TextFieldContainer>
  );
};

const TextField = forwardRef(TextFieldBase);
TextField.displayName = "TextField";

type StyleSourceInputProps<Item> = {
  items?: Array<Item>;
  value?: Array<Item>;
  editingItem?: Item;
  onSelectAutocompleteItem?: (item: Item) => void;
  onRemoveItem?: (item: Item) => void;
  onCreateItem?: (item: Item) => void;
  onChangeItem?: (item: Item) => void;
  onSelectItem?: (item?: Item) => void;
  onEditItem?: (item?: Item) => void;
  onDisableItem?: (item: Item) => void;
  onEnableItem?: (item: Item) => void;
  onSort?: (items: Array<Item>) => void;
  css?: CSS;
};

export const StyleSourceInput = <Item extends IntermediateItem>(
  props: StyleSourceInputProps<Item>
) => {
  const value = props.value ?? [];
  const [label, setLabel] = useState("");
  const {
    items,
    getInputProps,
    getComboboxProps,
    getMenuProps,
    getItemProps,
    isOpen,
  } = useCombobox({
    items: props.items ?? [],
    value: {
      label,
      state: "unselected",
      id: "",
      source: "local",
      isEditable: true,
    },
    selectedItem: undefined,
    itemToString: (item) => (item ? item.label : ""),
    onItemSelect(item) {
      setLabel("");
      props.onSelectAutocompleteItem?.(item as Item);
    },
    onInputChange(label) {
      setLabel(label ?? "");
    },
  });
  const inputProps = getInputProps({
    onKeyDown(event) {
      if (event.key === "Backspace" && label === "") {
        props.onRemoveItem?.(value[value.length - 1]);
      }
    },
    onKeyPress(event) {
      if (event.key === "Enter" && label.trim() !== "") {
        setLabel("");
        props.onCreateItem?.({ label } as Item);
      }
    },
  });

  return (
    <ComboboxPopper>
      <Box {...getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextField
            {...inputProps}
            onRemoveItem={props.onRemoveItem}
            onChangeItem={props.onChangeItem}
            onSelectItem={props.onSelectItem}
            onEditItem={props.onEditItem}
            onDisableItem={props.onDisableItem}
            onEnableItem={props.onEnableItem}
            onSort={props.onSort}
            label={label}
            value={value}
            css={props.css}
            editingItem={props.editingItem}
          />
        </ComboboxPopperAnchor>
        <ComboboxPopperContent align="start" sideOffset={5}>
          <ComboboxListbox {...getMenuProps()}>
            {isOpen &&
              items.map((item, index) => {
                return (
                  <ComboboxListboxItem
                    {...getItemProps({ item, index })}
                    key={index}
                  >
                    {item.label}
                  </ComboboxListboxItem>
                );
              })}
          </ComboboxListbox>
        </ComboboxPopperContent>
      </Box>
    </ComboboxPopper>
  );
};
