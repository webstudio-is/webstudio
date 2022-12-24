import {
  Box,
  Button,
  ComboboxListbox,
  ComboboxListboxItem,
  ComboboxPopper,
  ComboboxPopperAnchor,
  ComboboxPopperContent,
  TextField,
  useCombobox,
} from "@webstudio-is/design-system";
import { ElementRef, forwardRef } from "react";

export type Item = {
  id: string;
  label: string;
  type: "local" | "token";
};

type TokenProps = {
  label: string;
};
const Token = ({ label }: TokenProps) => {
  return <Button variant="gray">{label}</Button>;
};

type TextFieldWrapperProps = typeof TextField & {
  value: Array<Item>;
  inputValue: string;
};

const TextFieldWrapper = forwardRef<
  ElementRef<typeof Box>,
  TextFieldWrapperProps
>(({ value, inputValue, ...props }, ref) => {
  const prefix = value.map((item, index) => (
    <Token label={item.label} key={index} />
  ));
  return <TextField {...props} ref={ref} prefix={prefix} value={inputValue} />;
});
TextFieldWrapper.displayName = "TextFieldWrapper";

type StyleSourceInputProps = {
  items: Array<Item>;
  value: Array<Item>;
  onItemSelect: (item: Item) => void;
  onItemRemove: (item: Item) => void;
  onItemCreate: (label: string) => void;
};

export const StyleSourceInput = (props: StyleSourceInputProps) => {
  const {
    items,
    getInputProps,
    getComboboxProps,
    //getToggleButtonProps,
    getMenuProps,
    getItemProps,
    isOpen,
    inputValue,
  } = useCombobox({
    items: props.items,
    value: null,
    selectedItem: undefined,
    itemToString: (item) => item?.label ?? "",
    onItemSelect: props.onItemSelect,
  });
  const inputProps = getInputProps({
    onKeyDown(event) {
      if (event.key === "Backspace" && inputValue === "") {
        props.onItemRemove(props.value[props.value.length - 1]);
      }
    },
    onKeyPress(event) {
      if (event.key === "Enter") {
        props.onItemCreate(inputValue);
      }
    },
  });
  return (
    <ComboboxPopper>
      <Box {...getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextFieldWrapper
            {...inputProps}
            inputValue={inputValue}
            value={props.value}
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
