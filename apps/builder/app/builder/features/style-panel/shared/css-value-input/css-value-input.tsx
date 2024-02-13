import { matchSorter } from "match-sorter";
import {
  Box,
  useCombobox,
  Combobox,
  ComboboxContent,
  ComboboxAnchor,
  ComboboxListbox,
  ComboboxListboxItem,
  numericScrubControl,
  NestedInputButton,
  NestedIconLabel,
  InputField,
  handleNumericInputArrowKeys,
} from "@webstudio-is/design-system";
import type {
  KeywordValue,
  StyleProperty,
  StyleValue,
  Unit,
} from "@webstudio-is/css-engine";
import {
  type KeyboardEventHandler,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useUnitSelect } from "./unit-select";
import { parseIntermediateOrInvalidValue } from "./parse-intermediate-or-invalid-value";
import { toValue } from "@webstudio-is/css-engine";
import { useDebouncedCallback } from "use-debounce";
import type { StyleSource } from "../style-info";
import { toPascalCase } from "../keyword-utils";
import { isValidDeclaration } from "@webstudio-is/css-data";
import {
  $selectedInstanceBrowserStyle,
  $selectedInstanceUnitSizes,
} from "~/shared/nano-states";
import { convertUnits } from "./convert-units";

const useScrub = ({
  value,
  property,
  onChange,
  onChangeComplete,
  shouldHandleEvent,
}: {
  value: CssValueInputValue;
  property: StyleProperty;
  onChange: (value: CssValueInputValue) => void;
  onChangeComplete: (value: StyleValue) => void;
  shouldHandleEvent?: (node: Node) => boolean;
}): [
  React.MutableRefObject<HTMLDivElement | null>,
  React.MutableRefObject<HTMLInputElement | null>,
] => {
  const scrubRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onChangeRef = useRef(onChange);
  const onChangeCompleteRef = useRef(onChangeComplete);
  const valueRef = useRef(value);

  onChangeCompleteRef.current = onChangeComplete;
  onChangeRef.current = onChange;

  valueRef.current = value;

  // const type = valueRef.current.type;

  // Since scrub is going to call onChange and onChangeComplete callbacks, it will result in a new value and potentially new callback refs.
  // We need this effect to ONLY run when type or unit changes, but not when callbacks or value.value changes.
  useEffect(() => {
    const inputRefCurrent = inputRef.current;
    const scrubRefCurrent = scrubRef.current;

    const { current } = valueRef;

    // Support only auto keyword to be scrubbable
    if (
      (current.type !== "unit" &&
        !(current.type === "keyword" && current.value === "auto")) ||
      inputRefCurrent === null ||
      scrubRefCurrent === null
    ) {
      return;
    }

    let unit: Unit = "number";

    const validateValue = (numericValue: number) => {
      let value: CssValueInputValue = {
        type: "unit",
        unit,
        value: numericValue,
      };

      if (
        value.type === "unit" &&
        isValidDeclaration(property, toValue(value)) === false
      ) {
        value = parseIntermediateOrInvalidValue(property, {
          type: "intermediate",
          value: `${value.value}`,
          unit: value.unit,
        });

        // In case of negative values for some properties, we might end up with invalid value.
        if (value.type === "invalid") {
          // Try 0 with same unit
          if (isValidDeclaration(property, `0${unit}`)) {
            return {
              type: "unit",
              unit,
              value: 0,
            } as const;
          }

          // Try unitless (in case of unit above was `number`
          if (isValidDeclaration(property, "0")) {
            return {
              type: "unit",
              unit: "number",
              value: 0,
            } as const;
          }
        }
      }
      return value;
    };

    return numericScrubControl(scrubRefCurrent, {
      // @todo: after this https://github.com/webstudio-is/webstudio/issues/564
      // we can switch back on using just initial value
      //
      // For now we are reusing controls for different selectedInstanceData,
      // and the best here is to call useEffect every time selectedInstanceData changes
      // and recreate numericScrubControl.
      // Until we have decision do we use key properties for this or not,
      // on of the solution to get value inside scrub is to use ref and lazy getter.
      // Getter to avoid recreating scrub on every value change
      getInitialValue() {
        if (valueRef.current.type === "unit") {
          return valueRef.current.value;
        }

        if (
          valueRef.current.type === "keyword" &&
          valueRef.current.value === "auto"
        ) {
          return 0;
        }
      },
      onStart() {
        // for TS
        if (valueRef.current.type !== "unit") {
          return;
        }

        unit = valueRef.current.unit;
      },
      onValueInput(event) {
        // Moving focus to container of the input to hide the caret
        // (it makes text harder to read and may jump around as you scrub)
        scrubRef.current?.setAttribute("tabindex", "-1");
        scrubRef.current?.focus();

        const value = validateValue(event.value);

        onChangeRef.current(value);
      },
      onValueChange(event) {
        // Will work without but depends on order of setState updates
        // at text-control, now fixed in both places (order of updates is right, and batched here)
        const value = validateValue(event.value);

        onChangeCompleteRef.current(value);

        // Returning focus that we've moved above
        scrubRef.current?.removeAttribute("tabindex");
        inputRef.current?.focus();
        inputRef.current?.select();
      },
      shouldHandleEvent: shouldHandleEvent,
    });
  }, [shouldHandleEvent, property]);

  return [scrubRef, inputRef];
};

