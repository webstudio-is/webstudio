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
    onRemove: (item: Item) => void;
    onDuplicate: (item: Item) => void;
    onChangeItem: (item: Item) => void;
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
    onRemove,
    onDuplicate,
    onChangeItem,
    ...textFieldProps
  } = props;
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [internalInputRef, focusProps] = useTextFieldFocus({
    disabled,
    onFocus,
    onBlur,
  });

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
          onChange={(label) => {
            setIsEditingSource(false);
            onChangeItem({ ...item, label });
          }}
          onDuplicate={() => {
            onDuplicate(item);
          }}
          onRemove={() => {
            onRemove(item);
          }}
          onEdit={() => {
            setIsEditingSource(true);
          }}
          label={item.label}
          hasMenu={item.hasMenu}
          key={index}
        />
      ))}
      {/* We want input to be the first element in DOM so it receives the focus first */}
      {isEditingSource === false && (
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
  onSelect?: (item: Item) => void;
  onRemove?: (item: Item) => void;
  onCreate?: (item: Item) => void;
  onChangeItem?: (item: Item) => void;
  onDuplicate?: (item: Item) => void;
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
    value: { label, hasMenu: true },
    selectedItem: undefined,
    itemToString: (item) => (item ? item.label : ""),
    onItemSelect(item) {
      setLabel("");
      props.onSelect?.(item as Item);
    },
    onInputChange(label) {
      setLabel(label ?? "");
    },
  });
  const inputProps = getInputProps({
    onKeyDown(event) {
      if (event.key === "Backspace" && label === "") {
        props.onRemove?.(value[value.length - 1]);
        return;
      }
    },
    onKeyPress(event) {
      if (event.key === "Enter" && label.trim() !== "") {
        setLabel("");
        props.onCreate?.({ label, hasMenu: true } as Item);
      }
    },
  });

  return (
    <ComboboxPopper>
      <Box {...getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextField
            {...inputProps}
            onRemove={props.onRemove}
            onChangeItem={props.onChangeItem}
            label={label}
            value={value}
            css={props.css}
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
