import { useState, useMemo } from "react";
import { type Unit, type UnitValue, StyleValue } from "@webstudio-is/react-sdk";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  styled,
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectViewport,
  SelectItem,
  SelectContent,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, ChevronUpIcon } from "@webstudio-is/icons";

const unitRenderMap: Map<Unit, string> = new Map([
  ["px", "PX"],
  ["%", "%"],
  ["em", "EM"],
  ["rem", "REM"],
  ["ch", "CH"],
  ["vw", "VW"],
  ["vh", "VH"],
  ["number", "-"],
]);

const renderUnitMap: Map<string, Unit> = new Map();
for (const [key, value] of unitRenderMap.entries()) {
  renderUnitMap.set(value, key);
}

const defaultUnits = Array.from(unitRenderMap.keys());

type UseUnitSelectType = {
  value?: UnitValue;
  onChange: (value: StyleValue) => void;
  units?: Array<Unit>;
  onCloseAutoFocus: (event: Event) => void;
};

export const useUnitSelect = ({
  onChange,
  value,
  units = defaultUnits,
  ...props
}: UseUnitSelectType) => {
  const [isOpen, setIsOpen] = useState(false);
  const renderUnits = useMemo(
    () => units.map((unit) => unitRenderMap.get(unit) ?? unit),
    [units]
  );

  const renderValue = value && unitRenderMap.get(value.unit);

  if (value == undefined || renderValue === undefined) {
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
        if (unit === undefined) return;
        onChange?.({
          ...value,
          unit,
        });
      }}
    />
  );

  return [isOpen, select];
};

const StyledTrigger = styled(SelectPrimitive.SelectTrigger, {
  all: "unset",
  height: "$5",
  px: "$1",
  borderRadius: 2,
  display: "inline-flex",
  alignItems: "center",
  color: "$hiContrast",
  "&:focus": {
    backgroundColor: "$blue10",
    color: "$loContrast",
  },
  "&:hover": {
    backgroundColor: "$slate6",
  },
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
      <StyledTrigger>
        <SelectPrimitive.Value>{value}</SelectPrimitive.Value>
      </StyledTrigger>
      <SelectPrimitive.Portal>
        <SelectContent onCloseAutoFocus={onCloseAutoFocus}>
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
