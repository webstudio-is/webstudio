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
  Unit,
} from "@webstudio-is/css-data";
import {
  type KeyboardEventHandler,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useIsFromCurrentBreakpoint } from "../use-is-from-current-breakpoint";
import { useUnitSelect } from "./unit-select";
import { unstable_batchedUpdates as unstableBatchedUpdates } from "react-dom";
import { parseIntermediateOrInvalidValue } from "./parse-intermediate-or-invalid-value";
import { toValue } from "@webstudio-is/css-engine";

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

const useScrub = ({
  value,
  onChange,
  onChangeComplete,
  shouldHandleEvent,
}: {
  value: CssValueInputValue;
  onChange: (value: CssValueInputValue) => void;
  onChangeComplete: (value: StyleValue) => void;
  shouldHandleEvent?: (node: EventTarget) => boolean;
}): [
  React.MutableRefObject<HTMLDivElement | null>,
  React.MutableRefObject<HTMLInputElement | null>
] => {
  const scrubRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

    const scrub = numericScrubControl(scrubRefCurrent, {
      // @todo: after this https://github.com/webstudio-is/webstudio-designer/issues/564
      // we can switch back on using just initial value
      //
      // For now we are reusing controls for different selectedInstanceData,
      // and the best here is to call useEffect every time selectedInstanceData changes
      // and recreate numericScrubControl.
      // Until we have decision do we use key properties for this or not,
      // on of the solution to get value inside scrub is to use ref and lazy getter.
      // Getter to avoid recreating scrub on every value change
      getValue: () => {
        if (valueRef.current.type === "unit") {
          return valueRef.current.value;
        }
      },
      onValueInput(event) {
        // Moving focus to container of the input to hide the caret
        // (it makes text harder to read and may jump around as you scrub)
        scrubRef.current?.focus();

        onChangeRef.current({
          type,
          unit,
          value: event.value,
        });
      },
      onValueChange(event) {
        // Will work without but depends on order of setState updates
        // at text-control, now fixed in both places (order of updates is right, and batched here)
        unstableBatchedUpdates(() => {
          onChangeCompleteRef.current({
            type,
            unit,
            value: event.value,
          });
        });

        // Returning focus that we've moved above
        inputRef.current?.focus();
        inputRef.current?.select();
      },
      shouldHandleEvent: shouldHandleEvent,
    });

    return scrub.disconnectedCallback;
  }, [type, unit, shouldHandleEvent]);

  return [scrubRef, inputRef];
};

const useHandleKeyDown =
  ({
    ignoreEnter,
    value,
    onChange,
    onChangeComplete,
    onKeyDown,
  }: {
    ignoreEnter: boolean;
    value: CssValueInputValue;
    onChange: (value: CssValueInputValue) => void;
    onChangeComplete: (value: CssValueInputValue) => void;
    onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  }) =>
  (event: KeyboardEvent<HTMLInputElement>) => {
    // Do not prevent downshift behaviour on item select
    if (ignoreEnter === false) {
      if (event.key === "Enter") {
        onChangeComplete(value);
      }
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
      // Prevent Downshift from opening menu on arrow up/down
      return;
    }

    onKeyDown(event);
  };

export type IntermediateStyleValue = {
  type: "intermediate";
  value: string;
  unit?: Unit;
};

type CssValueInputValue = StyleValue | IntermediateStyleValue;

type CssValueInputProps = {
  property: StyleProperty;
  value: StyleValue | undefined;
  intermediateValue: CssValueInputValue | undefined;
  /**
   * Selected item in the dropdown
   */
  keywords?: Array<KeywordValue>;
  onChange: (value: CssValueInputValue) => void;
  onChangeComplete: (value: StyleValue) => void;
  onHighlight: (value: StyleValue) => void;
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
  keywords = [],
  onHighlight,
  ...props
}: CssValueInputProps & { icon?: JSX.Element }) => {
  const value = props.intermediateValue ?? props.value ?? unsetValue;

  const onChange = (input: string) => {
    // We don't know what's inside the input,
    // preserve current unit value if exists
    props.onChange({
      type: "intermediate",
      value: input,
      unit: "unit" in value ? value.unit : undefined,
    });
  };

  const onChangeComplete = (value: CssValueInputValue) => {
    if (value.type !== "intermediate" && value.type !== "invalid") {
      props.onChangeComplete(value);
      return;
    }

    props.onChangeComplete(parseIntermediateOrInvalidValue(property, value));
  };

  const {
    items,
    getInputProps,
    getComboboxProps,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    isOpen,
    highlightedIndex,
  } = useCombobox<CssValueInputValue>({
    items: keywords,
    value,
    selectedItem: props.value,
    itemToString: (item) =>
      item === null
        ? ""
        : item.type === "intermediate" || item.type === "unit"
        ? String(item.value)
        : toValue(item),
    onInputChange: (inputValue) => {
      onChange(inputValue ?? unsetValue.value);
    },
    onItemSelect: (value) => {
      onChangeComplete(value ?? unsetValue);
    },
    onItemHighlight: (value) => {
      if (value == null) {
        onHighlight(unsetValue);
        return;
      }
      if (value.type !== "intermediate") {
        onHighlight(value ?? unsetValue);
      }
    },
  });

  const inputProps = getInputProps();

  const [isUnitsOpen, unitSelectElement] = useUnitSelect({
    property,
    value:
      value.type === "unit" || value.type === "intermediate"
        ? value
        : undefined,
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

  const [scrubRef, inputRef] = useScrub({
    value,
    onChange: props.onChange,
    onChangeComplete,
    shouldHandleEvent,
  });

  const menuProps = getMenuProps();

  const handleOnBlur: KeyboardEventHandler = (event) => {
    inputProps.onBlur(event);
    // When unit select is open, onBlur is triggered,though we don't want a change event in this case.
    if (isUnitsOpen) {
      return;
    }

    // If the menu is open and visible we don't want to trigger onChangeComplete
    // as it will be done by Downshift
    if (isOpen && !menuProps.empty) {
      return;
    }

    onChangeComplete(value);
  };

  const handleKeyDown = useHandleKeyDown({
    // In case of the menu is really open and the selection is inside it
    // we do not prevent the default downshift Enter key behavior
    ignoreEnter: isOpen && !menuProps.empty && highlightedIndex !== -1,
    onChangeComplete,
    value,
    onChange: props.onChange,
    onKeyDown: inputProps.onKeyDown,
  });

  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(property);
  const prefix = icon && (
    <CssValueInputIconButton
      state={isCurrentBreakpoint ? "set" : undefined}
      css={value.type === "unit" ? { cursor: "ew-resize" } : undefined}
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
  const isUnitValue = "unit" in value;
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
              if (isFocused) {
                inputRef.current?.select();
              }
            }}
            onBlur={handleOnBlur}
            onKeyDown={handleKeyDown}
            baseRef={scrubRef}
            inputRef={inputRef}
            name={property}
            state={value.type === "invalid" ? "invalid" : undefined}
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
          <ComboboxListbox {...menuProps}>
            {isOpen &&
              items.map((item, index) => (
                <ComboboxListboxItem
                  {...getItemProps({ item, index })}
                  key={index}
                >
                  {item.type === "intermediate" ? item.value : toValue(item)}
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
