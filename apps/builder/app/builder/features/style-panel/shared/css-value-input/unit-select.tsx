import { useState, useMemo, type ComponentProps } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import type { Unit } from "@webstudio-is/css-engine";
import {
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectViewport,
  SelectItem,
  SelectContent,
  NestedInputButton,
  nestedSelectButtonUnitless,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, ChevronUpIcon } from "@webstudio-is/icons";
import type { CssValueInputValue } from "./css-value-input";
import { buildOptions } from "./unit-select-options";

export type UnitOption =
  | {
      id: Unit;
      label: string;
      type: "unit";
    }
  | { id: string; label: string; type: "keyword" };

type UseUnitSelectType = {
  property: string;
  value: CssValueInputValue;
  size: ComponentProps<typeof NestedInputButton>["size"];
  onChange: (
    value: { type: "unit"; value: Unit } | { type: "keyword"; value: string }
  ) => void;
  onCloseAutoFocus: (event: Event) => void;
};

export const useUnitSelect = ({
  property,
  value,
  size,
  onChange,
  onCloseAutoFocus,
}: UseUnitSelectType): [boolean, JSX.Element | null] => {
  const [isOpen, setIsOpen] = useState(false);

  const unit =
    value.type === "unit" || value.type === "intermediate"
      ? value.unit
      : undefined;

  const options = useMemo(
    () => buildOptions(property, value, nestedSelectButtonUnitless),
    [property, value]
  );

  if (options.length === 0) {
    return [isOpen, null];
  }

  const unitOrKeyword: string | undefined =
    unit ?? (value.type === "keyword" ? value.value : undefined);

  const select = (
    <UnitSelect
      size={size}
      value={unitOrKeyword}
      label={unit ?? nestedSelectButtonUnitless}
      options={options}
      open={isOpen}
      onCloseAutoFocus={onCloseAutoFocus}
      onOpenChange={setIsOpen}
      onChange={(unitOption) => {
        if (unitOption.type === "keyword") {
          onChange({ type: "keyword", value: unitOption.id });
          return;
        }

        onChange({ type: "unit", value: unitOption.id });
      }}
    />
  );

  return [isOpen, select];
};

type UnitSelectProps = {
  options: Array<UnitOption>;
  value?: string | undefined;
  label?: string | undefined;
  onChange: (value: UnitOption) => void;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  open: boolean;
  size: UseUnitSelectType["size"];
};

const UnitSelect = ({
  options,
  value,
  label,
  onChange,
  onOpenChange,
  onCloseAutoFocus,
  open,
  size,
}: UnitSelectProps) => {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(value) => {
        const optionValue = options.find((option) => option.id === value);
        if (optionValue === undefined) {
          return;
        }
        onChange(optionValue);
      }}
      onOpenChange={onOpenChange}
      open={open}
    >
      <SelectPrimitive.SelectTrigger asChild>
        <NestedInputButton tabIndex={-1} size={size}>
          <SelectPrimitive.Value>
            {value === "number" ? nestedSelectButtonUnitless : label}
          </SelectPrimitive.Value>
        </NestedInputButton>
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
              <SelectItem key={id} value={id} text="sentence">
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
