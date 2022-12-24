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
import { ElementRef, forwardRef, useState } from "react";
import { v4 as uuid } from "uuid";

export type StyleSource = {
  id: string;
  label: string;
  type: "local" | "token";
};

type TokenProps = {
  label: string;
};
const StyleSourceItem = ({ label }: TokenProps) => {
  return <Button variant="gray">{label}</Button>;
};

type TextFieldWrapperProps = typeof TextField & {
  value: Array<StyleSource>;
  inputValue: string;
};

const TextFieldWrapper = forwardRef<
  ElementRef<typeof Box>,
  TextFieldWrapperProps
>(({ value, inputValue, ...props }, ref) => {
  const prefix = value.map((item, index) => (
    <StyleSourceItem label={item.label} key={index} />
  ));
  return <TextField {...props} ref={ref} prefix={prefix} value={inputValue} />;
});
TextFieldWrapper.displayName = "TextFieldWrapper";

type StyleSourceInputProps = {
  items: Array<StyleSource>;
  value: Array<StyleSource>;
  onItemSelect: (item: StyleSource) => void;
  onItemRemove: (item: StyleSource) => void;
  onItemCreate: (label: string) => void;
};

const initialValue: StyleSource = {
  label: "",
  id: uuid(),
  type: "local",
};

export const StyleSourceInput = (props: StyleSourceInputProps) => {
  const [inputValue, setInputValue] = useState(initialValue.label);
  const {
    items,
    getInputProps,
    getComboboxProps,
    //getToggleButtonProps,
    getMenuProps,
    getItemProps,
    isOpen,
  } = useCombobox({
    items: props.items,
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
        props.onItemRemove(props.value[props.value.length - 1]);
        return;
      }
    },
    onKeyPress(event) {
      if (event.key === "Enter") {
        setInputValue("");
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
