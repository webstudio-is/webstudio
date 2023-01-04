import { useState, useMemo } from "react";
import type { Unit } from "@webstudio-is/css-data";
import { properties, units } from "@webstudio-is/css-data";
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

type UnitOption = {
  id: Unit;
  label: string;
};

const visibleLengthUnits = ["px", "em", "rem", "ch", "vw", "vh"] as const;

type UseUnitSelectType = {
  property: string;
  value?: Unit;
  onChange: (value: Unit) => void;
  onCloseAutoFocus: (event: Event) => void;
};

export const useUnitSelect = ({
  property,
  value,
  onChange,
  onCloseAutoFocus,
}: UseUnitSelectType): [boolean, JSX.Element | null] => {
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo(() => {
    const options: UnitOption[] = [];
    const { unitGroups } = properties[property as keyof typeof properties];
    for (const unitGroup of unitGroups) {
      if (unitGroup === "number") {
        options.push({ id: "number", label: "—" });
        continue;
      }
      const visibleUnits =
        unitGroup === "length" ? visibleLengthUnits : units[unitGroup];
      for (const unit of visibleUnits) {
        options.push({ id: unit, label: unit.toLocaleUpperCase() });
      }
    }
    return options;
  }, [property]);

  if (
    options.length === 0 ||
    // hide unit select when value cannot have units
    (options.length === 1 && options[0].id === "number")
  ) {
    return [isOpen, null];
  }

  const select = (
    <UnitSelect
      value={value ?? options[0].id}
      options={options}
      open={isOpen}
      onCloseAutoFocus={onCloseAutoFocus}
      onOpenChange={setIsOpen}
      onChange={onChange}
    />
  );

  return [isOpen, select];
};

const StyledTrigger = styled(TextFieldIconButton, textStyles, {
  px: 3,
});

type UnitSelectProps = {
  options: Array<UnitOption>;
  value: string;
  onChange: (value: Unit) => void;
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
  const matchedOption = options.find((item) => item.id === value);
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onChange}
      onOpenChange={onOpenChange}
      open={open}
    >
      <SelectPrimitive.SelectTrigger asChild>
        <StyledTrigger variant="unit">
          <SelectPrimitive.Value>
            {/* fallback to uppercased value for not listed units */}
            {matchedOption?.label ?? value.toLocaleUpperCase()}
          </SelectPrimitive.Value>
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
            {options.map(({ id, label }) => (
              <SelectItem key={id} value={id}>
                {label}
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
