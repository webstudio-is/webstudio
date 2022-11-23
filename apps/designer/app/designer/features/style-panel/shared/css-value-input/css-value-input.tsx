import {
  Box,
  TextField,
  useCombobox,
  ComboboxPopper,
  ComboboxPopperContent,
  ComboboxPopperAnchor,
  ComboboxListbox,
  ComboboxListboxItem,
  numericScrubControl,
  TextFieldIcon,
  TextFieldIconButton,
  styled,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import type {
  KeywordValue,
  StyleProperty,
  UnsetValue,
  StyleValue,
} from "@webstudio-is/css-data";
import {
  type KeyboardEventHandler,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useIsFromCurrentBreakpoint } from "../use-is-from-current-breakpoint";
import { useUnitSelect } from "./unit-select";
import { isValid, isNumericString } from "../parse-css-value";

const unsetValue: UnsetValue = { type: "unset", value: "" };

// We increment by 10 when shift is pressed, by 0.1 when alt/option is pressed and by 1 by default.
const calcNumberChange = (
  value: number,
  { altKey, shiftKey, key }: { altKey: boolean; shiftKey: boolean; key: string }
) => {
  const delta = shiftKey ? 10 : altKey ? 0.1 : 1;
  const multiplier = key === "ArrowUp" ? 1 : -1;
  return Number((value + delta * multiplier).toFixed(1));
};

const useHandleOnChange = (
  property: StyleProperty,
  value: StyleValue,
  input: string,
  onChange: (value: StyleValue) => void
) => {
  // Used to decouple onChange effect from value ref change
  const valueRef = useRef<StyleValue>(value);

  useEffect(() => {
    if (input === "" || input === String(valueRef.current.value)) {
      return;
    }

    // We want to switch to unit mode if entire input is a number.
    if (isNumericString(input)) {
      if (value.type === "unit" && String(Number(input)) !== input) return;
      onChange?.({
        type: "unit",
        // Use previously known unit or fallback to the most common unit: px, if supported
        unit:
          valueRef.current.type === "unit"
            ? valueRef.current.unit
            : isValid(property, input + "px")
            ? "px"
            : "number",
        value: Number(input),
      });
      return;
    }

    onChange?.({
      type: "keyword",
      value: input,
    });
  }, [property, input, value.type, onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);
};

const useScrub = ({
  value,
  onChange,
  onChangeComplete,
  shouldHandleEvent,
}: {
  value: StyleValue;
  onChange: (value: StyleValue) => void;
  onChangeComplete: (value: StyleValue) => void;
  shouldHandleEvent?: (node: EventTarget) => boolean;
}): [
  React.MutableRefObject<HTMLDivElement | null>,
  React.MutableRefObject<HTMLInputElement | null>,
  boolean
] => {
  const scrubRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isInputActive, setIsInputActive] = useState(false);
  const onChangeRef = useRef(onChange);
  const onChangeCompleteRef = useRef(onChangeComplete);
  const valueRef = useRef(value);

  onChangeCompleteRef.current = onChangeComplete;
  onChangeRef.current = onChange;
  valueRef.current = value;

  const type = valueRef.current.type;
  const unit = type === "unit" ? valueRef.current.unit : undefined;

  // Since scrub is going to call onChange and onChangeComplete callbacks, it will result in a new value and potentially new callback refs.
  // We need this effect to ONLY run when type or unit changes, but not when callbacks or value.value changes.
  useEffect(() => {
    const inputRefCurrent = inputRef.current;
    const scrubRefCurrent = scrubRef.current;
    if (
      type !== "unit" ||
      unit === undefined ||
      inputRefCurrent === null ||
      scrubRefCurrent === null
    ) {
      return;
    }

    const value = valueRef.current.value;
    const scrub = numericScrubControl(scrubRefCurrent, {
      initialValue: value,
      onValueInput(event) {
        inputRefCurrent.value = String(event.value);
        setIsInputActive(true);
        inputRefCurrent.blur();
      },
      onValueChange(event) {
        onChangeCompleteRef.current({
          type,
          unit,
          value: event.value,
        });
        setIsInputActive(false);
        inputRefCurrent.focus();
        inputRefCurrent.select();
      },
      shouldHandleEvent: shouldHandleEvent,
    });

    return scrub.disconnectedCallback;
  }, [type, unit, shouldHandleEvent]);

  return [scrubRef, inputRef, isInputActive];
};

const useHandleKeyDown =
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
      (event.key === "ArrowUp" || event.key === "ArrowDown") &&
      event.currentTarget.value
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
  icon,
  property,
  value = unsetValue,
  keywords = [],
  onChange,
  onChangeComplete,
  onItemHighlight,
}: CssValueInputProps & { icon?: JSX.Element }) => {
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
      onChangeComplete(value ?? unsetValue);
    },
    onItemHighlight,
  });

  const inputProps = getInputProps();

  useHandleOnChange(property, value, inputProps.value, onChange);

  const [isUnitsOpen, unitSelectElement] = useUnitSelect({
    property,
    value: value.type === "unit" ? value : undefined,
    onChange: onChangeComplete,
    onCloseAutoFocus(event) {
      // We don't want to focus the unit trigger when closing the select (no matter if unit was selected, clicked outside or esc was pressed)
      event.preventDefault();
      // Instead we want to focus the input
      inputRef.current?.focus();
    },
  });

  const shouldHandleEvent = useCallback((node) => {
    return suffixRef.current?.contains?.(node) === false;
  }, []);
  const [scrubRef, inputRef, isInputActive] = useScrub({
    value,
    onChange,
    onChangeComplete,
    shouldHandleEvent,
  });

  const handleOnBlur: KeyboardEventHandler = (event) => {
    // When units select is open, onBlur is triggered,though we don't want a change event in this case.
    if (isUnitsOpen) return;
    onChangeComplete(value);
    inputProps.onBlur(event);
  };

  const handleKeyDown = useHandleKeyDown({
    value,
    onChange,
    onChangeComplete,
    onKeyDown: inputProps.onKeyDown,
    closeMenu,
  });

  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(property);
  const prefix = icon && (
    <CssValueInputIconButton
      state={isCurrentBreakpoint ? "set" : undefined}
      css={value.type == "unit" ? { cursor: "ew-resize" } : undefined}
    >
      {icon}
    </CssValueInputIconButton>
  );

  const keywordButtonElement = (
    <TextFieldIconButton
      {...getToggleButtonProps()}
      state={isOpen ? "active" : undefined}
    >
      <ChevronDownIcon />
    </TextFieldIconButton>
  );
  const hasItems = items.length !== 0;
  const isUnitValue = value.type === "unit";
  const isKeywordValue = value.type === "keyword" && hasItems;
  const suffixRef = useRef<HTMLDivElement | null>(null);
  const suffix = (
    <Box ref={suffixRef}>
      {isUnitValue
        ? unitSelectElement
        : isKeywordValue
        ? keywordButtonElement
        : null}
    </Box>
  );

  return (
    <ComboboxPopper>
      <Box {...getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextField
            {...inputProps}
            onFocus={() => {
              const isFocused = document.activeElement === inputRef.current;
              if (isFocused) inputRef.current?.select();
            }}
            onBlur={handleOnBlur}
            onKeyDown={handleKeyDown}
            baseRef={scrubRef}
            inputRef={inputRef}
            name={property}
            state={
              value.type === "invalid"
                ? "invalid"
                : isInputActive
                ? "active"
                : undefined
            }
            prefix={prefix}
            suffix={suffix}
            css={{ cursor: "default" }}
          />
        </ComboboxPopperAnchor>
        <ComboboxPopperContent
          align="start"
          sideOffset={8}
          collisionPadding={10}
        >
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

const CssValueInputIconButton = styled(TextFieldIcon, {
  variants: {
    state: {
      set: {
        backgroundColor: "$blue4",
        color: "$blue11",
        "&:hover": {
          backgroundColor: "$blue4",
          color: "$blue11",
        },
      },

      inherited: {
        backgroundColor: "$orange4",
        color: "$orange11",
        "&:hover": {
          backgroundColor: "$orange4",
          color: "$orange11",
        },
      },
    },
  },
});
