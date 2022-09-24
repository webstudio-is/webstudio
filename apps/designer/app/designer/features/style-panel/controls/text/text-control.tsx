import { FocusEvent, KeyboardEvent, useRef, useCallback } from "react";
import {
  Box,
  Text,
  IconButton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuRadioItem,
  DropdownMenuRadioGroup,
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

  const inputRef = useRef<HTMLInputElement | null>(null);

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
          if (inputRef.current) inputRef.current.value = String(event.value);
          handleChange("unit", event.value, true);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  const items = styleConfig.items.map(({ label }) => label);
  const units = sortedUnits.map((unit) => unit);
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
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    handleKeyDownEnter(event);
    if (event.currentTarget.matches("[aria-activedescendant]")) return true;
    if (value.type !== "unit") return true;
    if (!["ArrowUp", "ArrowDown"].includes(event.code)) return false;
    event.preventDefault();
    handleKeyDownArrowUpDown(event);
  };
  const handleKeyDownEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.code === "Enter" &&
      String(value.value) !== event.currentTarget.value
    ) {
      setValue(event.currentTarget.value);
      const number = parseFloat(event.currentTarget.value);
      if (!isNaN(number)) event.currentTarget.value = String(number);
    }
  };
  const handleKeyDownArrowUpDown = (event: KeyboardEvent<HTMLInputElement>) => {
    let currentValue = parseFloat(event.target.value);
    let currentDelta = 1;
    if (event.shiftKey) currentDelta = 10;
    if (event.altKey) currentDelta = 0.1;
    if (event.code === "ArrowUp") currentValue = currentValue + currentDelta;
    if (event.code === "ArrowDown") currentValue = currentValue - currentDelta;
    const currentValueAsString =
      currentValue % 1
        ? currentValue.toPrecision(
            Math.abs(currentValue).toString().indexOf(".") + 2
          )
        : String(currentValue);
    event.target.value = currentValueAsString;
    setValue(currentValueAsString, { isEphemeral: true });
  };

  return (
    <Combobox
      name={styleConfig.property}
      items={items}
      value={String(value.value)}
      onItemSelect={(item) => {
        handleChange(value.type, item, false);
      }}
      onItemHighlight={(item) => {
        handleChange(value.type, item, true);
      }}
      renderTextField={({ inputProps, toggleProps }) => {
        return (
          <Box css={{ position: "relative" }}>
            <TextField
              {...inputProps}
              inputRef={inputRef}
              onFocus={(event: FocusEvent<HTMLInputElement>) => {
                event.currentTarget.select();
              }}
              onBlur={(event) => {
                if (
                  event.currentTarget.value !==
                  event.currentTarget.getAttribute("value")
                )
                  setValue(event.currentTarget.value);
              }}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (handleKeyDown(event)) inputProps?.onKeyDown?.(event);
              }}
              prefix={
                <PropertyIcon
                  property={styleConfig.property}
                  label={styleConfig.label}
                  {...(value.type === "unit" && {
                    onPointerUp: () => {
                      setValue(String(inputRef.current?.value));
                    },
                    ref: numericScrubRefCallback,
                  })}
                />
              }
              suffix={
                <IconButton
                  {...(value.type !== "unit" && toggleProps)}
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
                  {value.type !== "unit" ? (
                    <ChevronDownIcon />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
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
                      </DropdownMenuTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuContent
                          sideOffset={14}
                          collisionPadding={16}
                          side="bottom"
                          css={{
                            minWidth: 124,
                            maxHeight: 190,
                          }}
                        >
                          <DropdownMenuRadioGroup
                            value={String(value.unit)}
                            onValueChange={(unit) =>
                              handleChange("unit", unit, false)
                            }
                          >
                            {units.map((unit) => {
                              return (
                                <DropdownMenuRadioItem key={unit} value={unit}>
                                  {unit}
                                </DropdownMenuRadioItem>
                              );
                            })}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenuPortal>
                    </DropdownMenu>
                  )}
                </IconButton>
              }
            />
          </Box>
        );
      }}
    />
  );
};
