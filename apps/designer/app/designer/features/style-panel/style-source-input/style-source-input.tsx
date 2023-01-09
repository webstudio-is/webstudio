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
  useEffect,
  useState,
  type ComponentProps,
  type ForwardRefRenderFunction,
  type RefObject,
} from "react";
import { mergeRefs } from "@react-aria/utils";
import { StyleSource } from "./style-source";

type IntermediateItem = {
  label: string;
  hasMenu: boolean;
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
    editingIndex: number;
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
    editingIndex: editingIndexProp,
    ...textFieldProps
  } = props;
  const [editingIndex, setEditingIndex] = useState(editingIndexProp);
  const [internalInputRef, focusProps] = useTextFieldFocus({
    disabled,
    onFocus,
    onBlur,
  });
  useEffect(() => {
    setEditingIndex(editingIndexProp);
  }, [editingIndexProp]);
  return (
    <TextFieldContainer
      {...focusProps}
      aria-disabled={disabled}
      ref={mergeRefs(forwardedRef, containerRef ?? null)}
      state={state}
      variant={variant}
      css={{ ...css, px: "$spacing$3", py: "$spacing$2" }}
      onKeyDown={onKeyDown}
    >
      {value.map((item, index) => (
        <StyleSource
          isEditing={index === editingIndex}
          onEditingChange={(isEditing) => {
            setEditingIndex(isEditing === true ? index : -1);
          }}
          onChange={(label) => {
            setEditingIndex(-1);
            onChangeItem?.({ ...item, label });
          }}
          onDuplicateItem={() => {
            onDuplicateItem?.(item);
          }}
          onRemoveItem={() => {
            onRemoveItem?.(item);
          }}
          label={item.label}
          hasMenu={item.hasMenu}
          key={index}
        />
      ))}
      {/* We want input to be the first element in DOM so it receives the focus first */}
      {editingIndex === -1 && (
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
  editingIndex?: number;
  onSelectItem?: (item: Item) => void;
  onRemoveItem?: (item: Item) => void;
  onCreateItem?: (item: Item) => void;
  onChangeItem?: (item: Item) => void;
  onDuplicateItem?: (item: Item) => void;
  css?: CSS;
};

export const StyleSourceInput = <Item extends IntermediateItem>(
  props: StyleSourceInputProps<Item>
) => {
  const value = props.value ?? [];
  const editingIndex = props.editingIndex ?? -1;
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
    value: { label, hasMenu: true },
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
            onDuplicateItem={props.onDuplicateItem}
            label={label}
            value={value}
            css={props.css}
            editingIndex={editingIndex}
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
