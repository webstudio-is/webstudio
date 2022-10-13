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
import { useEffect, useRef, useState } from "react";

// @todo sorting doesn't work
export const defaultUnits: Array<Unit> = [...unsortedUnits].sort((unit) =>
  ["px", "%", "em", "rem", "ch", "vw", "vh", "vmin", "vmax"].includes(unit)
    ? -1
    : 1
);
const defaultKeywords: [] = [];
const defaultValue: UnsetValue = { type: "unset", value: "" };

const useOnChange = (
  value: StyleValue,
  input: string,
  onChange: (value: StyleValue) => void
) => {
  // Used to decouple onChange effect from value ref change
  const valueRef = useRef<StyleValue>(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (input === valueRef.current.value) return;

    // We want to switch to unit mode if entire input is a number.
    if (/^\d+$/.test(input)) {
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
 * - When text is a number - unit mode
 * - Enter or blur calls onChangeComplete
 * - After submission, when value is an invalid CSS value - invalid mode
 *
 * Unit mode:
 * - Unit selection on unit button click
 * - When selecting unit arrow keys are used to navigate unit items
 * - When selecting unit Enter key or click is used to select item
 * - When selecting unit Escape key is used to close list
 * - Key up and down on focused input increment/decrement the value
 * - Typing a unit in unit mode will change the selected unit
 * - During typing the unit until unit is matched, input is in invalid mode
 * - Math expression: "2px + 3em" (like CSS calc())
 * - Handle scrubbing
 *
 * Keywords mode:
 * - Filterable keywords list (click on chevron or arrow down to show the list)
 * - Arrow keys are used to navigate keyword items
 * - Enter key or click is used to select item when list is open
 * - Escape key is used to close list
 * - When hovering over keywords list, onItemHighlight is called
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
    items: value.type === "keyword" ? keywords : defaultKeywords,
    value,
    // @todo if we String() the value, it leads to an infinite loop
    itemToString: (item) => (item?.value as string) ?? "",
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
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onChangeComplete(value);
              }
              inputProps.onKeyDown(event);
            }}
            onBlur={(event) => {
              // When units select is open, onBlur is triggered,though we don't want a change event in this case.
              if (isUnitsOpen) return;
              onChangeComplete(value);
              inputProps.onBlur(event);
            }}
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
