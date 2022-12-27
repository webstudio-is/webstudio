import {
  Box,
  Button,
  Text,
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
  ComponentProps,
  ElementRef,
  forwardRef,
  RefObject,
  useState,
} from "react";
import { mergeRefs } from "@react-aria/utils";

type IntermediateItem = {
  label: string;
};

type StyleSourceButtonProps = {
  label: string;
};

const StyleSourceButton = ({ label }: StyleSourceButtonProps) => {
  return (
    <Button variant="gray" css={{ maxWidth: "100%" }}>
      <Text truncate>{label}</Text>
    </Button>
  );
};

type TextFieldWrapperProps = Omit<ComponentProps<"input">, "value"> &
  Pick<
    ComponentProps<typeof TextFieldContainer>,
    "variant" | "state" | "css"
  > & {
    value: Array<IntermediateItem>;
    label: string;
    disabled?: boolean;
    containerRef?: RefObject<HTMLDivElement>;
    inputRef?: RefObject<HTMLInputElement>;
  };

const TextField = forwardRef<ElementRef<typeof Box>, TextFieldWrapperProps>(
  (props, forwardedRef) => {
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
      ...textFieldProps
    } = props;
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
          <StyleSourceButton label={item.label} key={index} />
        ))}
        {/* We want input to be the first element in DOM so it receives the focus first */}
        <TextFieldInput
          {...textFieldProps}
          value={label}
          type={type}
          disabled={disabled}
          onClick={onClick}
          ref={mergeRefs(internalInputRef, inputRef ?? null)}
        />
      </TextFieldContainer>
    );
  }
);
TextField.displayName = "TextField";

type StyleSourceInputProps<Item> = {
  items?: Array<Item>;
  value?: Array<Item>;
  onSelect: (item: Item) => void;
  onRemove: (item: Item) => void;
  onCreate: (item: IntermediateItem) => void;
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
    value: { label },
    selectedItem: undefined,
    itemToString: (item) => (item ? item.label : ""),
    onItemSelect(item) {
      setLabel("");
      props.onSelect(item as Item);
    },
    onInputChange(label) {
      setLabel(label ?? "");
    },
  });
  const inputProps = getInputProps({
    onKeyDown(event) {
      if (event.key === "Backspace" && label === "") {
        props.onRemove(value[value.length - 1]);
        return;
      }
    },
    onKeyPress(event) {
      if (event.key === "Enter" && label.trim() !== "") {
        setLabel("");
        props.onCreate({ label });
      }
    },
  });

  return (
    <ComboboxPopper>
      <Box {...getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextField
            {...inputProps}
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
