import {
  Box,
  TextField,
  useCombobox,
  ComboboxPopper,
  ComboboxPopperContent,
  ComboboxPopperAnchor,
  ComboboxListbox,
  ComboboxListboxItem,
  IconButton,
  Select,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import {
  type KeywordValue,
  type StyleProperty,
  type Unit,
  type UnitValue,
  type UnsetValue,
  StyleValue,
  units as unsortedUnits,
} from "@webstudio-is/react-sdk";
import React, {
  type KeyboardEventHandler,
  useEffect,
  useRef,
  useState,
} from "react";

// @todo sorting doesn't work
export const defaultUnits: Array<Unit> = [...unsortedUnits].sort((unit) =>
  ["px", "%", "em", "rem", "ch", "vw", "vh", "vmin", "vmax"].includes(unit)
    ? -1
    : 1
);
const defaultKeywords: [] = [];
const defaultValue: UnsetValue = { type: "unset", value: "" };

const isNumberString = (input: string) =>
  String(input).trim().length !== 0 && isNaN(Number(input)) === false;

//const isSameStyleValue = (value1: StyleValue, value2: StyleValue) =>
//  value1.type === value2.type && value1.value === value2.value;

// We incrment by 10 when shift is pressed, by 0.1 when alt/option is pressed and by by 1 otherwise.
const calcNumberChange = (
  value: number,
  { altKey, shiftKey, key }: { altKey: boolean; shiftKey: boolean; key: string }
) => {
  const delta = shiftKey ? 10 : altKey ? 0.1 : 1;
  const multiplier = key === "ArrowUp" ? 1 : -1;
  return Number((value + delta * multiplier).toFixed(1));
};

const useOnChange = (
  value: StyleValue,
  input: string,
  onChange: (value: StyleValue) => void
) => {
  // Used to decouple onChange effect from value ref change
  const valueRef = useRef<StyleValue>(value);

  useEffect(() => {
    if (input === String(valueRef.current.value)) {
      return;
    }

    // We want to switch to unit mode if entire input is a number.
    if (isNumberString(input)) {
      onChange?.({
        type: "unit",
        // Use previously known unit or fallback to px.
        unit: valueRef.current.type === "unit" ? valueRef.current.unit : "px",
        value: Number(input),
      });
      return;
    }

    onChange?.({
      type: "keyword",
      value: input,
    });
  }, [input, onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);
};

type UseUnitSelectType = {
  value?: UnitValue;
  onChange: (value: StyleValue) => void;
  units?: Array<Unit>;
};

const useUnitSelect = ({
  onChange,
  value,
  units = defaultUnits,
  ...props
}: UseUnitSelectType) => {
  const [isUnitsOpen, setIsUnitsOpen] = useState(false);
  if (value === undefined) return [isUnitsOpen, null];
  const element = (
    <Select
      {...props}
      value={value.unit}
      options={units}
      suffix={null}
      ghost
      open={isUnitsOpen}
      onOpenChange={setIsUnitsOpen}
      onChange={(unit) => {
        onChange?.({
          ...value,
          unit,
        } as UnitValue);
      }}
    />
  );

  return [isUnitsOpen, element];
};

type CssValueInputProps = {
  property: StyleProperty;
  value?: StyleValue;
  keywords?: Array<KeywordValue>;
  onChange: (value: StyleValue) => void;
  onChangeComplete: (value: StyleValue) => void;
  onItemHighlight?: (value: StyleValue | null) => void;
};

/**
 * Common:
 * - Free text editing
 * - Enter or blur calls onChangeComplete
 * - Value prop can be of type "invalid" and render invalid mode of the input (red outline)
 *
 * Unit mode:
 * - When entire text is a number we automatically switch to unit mode on keydown
 * - Unit selection on unit button click or focus+enter
 * - When selecting unit arrow keys are used to navigate unit items
 * - When selecting unit Enter key or click is used to select item
 * - When selecting unit Escape key is used to close list
 * - Key up and down on focused input increment/decrement the value
 *   - shift key modifier increases/decreases value by 10
 *   - option/alt key modifier increases/decreases value by 0.1
 *   - no modifier increases/decreases value by 1
 * - During typing the number + unit (e.g. "12px"), input is in keyword mode, but then after blur/enter unit entered is taken as a unit value
 * - Scrub interaction
 *
 * Keywords mode:
 * - When any character in the input is not a number we automatically switch to keywords mode on keydown
 * - Filterable keywords list (click on chevron or arrow down to show the list)
 * - Arrow keys are used to navigate keyword items
 * - Enter key or click is used to select item when list is open
 * - Escape key is used to close list
 * - When hovering over keywords list, onItemHighlight is called
 *
 * Features outside of this input (non standard):
 * - Typing a unit in unit mode will change the selected unit on blur/enter
 * - Evaluated math expression: "2px + 3em" (like CSS calc())
 */

export const CssValueInput = ({
  property,
  value = defaultValue,
  keywords = defaultKeywords,
  onChange,
  onChangeComplete,
  onItemHighlight,
}: CssValueInputProps) => {
  const {
    items,
    getInputProps,
    getComboboxProps,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    isOpen,
  } = useCombobox<StyleValue>({
    items: keywords,
    value,
    itemToString: (item) => (item === null ? "" : String(item.value)),
    onItemSelect: (value) => {
      onChangeComplete(value ?? defaultValue);
    },
    onItemHighlight,
  });

  const inputProps = getInputProps();

  useOnChange(value, inputProps.value, onChange);

  const [isUnitsOpen, unitSelectElement] = useUnitSelect({
    value: value.type === "unit" ? value : undefined,
    onChange: onChangeComplete,
  });

  const handleOnBlur: KeyboardEventHandler = (event) => {
    // When units select is open, onBlur is triggered,though we don't want a change event in this case.
    if (isUnitsOpen) return;
    onChangeComplete(value);
    inputProps.onBlur(event);
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter") {
      onChangeComplete(value);
    }
    if (
      value.type === "unit" &&
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      onChange({
        ...value,
        value: calcNumberChange(value.value, event),
      });
    }

    inputProps.onKeyDown(event);
  };

  const suffix =
    value.type === "keyword" ? (
      <IconButton {...getToggleButtonProps()}>
        <ChevronDownIcon />
      </IconButton>
    ) : value.type === "unit" ? (
      unitSelectElement
    ) : null;

  return (
    <ComboboxPopper>
      <Box {...getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextField
            {...inputProps}
            name={property}
            state={value.type === "invalid" ? "invalid" : undefined}
            suffix={suffix}
            onKeyDown={handleKeyDown}
            onBlur={handleOnBlur}
          />
        </ComboboxPopperAnchor>
        <ComboboxPopperContent align="start" sideOffset={5}>
          <ComboboxListbox {...getMenuProps()}>
            {isOpen &&
              items.map((item, index) => (
                <ComboboxListboxItem
                  {...getItemProps({ item, index })}
                  key={index}
                >
                  {item.value}
                </ComboboxListboxItem>
              ))}
          </ComboboxListbox>
        </ComboboxPopperContent>
      </Box>
    </ComboboxPopper>
  );
};
