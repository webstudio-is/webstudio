import {
  Box,
  useCombobox,
  ComboboxRoot,
  ComboboxContent,
  ComboboxAnchor,
  ComboboxListbox,
  ComboboxListboxItem,
  ComboboxItemDescription,
  ComboboxScrollArea,
  numericScrubControl,
  NestedInputButton,
  NestedIconLabel,
  InputField,
  handleNumericInputArrowKeys,
  theme,
  Flex,
  styled,
  Text,
} from "@webstudio-is/design-system";
import type {
  KeywordValue,
  StyleProperty,
  StyleValue,
  Unit,
  VarValue,
} from "@webstudio-is/css-engine";
import {
  type KeyboardEventHandler,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { useUnitSelect } from "./unit-select";
import { parseIntermediateOrInvalidValue } from "./parse-intermediate-or-invalid-value";
import { toValue } from "@webstudio-is/css-engine";
import { useDebouncedCallback } from "use-debounce";
import {
  declarationDescriptions,
  isValidDeclaration,
  properties,
} from "@webstudio-is/css-data";
import {
  $selectedInstanceBrowserStyle,
  $selectedInstanceUnitSizes,
} from "~/shared/nano-states";
import { convertUnits } from "./convert-units";
import { mergeRefs } from "@react-aria/utils";
import { composeEventHandlers } from "~/shared/event-utils";
import type { StyleValueSourceColor } from "~/shared/style-object-model";
import { ColorThumb } from "../color-thumb";

// We need to enable scrub on properties that can have numeric value.
const canBeNumber = (property: StyleProperty, value: CssValueInputValue) => {
  const unitGroups =
    properties[property as keyof typeof properties]?.unitGroups ?? [];
  // allow scrubbing css variables with unit value
  return unitGroups.length !== 0 || value.type === "unit";
};

// Subjective adjust ment based on how it feels on macbook/trackpad.
// It won't be ideal for everyone with different input devices and preferences.
// Ideally we also need some kind of acceleration setting with 1 value.
const scrubUnitAcceleration = new Map<Unit, number>([
  ["rem", 1 / 16],
  ["em", 1 / 16],
  ["%", 1 / 10],
  ["dvw", 1 / 10],
  ["dvh", 1 / 10],
  ["number", 1 / 20],
]);

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

    // Support only auto keyword to be scrubbable
    if (
      inputRefCurrent === null ||
      scrubRefCurrent === null ||
      canBeNumber(property, valueRef.current) === false
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
      distanceThreshold: 2,
      getAcceleration() {
        if (valueRef.current.type === "unit") {
          return scrubUnitAcceleration.get(valueRef.current.unit);
        }
      },
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
        return 0;
      },
      onStart() {
        if (valueRef.current.type === "unit") {
          unit = valueRef.current.unit;
        }
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
      shouldHandleEvent,
    });
  }, [shouldHandleEvent, property]);

  return [scrubRef, inputRef];
};

export const isNumericString = (input: string) =>
  String(input).trim().length !== 0 && Number.isNaN(Number(input)) === false;

export type IntermediateStyleValue = {
  type: "intermediate";
  value: string;
  unit?: Unit;
};

export type CssValueInputValue = StyleValue | IntermediateStyleValue;

type Modifiers = {
  altKey: boolean;
  shiftKey: boolean;
};

type ChangeCompleteEvent = {
  type:
    | "enter"
    | "blur"
    | "scrub-end"
    | "unit-select"
    | "keyword-select"
    | "delta";
  value: StyleValue;
} & Modifiers;

type CssValueInputProps = Pick<
  ComponentProps<typeof InputField>,
  | "variant"
  | "text"
  | "autoFocus"
  | "disabled"
  | "aria-disabled"
  | "fieldSizing"
  | "prefix"
  | "inputRef"
> & {
  styleSource: StyleValueSourceColor;
  property: StyleProperty;
  value: StyleValue | undefined;
  intermediateValue: CssValueInputValue | undefined;
  /**
   * Selected item in the dropdown
   */
  getOptions?: () => Array<KeywordValue | VarValue>;
  onChange: (value: CssValueInputValue | undefined) => void;
  onChangeComplete: (event: ChangeCompleteEvent) => void;
  onHighlight: (value: StyleValue | undefined) => void;
  onAbort: () => void;
  icon?: ReactNode;
  showSuffix?: boolean;
};

const initialValue: IntermediateStyleValue = {
  type: "intermediate",
  value: "",
};

const itemToString = (item: CssValueInputValue | null) => {
  if (item === null) {
    return "";
  }
  if (item.type === "var") {
    return `var(--${item.value})`;
  }
  if (item.type === "keyword") {
    // E.g. we want currentcolor to be lower case
    return toValue(item).toLocaleLowerCase();
  }
  if (item.type === "intermediate" || item.type === "unit") {
    return String(item.value);
  }
  return toValue(item);
};

