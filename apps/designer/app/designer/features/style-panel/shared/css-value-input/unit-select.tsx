import { useState, useMemo } from "react";
import type { Unit, UnitValue, StyleValue } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectViewport,
  SelectItem,
  SelectContent,
  TextFieldIconButton,
  styled,
  textStyles,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, ChevronUpIcon } from "@webstudio-is/icons";
import { isValid } from "../parse-css-value";
import type { IntermediateStyleValue } from "../css-value-input";

const unitRenderMap: Map<Unit, string> = new Map([
  ["px", "PX"],
  ["%", "%"],
  ["em", "EM"],
  ["rem", "REM"],
  ["ch", "CH"],
  ["vw", "VW"],
  ["vh", "VH"],
  ["number", "—"],
]);

const renderUnitMap: Map<string, Unit> = new Map();
for (const [key, value] of unitRenderMap.entries()) {
  renderUnitMap.set(value, key);
}

const defaultUnits = Array.from(unitRenderMap.keys());

type UseUnitSelectType = {
  property: string;
  value?: UnitValue | IntermediateStyleValue;
  onChange: (value: StyleValue | IntermediateStyleValue) => void;
  units?: Array<Unit>;
  onCloseAutoFocus: (event: Event) => void;
};

export const useUnitSelect = ({
  property,
  onChange,
  value,
  units = defaultUnits,
  ...props
}: UseUnitSelectType): [boolean, JSX.Element | null] => {
  const [isOpen, setIsOpen] = useState(false);

  const renderUnits = useMemo(
    () =>
      value &&
      units
        .filter((unit) => {
          if (value.type === "intermediate") {
            if (value.unit !== undefined) {
              // check that property is valid for any positive number like 1 during editing
              return isValid(
                property,
                toValue({ type: "unit", unit, value: 1 })
              );
            }
            return false;
          }

          return isValid(property, toValue({ ...value, unit }));
        })
        .map((unit) => unitRenderMap.get(unit) ?? unit),
    [units, property, value]
  );

  const renderValue =
    value?.unit !== undefined ? unitRenderMap.get(value.unit) : undefined;

  if (
    value === undefined ||
    renderUnits === undefined ||
    renderValue === undefined ||
    renderUnits.length < 2
  ) {
    return [isOpen, null];
  }

  const select = (
    <UnitSelect
      {...props}
      value={renderValue}
      options={renderUnits}
      open={isOpen}
      onOpenChange={setIsOpen}
      onChange={(option) => {
        const unit = renderUnitMap.get(option);
        if (unit === undefined) {
          return;
        }
        onChange?.({
          ...value,
          unit,
        });
      }}
    />
  );

  return [isOpen, select];
};

const StyledTrigger = styled(TextFieldIconButton, textStyles, {
  px: 3,
});

type UnitSelectProps = {
  options: Array<string>;
  value: string;
  onChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  open: boolean;
};

const UnitSelect = ({
  options,
  value,
  onChange,
  onOpenChange,
  onCloseAutoFocus,
  open,
}: UnitSelectProps) => {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onChange}
      onOpenChange={onOpenChange}
      open={open}
    >
      <SelectPrimitive.SelectTrigger asChild>
        <StyledTrigger variant="unit">
          <SelectPrimitive.Value>{value}</SelectPrimitive.Value>
        </StyledTrigger>
      </SelectPrimitive.SelectTrigger>
      <SelectPrimitive.Portal>
        <SelectContent
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={() => {
            // We need to use onEscapeKeyDown and close explicitly as we prevented default at onKeyDown
            // We can't prevent this event here as it's too late and the non-prevented event is already dispatched
            // to the ancestors
            onOpenChange(false);
          }}
          onKeyDown={(event) => {
            // Prevent Esc key to be processed at the parent Component
            if (event.key === "Escape") {
              event.preventDefault();
            }
          }}
        >
          <SelectScrollUpButton>
            <ChevronUpIcon />
          </SelectScrollUpButton>
          <SelectViewport>
            {options.map((option) => (
              <SelectItem key={option} value={option} textValue={option}>
                {option}
              </SelectItem>
            ))}
          </SelectViewport>
          <SelectScrollDownButton>
            <ChevronDownIcon />
          </SelectScrollDownButton>
        </SelectContent>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
};
