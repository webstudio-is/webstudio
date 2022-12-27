import {
  Box,
  Button,
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
  Text,
} from "@webstudio-is/design-system";
import {
  ComponentProps,
  ElementRef,
  forwardRef,
  RefObject,
  useState,
} from "react";
import { mergeRefs } from "@react-aria/utils";

export type StyleSource = {
  id: string;
  label: string;
  type: "local" | "token";
};

type StyleSourceItemProps = {
  label: string;
};
const StyleSourceItem = ({ label }: StyleSourceItemProps) => {
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
    value: Array<StyleSource>;
    inputValue: string;
    disabled?: boolean;
    css?: CSS;
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
      inputValue,
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
          <StyleSourceItem label={item.label} key={index} />
        ))}
        {/* We want input to be the first element in DOM so it receives the focus first */}
        <TextFieldInput
          {...textFieldProps}
          value={inputValue}
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

type StyleSourceInputProps = {
  items?: Array<StyleSource>;
  value?: Array<StyleSource>;
  onItemSelect: (item: StyleSource) => void;
  onItemRemove: (item: StyleSource) => void;
  onItemCreate: (label: string) => void;
  css?: CSS;
};

const initialValue: StyleSource = {
  label: "",
  id: "__INITIAL_ID__",
  type: "local",
};

export const StyleSourceInput = (props: StyleSourceInputProps) => {
  const value = props.value ?? [];
  const [inputValue, setInputValue] = useState(initialValue.label);
  const {
    items,
    getInputProps,
    getComboboxProps,
    getMenuProps,
    getItemProps,
    isOpen,
  } = useCombobox({
    items: props.items ?? [],
    value: { ...initialValue, label: inputValue },
    selectedItem: undefined,
    itemToString: (item) => item?.label ?? "",
    onItemSelect(item) {
      setInputValue("");
      props.onItemSelect(item);
    },
    onInputChange(label) {
      setInputValue(label ?? "");
    },
  });
  const inputProps = getInputProps({
    onKeyDown(event) {
      if (event.key === "Backspace" && inputValue === "") {
        props.onItemRemove(value[value.length - 1]);
        return;
      }
    },
    onKeyPress(event) {
      if (event.key === "Enter" && inputValue.trim() !== "") {
        setInputValue("");
        props.onItemCreate(inputValue);
      }
    },
  });

  return (
    <ComboboxPopper>
      <Box {...getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextField
            {...inputProps}
            inputValue={inputValue}
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