const Description = styled(Box, { width: theme.spacing[27] });

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
 *   - does not open the combobox when the input is a number (CSS root variables can include numbers in their names)
 * - Scrub interaction
 * - Click outside, unit selection or escape when list is open should unfocus the unit select trigger
 *
 * Options mode:
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
  autoFocus,
  icon,
  prefix,
  showSuffix = true,
  styleSource,
  property,
  getOptions = () => [],
  onHighlight,
  onAbort,
  disabled,
  ["aria-disabled"]: ariaDisabled,
  fieldSizing,
  variant,
  text,
  ...props
}: CssValueInputProps) => {
  const value = props.intermediateValue ?? props.value ?? initialValue;
  const valueRef = useRef(value);
  valueRef.current = value;

  // Used to show description
  const [highlightedValue, setHighlighedValue] = useState<
    StyleValue | undefined
  >();

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
    event: {
      type: ChangeCompleteEvent["type"];
      value: CssValueInputValue;
    } & Partial<Modifiers>
  ) => {
    const { value } = event;
    const defaultProps = { altKey: false, shiftKey: false };

    if (value.type !== "intermediate" && value.type !== "invalid") {
      // The value might be valid but not selected from the combo menu. Close the menu.
      closeMenu();
      props.onChangeComplete({ ...defaultProps, ...event, value });
      return;
    }

    const parsedValue = parseIntermediateOrInvalidValue(property, value);

    if (parsedValue.type === "invalid") {
      props.onChange(parsedValue);
      return;
    }

    // The value might be valid but not selected from the combo menu. Close the menu.
    closeMenu();
    props.onChangeComplete({
      ...defaultProps,
      ...event,
      value: parsedValue,
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
    closeMenu,
  } = useCombobox<CssValueInputValue>({
    // Used for description to match the item when nothing is highlighted yet and value is still in non keyword mode
    getItems: getOptions,
    value,
    selectedItem: props.value,
    itemToString,
    onChange: (inputValue) => {
      onChange(inputValue);
    },
    onItemSelect: (value) => {
      onChangeComplete({ value, type: "keyword-select" });
    },
    onItemHighlight: (value) => {
      if (value == null) {
        onHighlight(undefined);
        setHighlighedValue(undefined);
        return;
      }

      if (value.type !== "intermediate") {
        onHighlight(value);
        setHighlighedValue(value);
      }
    },
  });

  const inputProps = getInputProps();

  const [isUnitsOpen, unitSelectElement] = useUnitSelect({
    property,
    value,
    onChange: (unitOrKeyword) => {
      if (unitOrKeyword.type === "keyword") {
        onChangeComplete({ value: unitOrKeyword, type: "unit-select" });
        return;
      }

      const unit = unitOrKeyword.value;

      // value looks like a number and just edited (type === "intermediate")
      // no additional conversions are necessary
      if (
        value.type === "intermediate" &&
        Number.isNaN(Number.parseFloat(value.value)) === false
      ) {
        onChangeComplete({ value: { ...value, unit }, type: "unit-select" });
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

        onChangeComplete({
          value: {
            type: "unit",
            value: Number.parseFloat(convertedValue.toFixed(2)),
            unit,
          },
          type: "unit-select",
        });
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

        onChangeComplete({
          value: {
            type: "unit",
            value: Number.parseFloat(convertedValue.toFixed(2)),
            unit,
          },
          type: "unit-select",
        });
        return;
      }

      onChangeComplete({
        value: {
          type: "intermediate",
          value: toValue(value),
          unit,
        },
        type: "unit-select",
      });
    },
    onCloseAutoFocus(event) {
      // We don't want to focus the unit trigger when closing the select (no matter if unit was selected, clicked outside or esc was pressed)
      event.preventDefault();
      // Instead we want to focus the input
      inputRef.current?.focus();
    },
  });

  const shouldHandleEvent = useCallback((node: Node) => {
    // prevent scrubbing when css variable is selected
    if (valueRef.current.type === "var") {
      return false;
    }
    // prevent scrubbing when unit select is in use
    if (suffixRef.current?.contains?.(node)) {
      return false;
    }
    return true;
  }, []);

  const [scrubRef, inputRef] = useScrub({
    value,
    property,
    onChange: props.onChange,
    onChangeComplete: (value) => onChangeComplete({ value, type: "scrub-end" }),
    shouldHandleEvent,
  });

  const menuProps = getMenuProps();

  /**
   * useDebouncedCallback without wait param uses Request Animation Frame
   * here we wait for 1 tick until the "blur" event will be completed by Downshift
   **/
  const callOnCompleteIfIntermediateValueExists = useDebouncedCallback(() => {
    if (props.intermediateValue !== undefined) {
      onChangeComplete({ value, type: "blur" });
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
    onChangeComplete({ value, type: "blur" });
  };

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
      <Flex align="center" ref={suffixRef}>
        {isUnitValue
          ? unitSelectElement
          : isKeywordValue
            ? keywordButtonElement
            : null}
      </Flex>
    );

  let description;
  // When user hovers or focuses an item in the combobox list we want to show the description of the item and otherwise show the description of the current value
  const valueForDescription =
    highlightedValue?.type === "keyword"
      ? highlightedValue
      : highlightedValue?.type === "var"
        ? undefined
        : props.value?.type === "keyword"
          ? props.value
          : items[0]?.type === "keyword"
            ? items[0]
            : undefined;

  if (valueForDescription) {
    const key = `${property}:${toValue(
      valueForDescription
    )}` as keyof typeof declarationDescriptions;
    description = declarationDescriptions[key];
  }

  const descriptions = items
    .map((item) =>
      item.type === "keyword"
        ? declarationDescriptions[
            `${property}:${toValue(
              item
            )}` as keyof typeof declarationDescriptions
          ]
        : undefined
    )
    .filter(Boolean)
    .map((descr) => <Description>{descr}</Description>);

  const handleUpDownNumeric = (event: KeyboardEvent<HTMLInputElement>) => {
    const isComboOpen = isOpen && !menuProps.empty;

    if (isUnitsOpen || isComboOpen) {
      return;
    }

    if (
      (value.type === "unit" ||
        (value.type === "intermediate" && isNumericString(value.value))) &&
      value.unit !== undefined &&
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      const inputValue =
        value.type === "unit" ? value.value : Number(value.value.trim());

      const meta = { altKey: event.altKey, shiftKey: event.shiftKey };
      const hasMeta = meta.altKey || meta.shiftKey;

      if (hasMeta) {
        // @todo switch to using props.onChange instead of props.onChangeComplete
        // this will require modifying input-popover.tsx
        const newValue = {
          type: "unit" as const,
          value: handleNumericInputArrowKeys(inputValue, event),
          unit: value.unit,
        };

        onChangeComplete({ value: newValue, ...meta, type: "delta" });
      } else {
        props.onChange({
          type: "unit",
          value: handleNumericInputArrowKeys(inputValue, event),
          unit: value.unit,
        });
      }
      event.preventDefault();
    }
  };

  const handleMetaEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      isUnitsOpen ||
      (isOpen && !menuProps.empty && highlightedIndex !== -1)
    ) {
      return;
    }

    const meta = { altKey: event.altKey, shiftKey: event.shiftKey };

    if (event.key === "Enter") {
      onChangeComplete({ type: "enter", value, ...meta });
    }
  };

  const inputPropsHandleKeyDown = composeEventHandlers(
    composeEventHandlers(handleUpDownNumeric, inputProps.onKeyDown, {
      // Pass prevented events to the combobox (e.g., the Escape key doesn't work otherwise, as it's blocked by Radix)
      checkForDefaultPrevented: false,
    }),
    handleMetaEnter
  );

  return (
    <ComboboxRoot open={isOpen}>
      <Box {...getComboboxProps()}>
        <ComboboxAnchor asChild>
          <InputField
            variant={variant}
            disabled={disabled}
            aria-disabled={ariaDisabled}
            fieldSizing={fieldSizing}
            {...inputProps}
            onFocus={() => {
              const isFocused = document.activeElement === inputRef.current;
              if (isFocused) {
                inputRef.current?.select();
              }
            }}
            autoFocus={autoFocus}
            onBlur={handleOnBlur}
            onKeyDown={inputPropsHandleKeyDown}
            containerRef={disabled ? undefined : scrubRef}
            inputRef={mergeRefs(inputRef, props.inputRef ?? null)}
            name={property}
            color={value.type === "invalid" ? "error" : undefined}
            prefix={finalPrefix}
            suffix={suffix}
            css={{ cursor: "default", minWidth: "2em" }}
            text={text}
          />
        </ComboboxAnchor>
        {isOpen && (
          <ComboboxContent align="start" sideOffset={2} collisionPadding={10}>
            <ComboboxListbox {...menuProps}>
              <ComboboxScrollArea>
                {items.map((item, index) => (
                  <ComboboxListboxItem
                    {...getItemProps({ item, index })}
                    key={index}
                  >
                    {item.type === "var" ? (
                      <Flex justify="between" align="center" grow gap={2}>
                        <Box>--{item.value}</Box>
                        {item.fallback?.type === "unit" && (
                          <Text variant="small" color="subtle">
                            {toValue(item.fallback)}
                          </Text>
                        )}
                        {item.fallback?.type === "rgb" && (
                          <ColorThumb
                            color={{
                              r: item.fallback.r,
                              g: item.fallback.g,
                              b: item.fallback.b,
                              a: item.fallback.alpha,
                            }}
                          />
                        )}
                      </Flex>
                    ) : (
                      itemToString(item)
                    )}
                  </ComboboxListboxItem>
                ))}
              </ComboboxScrollArea>
              {description && (
                <ComboboxItemDescription descriptions={descriptions}>
                  <Description>{description}</Description>
                </ComboboxItemDescription>
              )}
            </ComboboxListbox>
          </ComboboxContent>
        )}
      </Box>
    </ComboboxRoot>
  );
};
