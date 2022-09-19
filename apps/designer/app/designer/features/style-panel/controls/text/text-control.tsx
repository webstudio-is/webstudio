import { FocusEvent, PointerEvent, useCallback } from "react";
import {
  Box,
  Text,
  IconButton,
  TextField,
  Combobox,
  numericScrubControl,
} from "@webstudio-is/design-system";
import { getFinalValue } from "../../shared/get-final-value";
import { ControlProps } from "../../style-sections";
import { units } from "@webstudio-is/react-sdk";
import { ChevronDownIcon } from "@webstudio-is/icons";
import { PropertyIcon } from "../../shared/property-name";

const sortedUnits = units
  .slice(0)
  .sort((v) =>
    ["%", "px", "rem", "em", "ch", "vh", "vw", "hv", "vmin", "vmax"].includes(v)
      ? -1
      : 1
  );

export const TextControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  const getInputNode = (node: HTMLElement): HTMLInputElement => {
    return node
      .closest("[data-control]")
      ?.querySelector("input") as HTMLInputElement;
  };
  const isExpanded = (node: HTMLElement) => {
    return node
      .closest("[data-control]")
      ?.querySelector("[aria-expanded=true]");
  };

  const numericScrubRefCallback = useCallback(
    (node: HTMLButtonElement) => {
      if (!value) return;
      const id = Symbol.for("numericScrubControl");
      if (!node) return Object(node)[id]?.disconnectedCallback();
      if (value.type !== "unit") return;
      if (Object(node)[id]) return;
      Object(node)[id] = numericScrubControl(node, {
        initialValue: value.value,
        onValueChange: (event) => {
          getInputNode(node).value = String(event.value);
          handleChange("unit", event.value, true);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  const items =
    value.type === "unit"
      ? sortedUnits.map((unit) => ({ name: unit, label: unit }))
      : styleConfig.items;
  const handleChange = (
    type: string,
    item: string | number | undefined,
    isEphemeral: boolean
  ) => {
    if (!item) return;
    const newValue =
      type === "unit" ? value.value + String(item) : String(item);
    setValue(value.type === "unit" ? newValue + value.unit : newValue, {
      isEphemeral,
    });
  };

  return (
    <Combobox
      name={styleConfig.property}
      items={items.map((item) => item.label)}
      value={String(value.value)}
      selected={String(value.type === "unit" ? value.unit : value.value)}
      onItemSelect={(item) => {
        handleChange(value.type, item, false);
      }}
      onItemHighlight={(item) => {
        handleChange(value.type, item, true);
      }}
      renderTextField={({ inputProps, toggleProps }) => {
        return (
          <Box css={{ position: "relative" }}>
            <PropertyIcon
              property={styleConfig.property}
              label={styleConfig.label}
              {...(value.type === "unit" && {
                onPointerUp: (event: PointerEvent<HTMLInputElement>) => {
                  setValue(String(getInputNode(event.target).value));
                },
                ref: numericScrubRefCallback,
              })}
            />
            <TextField
              {...inputProps}
              css={{
                cursor: "default",
                height: "calc($sizes$5 + $sizes$1)",
                fontWeight: "500",
                paddingLeft: "calc($sizes$4 / 2)",
              }}
              onFocus={(event: FocusEvent<HTMLInputElement>) => {
                event.target.select();
              }}
              onBlur={(event) => {
                if (event.target.value !== event.target.getAttribute("value"))
                  setValue(event.target.value);
              }}
              onKeyDown={(event) => {
                const target = event.target as HTMLInputElement;
                if (
                  event.code === "Enter" &&
                  String(value.value) !== target.value
                ) {
                  setValue(target.value);
                  const number = parseFloat(target.value);
                  if (!isNaN(number)) target.value = String(number);
                }
                if (isExpanded(target)) return inputProps?.onKeyDown?.(event);
                if (value.type !== "unit")
                  return inputProps?.onKeyDown?.(event);
                if (!["ArrowUp", "ArrowDown"].includes(event.code)) return;
                event.preventDefault();
                let currentValue = parseFloat(target.value);
                let currentDelta = 1;
                if (event.shiftKey) currentDelta = 10;
                if (event.altKey) currentDelta = 0.1;
                if (event.code === "ArrowUp")
                  currentValue = currentValue + currentDelta;
                if (event.code === "ArrowDown")
                  currentValue = currentValue - currentDelta;
                const currentValueAsString =
                  currentValue % 1
                    ? currentValue.toPrecision(
                        Math.abs(currentValue).toString().indexOf(".") + 2
                      )
                    : String(currentValue);
                target.value = currentValueAsString;
                setValue(currentValueAsString, { isEphemeral: true });
              }}
            />
            <IconButton
              {...toggleProps}
              css={{
                visibility: items.length ? "visible" : "hidden",
                position: "absolute",
                right: "1px",
                top: "1px",
                width: "auto",
                height: "calc(100% - 2px)",
                px: "calc($1 / 2)",
                borderRadius: "$1",
                border: "2px solid $colors$loContrast",
                "&:focus": {
                  outline: "none",
                },
              }}
            >
              {value.type === "unit" ? (
                <Text
                  css={{
                    cursor: "default",
                    minWidth: "calc($sizes$3 - $nudge$1)",
                    textAlign: "center",
                    fontSize: "calc($fontSizes$1 - $nudge$1)",
                  }}
                >
                  {value.unit === "number" ? "—" : value.unit}
                </Text>
              ) : (
                <ChevronDownIcon />
              )}
            </IconButton>
          </Box>
        );
      }}
    />
  );
};
