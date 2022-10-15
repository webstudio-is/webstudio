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
  numericScrubControl,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import {
  type KeywordValue,
  type StyleProperty,
  type Unit,
  type UnitValue,
  type UnsetValue,
  StyleValue,
} from "@webstudio-is/react-sdk";
import {
  type KeyboardEventHandler,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

export const defaultUnits: Array<Unit> = [
  "px",
  "em",
  "rem",
  "ch",
  "vw",
  "vh",
  "%",
  "number",
];
const defaultKeywords: [] = [];
const defaultValue: UnsetValue = { type: "unset", value: "" };

const isNumericString = (input: string) =>
  String(input).trim().length !== 0 && isNaN(Number(input)) === false;

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
    if (isNumericString(input)) {
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
      onChange={(item) => {
        // @todo Select should support generics
        const unit = item as Unit;
        onChange?.({
          ...value,
          unit,
        });
      }}
      onCloseAutoFocus={(event) => {
        // We don't want to focus the unit trigger when closing the select (no matter if unit was selected, clicked outside or esc was pressed)
        event.preventDefault();
      }}
    />
  );

  return [isUnitsOpen, element];
};

const useSelect = (
  inputRef: React.MutableRefObject<HTMLInputElement | null>
) => {
  const shouldSelect = useRef(true);

  const onPointerUp = () => {
    if (shouldSelect.current) {
      inputRef.current?.select();
    }
  };

  const onPointerDown = () => {
    const isFocused = document.activeElement === inputRef.current;
    shouldSelect.current = isFocused === false;
  };

  return {
    onPointerUp,
    onPointerDown,
  };
};

const useScrub = (options: {
  value: StyleValue;
  onChange: (value: StyleValue) => void;
  onChangeComplete: (value: StyleValue) => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const { value, onChange, onChangeComplete } = optionsRef.current;
    if (value.type !== "unit" || inputRef.current === null) return;

    const scrub = numericScrubControl(inputRef.current, {
      initialValue: value.value,
      onValueInput(event) {
        onChange({
          ...value,
          value: event.value,
        });
      },
      onValueChange(event) {
        onChangeComplete({
          ...value,
          value: event.value,
        });
      },
    });

    return () => {
      scrub.disconnectedCallback();
    };
  }, [options.value.type]);

  return inputRef;
};

const useKeyDown =
  ({
    value,
    onChange,
    onChangeComplete,
    onKeyDown,
    closeMenu,
  }: {
    value: StyleValue;
    onChange: (value: StyleValue) => void;
    onChangeComplete: (value: StyleValue) => void;
    onKeyDown: KeyboardEventHandler<HTMLInputElement>;
    closeMenu: () => void;
  }) =>
  (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown(event);
    if (event.key === "Enter") {
      closeMenu();
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
 * - Scrub interaction
 * - Click outside, unit selection or escape when list is open should unfocus the unit select trigger
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
 * - Typing number + unit (e.g. "12px") in unit mode will change the selected unit on blur/enter
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
    closeMenu,
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

  const inputRef = useScrub({
    value,
    onChange,
    onChangeComplete,
  });

  const inputPointerProps = useSelect(inputRef);

  const handleOnBlur: KeyboardEventHandler = (event) => {
    // When units select is open, onBlur is triggered,though we don't want a change event in this case.
    if (isUnitsOpen) return;
    onChangeComplete(value);
    inputProps.onBlur(event);
  };

  const handleKeyDown = useKeyDown({
    value,
    onChange,
    onChangeComplete,
    onKeyDown: inputProps.onKeyDown,
    closeMenu,
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
            {...inputPointerProps}
            onBlur={handleOnBlur}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
            name={property}
            state={value.type === "invalid" ? "invalid" : undefined}
            suffix={suffix}
            css={{ cursor: "default" }}
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