export const isNumericString = (input: string) =>
  String(input).trim().length !== 0 && Number.isNaN(Number(input)) === false;

const useHandleKeyDown =
  ({
    ignoreEnter,
    ignoreUpDownNumeric,
    value,
    onChange,
    onChangeComplete,
    onKeyDown,
  }: {
    ignoreEnter: boolean;
    ignoreUpDownNumeric: boolean;
    value: CssValueInputValue;
    onChange: (value: CssValueInputValue) => void;
    onChangeComplete: (value: CssValueInputValue) => void;
    onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  }) =>
  (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.defaultPrevented) {
      // Underlying select like `unitSelect` can already prevent an event like up/down buttons
      return;
    }

    // Do not prevent downshift behaviour on item select
    if (ignoreEnter === false) {
      if (event.key === "Enter") {
        onChangeComplete(value);
      }
    }

    if (
      ignoreUpDownNumeric === false &&
      (value.type === "unit" ||
        (value.type === "intermediate" && isNumericString(value.value))) &&
      value.unit !== undefined &&
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      const inputValue =
        value.type === "unit" ? value.value : Number(value.value.trim());

      onChange({
        type: "unit",
        value: handleNumericInputArrowKeys(inputValue, event),
        unit: value.unit,
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

export type CssValueInputValue = StyleValue | IntermediateStyleValue;

export type ChangeReason =
  | "enter"
  | "blur"
  | "unit-select"
  | "keyword-select"
  | "scrub-end";

type CssValueInputProps = {
  styleSource: StyleSource;
  property: StyleProperty;
  value: StyleValue | undefined;
  intermediateValue: CssValueInputValue | undefined;
  /**
   * Selected item in the dropdown
   */
  keywords?: Array<KeywordValue>;
  disabled?: boolean;
  onChange: (value: CssValueInputValue | undefined) => void;
  onChangeComplete: (event: {
    value: StyleValue;
    reason: ChangeReason;
  }) => void;
  onHighlight: (value: StyleValue | undefined) => void;
  onAbort: () => void;
  icon?: ReactNode;
  prefix?: ReactNode;
  showSuffix?: boolean;
};

const initialValue: IntermediateStyleValue = {
  type: "intermediate",
  value: "",
};

const itemToString = (item: CssValueInputValue | null) => {
  return item === null
    ? ""
    : item.type === "keyword"
    ? toPascalCase(toValue(item))
    : item.type === "intermediate" || item.type === "unit"
    ? String(item.value)
    : toValue(item);
};

const match = <Item,>(
  search: string,
  items: Array<Item>,
  itemToString: (item: Item | null) => string
) =>
  matchSorter(items, search, {
    keys: [itemToString, (item) => itemToString(item).replace(/\s/g, "-")],
  });

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
  prefix,
  showSuffix = true,
  styleSource,
  property,
  keywords = [],
  onHighlight,
  onAbort,
  disabled,
  ...props
}: CssValueInputProps) => {
  const value = props.intermediateValue ?? props.value ?? initialValue;

  const onChange = (input: string | undefined) => {
    if (input === undefined) {
      props.onChange(undefined);
      return;
    }
    // We don't know what's inside the input,
    // preserve current unit value if exists
    props.onChange({
      type: "intermediate",
      value: input,
      unit: "unit" in value ? value.unit : undefined,
    });
  };

  const onChangeComplete = (
    value: CssValueInputValue,
    reason: ChangeReason
  ) => {
    if (value.type !== "intermediate" && value.type !== "invalid") {
      props.onChangeComplete({ value, reason });
      return;
    }

    const parsedValue = parseIntermediateOrInvalidValue(property, value);

    if (parsedValue.type === "invalid") {
      props.onChange(parsedValue);
      return;
    }

    props.onChangeComplete({
      value: parsedValue,
      reason,
    });
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
    itemToString,
    match,
    onInputChange: (inputValue) => {
      onChange(inputValue);
    },
    onItemSelect: (value) => {
      onChangeComplete(value, "keyword-select");
    },
    onItemHighlight: (value) => {
      if (value == null) {
        onHighlight(undefined);
        return;
      }

      if (value.type !== "intermediate") {
        onHighlight(value);
      }
    },
  });

  const inputProps = getInputProps();

  const [isUnitsOpen, unitSelectElement] = useUnitSelect({
    property,
    value,
    onChange: (unitOrKeyword) => {
      if (unitOrKeyword.type === "keyword") {
        onChangeComplete(unitOrKeyword, "unit-select");
        return;
      }

      const unit = unitOrKeyword.value;

      // value looks like a number and just edited (type === "intermediate")
      // no additional conversions are necessary
      if (
        value.type === "intermediate" &&
        Number.isNaN(Number.parseFloat(value.value)) === false
      ) {
        onChangeComplete({ ...value, unit }, "unit-select");
        return;
      }

      const unitSizes = $selectedInstanceUnitSizes.get();

      // Value not edited by the user, we need to convert it to the new unit
      if (value.type === "unit") {
        const convertedValue = convertUnits(unitSizes)(
          value.value,
          value.unit,
          unit
        );

        onChangeComplete(
          {
            type: "unit",
            value: Number.parseFloat(convertedValue.toFixed(2)),
            unit,
          },
          "unit-select"
        );
        return;
      }

      // value is a keyword or non numeric, try get browser style value and convert it
      if (value.type === "keyword" || value.type === "intermediate") {
        const browserStyle = $selectedInstanceBrowserStyle.get();
        const browserPropertyValue = browserStyle?.[property];
        const propertyValue =
          browserPropertyValue?.type === "unit"
            ? browserPropertyValue.value
            : 0;
        const propertyUnit =
          browserPropertyValue?.type === "unit"
            ? browserPropertyValue.unit
            : "number";

        const convertedValue = convertUnits(unitSizes)(
          propertyValue,
          propertyUnit,
          unit
        );

        onChangeComplete(
          {
            type: "unit",
            value: Number.parseFloat(convertedValue.toFixed(2)),
            unit,
          },
          "unit-select"
        );
        return;
      }

      onChangeComplete(
        {
          type: "intermediate",
          value: toValue(value),
          unit,
        },
        "unit-select"
      );
    },
    onCloseAutoFocus(event) {
      // We don't want to focus the unit trigger when closing the select (no matter if unit was selected, clicked outside or esc was pressed)
      event.preventDefault();
      // Instead we want to focus the input
      inputRef.current?.focus();
    },
  });

  const shouldHandleEvent = useCallback((node: Node) => {
    return suffixRef.current?.contains?.(node) === false;
  }, []);

  const [scrubRef, inputRef] = useScrub({
    value,
    property,
    onChange: props.onChange,
    onChangeComplete: (value) => onChangeComplete(value, "scrub-end"),
    shouldHandleEvent,
  });

  const menuProps = getMenuProps();

  /**
   * useDebouncedCallback without wait param uses Request Animation Frame
   * here we wait for 1 tick until the "blur" event will be completed by Downshift
   **/
  const callOnCompleteIfIntermediateValueExists = useDebouncedCallback(() => {
    if (props.intermediateValue !== undefined) {
      onChangeComplete(value, "blur");
    }
  });

  const handleOnBlur: KeyboardEventHandler = (event) => {
    inputProps.onBlur(event);
    // When unit select is open, onBlur is triggered,though we don't want a change event in this case.
    if (isUnitsOpen) {
      return;
    }

    // If the menu is open and visible we don't want to trigger onChangeComplete
    // as it will be done by Downshift
    // There is situation that Downshift will not call omCompleted if nothing is selected in menu
    if (isOpen && menuProps.empty === false) {
      // There is a situation that Downshift will not call onChangeComplete if nothing is selected in the menu
      callOnCompleteIfIntermediateValueExists();
      return;
    }

    // Probably no changes have been made at this point
    // In that case we will call onAbort instead of onChangeComplete
    if (props.intermediateValue === undefined) {
      onAbort();
      return;
    }
    onChangeComplete(value, "blur");
  };

  const handleKeyDown = useHandleKeyDown({
    // In case of the menu is really open and the selection is inside it
    // we do not prevent the default downshift Enter key behavior
    ignoreEnter:
      isUnitsOpen || (isOpen && !menuProps.empty && highlightedIndex !== -1),
    // Do not change the number value on the arrow up/down if any menu is opened
    ignoreUpDownNumeric: isUnitsOpen || isOpen,
    onChangeComplete: (value) => onChangeComplete(value, "enter"),
    value,
    onChange: props.onChange,
    onKeyDown: inputProps.onKeyDown,
  });

  const finalPrefix =
    prefix ||
    (icon && (
      <NestedIconLabel
        color={styleSource}
        css={value.type === "unit" ? { cursor: "ew-resize" } : undefined}
      >
        {icon}
      </NestedIconLabel>
    ));

  const keywordButtonElement = (
    <NestedInputButton
      {...getToggleButtonProps()}
      data-state={isOpen ? "open" : "closed"}
      tabIndex={-1}
    />
  );

  const isUnitValue = unitSelectElement !== null;

  const hasItems = items.length !== 0;
  const isKeywordValue = value.type === "keyword" && hasItems;
  const suffixRef = useRef<HTMLDivElement | null>(null);

  const suffix =
    showSuffix === false ? null : (
      <Box ref={suffixRef}>
        {isUnitValue
          ? unitSelectElement
          : isKeywordValue
          ? keywordButtonElement
          : null}
      </Box>
    );

  return (
    <Combobox open={isOpen}>
      <Box {...getComboboxProps()}>
        <ComboboxAnchor>
          <InputField
            disabled={disabled}
            {...inputProps}
            onFocus={() => {
              const isFocused = document.activeElement === inputRef.current;
              if (isFocused) {
                inputRef.current?.select();
              }
            }}
            onBlur={handleOnBlur}
            onKeyDown={handleKeyDown}
            containerRef={scrubRef}
            inputRef={inputRef}
            name={property}
            color={value.type === "invalid" ? "error" : undefined}
            prefix={finalPrefix}
            suffix={suffix}
            css={{ cursor: "default" }}
          />
        </ComboboxAnchor>
        {isOpen && (
          <ComboboxContent align="start" sideOffset={2} collisionPadding={10}>
            <ComboboxListbox {...menuProps}>
              {items.map((item, index) => (
                <ComboboxListboxItem
                  {...getItemProps({ item, index })}
                  key={index}
                >
                  {itemToString(item)}
                </ComboboxListboxItem>
              ))}
            </ComboboxListbox>
          </ComboboxContent>
        )}
      </Box>
    </Combobox>
  );
};
