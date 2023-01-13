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
import { StyleSource, type ItemState } from "./style-source";
import { useSortable } from "./use-sortable";

type IntermediateItem = {
  id: string;
  label: string;
  hasMenu: boolean;
  state: ItemState;
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
    onDuplicateItem?: (item: Item) => void;
    onChangeItem?: (item: Item) => void;
    onDisableItem?: (item: Item) => void;
    onEnableItem?: (item: Item) => void;
    onSort?: (items: Array<Item>) => void;
    onChangeCurrent?: (id: string) => void;
    onChangeEditing?: (id?: string) => void;
    editingItemId?: string;
    currentItemId?: string;
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
    variant,
    onFocus,
    onBlur,
    onClick,
    type,
    onKeyDown,
    label,
    value,
    onRemoveItem,
    onDuplicateItem,
    onChangeItem,
    onDisableItem,
    onEnableItem,
    onSort,
    onChangeCurrent,
    onChangeEditing,
    currentItemId,
    editingItemId,
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
      variant={variant}
      css={{ ...css, px: "$spacing$3", py: "$spacing$2" }}
      onKeyDown={onKeyDown}
    >
      {value.map((item, index) => (
        <StyleSource
          id={item.id}
          state={
            item.id === dragItemId
              ? "dragging"
              : item.id === editingItemId
              ? "editing"
              : item.state
          }
          isCurrent={item.id === currentItemId}
          onStateChange={(state) => {
            onChangeEditing?.(state === "editing" ? item.id : undefined);
            if (state === "disabled") {
              onDisableItem?.(item);
            }
            if (state === "initial") {
              onEnableItem?.(item);
            }
          }}
          onChangeCurrent={() => {
            onChangeCurrent?.(item.id);
          }}
          onChange={(label) => {
            onChangeEditing?.();
            onChangeItem?.({ ...item, label });
          }}
          onDuplicate={() => {
            onDuplicateItem?.(item);
          }}
          onRemove={() => {
            onRemoveItem?.(item);
          }}
          label={item.label}
          hasMenu={item.hasMenu}
          key={index}
        />
      ))}
      {placementIndicator}
      {/* We want input to be the first element in DOM so it receives the focus first */}
      {editingItemId === undefined && (
        <TextFieldInput
          {...textFieldProps}
          value={label}
          type={type}
          disabled={disabled}
          onClick={onClick}
          ref={mergeRefs(internalInputRef, inputRef ?? null)}
          autoFocus
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
  editingItemId?: string;
  currentItemId?: string;
  onSelectItem?: (item: Item) => void;
  onRemoveItem?: (item: Item) => void;
  onCreateItem?: (item: Item) => void;
  onChangeItem?: (item: Item) => void;
  onChangeCurrent?: (id: string) => void;
  onChangeEditing?: (id?: string) => void;
  onDuplicateItem?: (item: Item) => void;
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
    value: { label, hasMenu: true, state: "initial", id: "" },
    selectedItem: undefined,
    itemToString: (item) => (item ? item.label : ""),
    onItemSelect(item) {
      setLabel("");
      props.onSelectItem?.(item as Item);
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
        props.onCreateItem?.({ label, hasMenu: true } as Item);
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
            onChangeCurrent={props.onChangeCurrent}
            onChangeEditing={props.onChangeEditing}
            onDuplicateItem={props.onDuplicateItem}
            onDisableItem={props.onDisableItem}
            onEnableItem={props.onEnableItem}
            onSort={props.onSort}
            label={label}
            value={value}
            css={props.css}
            editingItemId={props.editingItemId}
            currentItemId={props.currentItemId}
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
