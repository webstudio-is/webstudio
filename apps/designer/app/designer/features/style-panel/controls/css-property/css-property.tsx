import {
  Button,
  Combobox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Flex,
  IconButton,
  numericScrubControl,
  TextField,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import {
  KeywordValue,
  StyleProperty,
  StyleValue,
  Unit,
  units,
} from "@webstudio-is/react-sdk";
import { useCombobox } from "downshift";
import { KeyboardEvent, PointerEvent, useCallback, useRef } from "react";
import { PropertyIcon } from "../../shared/property-name";

const sortedUnits = units
  .slice(0)
  .sort((v) =>
    ["%", "px", "rem", "em", "ch", "vh", "vw", "hv", "vmin", "vmax"].includes(v)
      ? -1
      : 1
  );

type CssPropertyControlProps = {
  property: StyleProperty;
  value?: StyleValue;
  allowedValues?: Array<KeywordValue>;
  onChange?: (value?: StyleValue) => void;
  onChangeComplete?: (value?: StyleValue) => void;
};

export const CssPropertyControl = ({
  property,
  value,
  allowedValues = [],
  onChange,
  onChangeComplete,
}: CssPropertyControlProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleArrowUpDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // @todo: There is a bug when type === "keyword" and the user presses arrow up/dow then it's going to be displayed NaN as a value
    if (value?.type === "unit") {
      let numberValue = parseFloat(event.currentTarget.value);
      const direction = event.code === "ArrowUp" ? 1 : -1;
      let currentDelta = 1;
      if (event.shiftKey) currentDelta = 10;
      if (event.altKey) currentDelta = 0.1;
      numberValue = numberValue + currentDelta * direction;
      const roundedValue =
        numberValue % 1
          ? Number(
              numberValue.toPrecision(
                Math.abs(numberValue).toString().indexOf(".") + 2
              )
            )
          : numberValue;
      event.currentTarget.value = String(roundedValue);
      onChange?.({
        type: "unit",
        value: roundedValue,
        unit: value?.unit ?? "px",
      });
    }
  };

  const unitStateReducer = useCallback((state, actionAndChanges) => {
    const { type, changes } = actionAndChanges;
    switch (type) {
      // on item selection.
      case useCombobox.stateChangeTypes.ItemClick:
      case useCombobox.stateChangeTypes.InputKeyDownEnter:
      case useCombobox.stateChangeTypes.InputBlur:
      case useCombobox.stateChangeTypes.ControlledPropUpdatedSelectedItem: {
        if (changes.selectedItem?.type !== "unit") {
          return {
            ...changes,
            // if we had an item selected.
            ...(changes.selectedItem && {
              // we will set the input value to be empty since we display it using prefix
              inputValue: "",
            }),
          };
        }
        return changes;
      }
      case useCombobox.stateChangeTypes.InputChange: {
        // When we erased the value, we want to reset the selectedItem
        if (changes.inputValue === "") {
          return {
            ...changes,
            selectedItem: null,
          };
        }
        // If we type a number, we want to set the selectedItem to of type: "unit"
        if (!isNaN(parseFloat(changes.inputValue))) {
          return {
            ...changes,
            selectedItem: {
              type: "unit",
              value: parseFloat(changes.inputValue),
              unit: "px",
            } as StyleValue,
          };
        }
        return changes;
      }
      default:
        return changes; // otherwise business as usual.
    }
  }, []);

  return (
    <Combobox
      name={property}
      value={value}
      items={allowedValues}
      stateReducer={value?.type === "unit" ? unitStateReducer : undefined}
      itemToString={(item) => (item ? String(item.value) : "")}
      onItemSelect={(item) => {
        onChangeComplete?.(item);
      }}
      onItemHighlight={(item) => {
        onChange?.(item);
      }}
      renderTextField={({ inputProps, toggleProps }) => {
        return (
          <TextField
            {...inputProps}
            inputRef={inputRef}
            onFocus={() => {
              inputRef.current?.select();
            }}
            onKeyDown={(event) => {
              if (
                value?.type === "unit" &&
                ["ArrowUp", "ArrowDown"].includes(event.code)
              ) {
                handleArrowUpDown(event);
                return;
              }
              // Skip Backspace behavior
              if (
                value?.type === "unit" &&
                ["Backspace"].includes(event.code)
              ) {
                return;
              }
              inputProps.onKeyDown?.(event); // Call original event handler
            }}
            prefix={
              <Flex css={{ alignItems: "center" }}>
                <PropertyIcon
                  property={property}
                  label={property}
                  {...(value?.type === "unit" && {
                    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
                      Object(event.currentTarget)[Symbol.for("scrub")] ??=
                        numericScrubControl(event.currentTarget, {
                          initialValue: value.value,
                          onValueInput: (event) => {
                            onChange?.({
                              ...value,
                              value: event.value,
                            });
                          },
                          onValueChange: (event) => {
                            onChangeComplete?.({
                              ...value,
                              value: event.value,
                            });
                          },
                        });
                    },
                  })}
                />
                {value?.type !== "unit" && inputProps.prefix}
              </Flex>
            }
            suffix={
              value?.type === "invalid" ? null : value?.type === "keyword" ? (
                <IconButton {...toggleProps}>
                  <ChevronDownIcon />
                </IconButton>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {/* @ts-expect-error Type comes from the SDK :shrug: */}
                    <Button variant="ghost" size="1" css={{ px: 0 }}>
                      {value?.unit}
                    </Button>
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
                        value={String(value?.unit)}
                        onValueChange={(unit) => {
                          onChangeComplete?.(
                            value
                              ? {
                                  type: "unit",
                                  value: value.value,
                                  unit: unit as Unit,
                                }
                              : undefined
                          );
                        }}
                      >
                        {sortedUnits.map((unit) => {
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
              )
            }
          />
        );
      }}
    />
  );
};
