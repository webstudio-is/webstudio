import { useState, useMemo } from "react";
import { keywordValues, type Unit } from "@webstudio-is/css-data";
import { properties, units } from "@webstudio-is/css-data";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectViewport,
  SelectItem,
  SelectContent,
  NestedSelectButton,
  nestedSelectButtonUnitless,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, ChevronUpIcon } from "@webstudio-is/icons";
import type { CssValueInputValue } from "./css-value-input";
import { isValid } from "../parse-css-value";
import { toPascalCase } from "../keyword-utils";

type UnitOption = {
  id: string;
  label: string;
};

// To make sorting stable
const unitPreferedSorting = [
  ...units.length,
  ...units.percentage,
  "number",
  ...units.angle,
  ...units.decibel,
  ...units.flex,
  ...units.frequency,
  ...units.resolution,
  ...units.semitones,
  ...units.time,
];

const visibleLengthUnits = ["px", "em", "rem", "dvw", "dvh"] as const;

type UseUnitSelectType = {
  property: string;
  value: CssValueInputValue;
  onChange: (value: Unit) => void;
  onCloseAutoFocus: (event: Event) => void;
};

export const useUnitSelect = ({
  property,
  value,
  // edge-case, most css properties accept unitless value 0

  onChange,
  onCloseAutoFocus,
}: UseUnitSelectType): [boolean, JSX.Element | null] => {
  const [isOpen, setIsOpen] = useState(false);

  const unit =
    value.type === "unit" || value.type === "intermediate"
      ? value.unit
      : undefined;

  const options = useMemo(() => {
    const options: UnitOption[] = [];
    const { unitGroups } = properties[property as keyof typeof properties];

    for (const unitGroup of unitGroups) {
      if (unitGroup === "number") {
        options.push({ id: "number", label: nestedSelectButtonUnitless });
        continue;
      }

      const visibleUnits =
        unitGroup === "length" ? visibleLengthUnits : units[unitGroup];
      for (const unit of visibleUnits) {
        options.push({ id: unit, label: unit.toLocaleUpperCase() });
      }
    }

    // Edge case for 0, which is often can be an unitless value
    const showUnitless =
      value.type === "unit" || value.type === "intermediate"
        ? isValid(property, `${value.value}`)
        : false;

    if (showUnitless && options.some((o) => o.id === "number") === false) {
      options.push({ id: "number", label: nestedSelectButtonUnitless });
    }

    // Add valid unit like ch or vw even if it's not in the list of visible units
    // that allows to show selected value when menu is opened
    if (
      unit !== undefined &&
      options.some((option) => option.id === unit) === false
    ) {
      options.push({
        id: unit,
        label:
          unit === "number"
            ? nestedSelectButtonUnitless
            : unit.toLocaleUpperCase(),
      });
    }

    const indexSortValue = (number: number) =>
      number === -1 ? Number.POSITIVE_INFINITY : number;

    // Use stable sort at least for known dimensions (i.e. percents after length etc)
    options.sort(
      (optionA, optionB) =>
        indexSortValue(unitPreferedSorting.indexOf(optionA.id)) -
        indexSortValue(unitPreferedSorting.indexOf(optionB.id))
    );

    // This value can't have units, skip select
    if (options.length === 0) {
      return [];
    }

    const propertyKeywordsSet = new Set(
      keywordValues[property as keyof typeof keywordValues]
    );

    // Opinionated set of keywords to show
    const webstudioKeywords = ["auto", "normal", "none"].filter((keyword) =>
      propertyKeywordsSet.has(keyword as never)
    );

    for (const keyword of webstudioKeywords) {
      options.push({ id: keyword, label: toPascalCase(keyword) });
    }

    return options;
  }, [property, value, unit]);

  // hide unit select when value cannot have units
  if (options.length === 0) {
    return [isOpen, null];
  }

  const unitOrKeyword: string | undefined =
    unit ?? (value.type === "keyword" ? value.value : undefined);

  const select = (
    <UnitSelect
      value={unitOrKeyword}
      label={unit ?? nestedSelectButtonUnitless}
      options={options}
      open={isOpen}
      onCloseAutoFocus={onCloseAutoFocus}
      onOpenChange={setIsOpen}
      onChange={onChange}
    />
  );

  return [isOpen, select];
};

type UnitSelectProps = {
  options: Array<UnitOption>;
  value?: string | undefined;
  label?: string | undefined;
  onChange: (value: Unit) => void;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  open: boolean;
};

const UnitSelect = ({
  options,
  value,
  label,
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
        <NestedSelectButton tabIndex={-1}>
          <SelectPrimitive.Value>
            {value === "number" ? nestedSelectButtonUnitless : label}
          </SelectPrimitive.Value>
        </NestedSelectButton>
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
