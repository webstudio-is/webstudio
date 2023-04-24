import { useState, useMemo } from "react";
import {
  keywordValues,
  properties,
  units,
  type Unit,
} from "@webstudio-is/css-data";
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

type UnitOption =
  | {
      id: Unit;
      label: string;
      type: "unit";
    }
  | { id: string; label: string; type: "keyword" };

// To make sorting stable
const preferedSorting = [
  "number",
  "px",
  ...units.percentage,
  "em",
  "rem",
  "dvw",
  "dvh",
  ...units.length,
  ...units.angle,
  ...units.decibel,
  ...units.flex,
  ...units.frequency,
  ...units.resolution,
  ...units.semitones,
  ...units.time,
  "auto",
  "normal",
  "none",
];

const visibleLengthUnits = ["px", "em", "rem", "dvw", "dvh"] as const;

type UseUnitSelectType = {
  property: string;
  value: CssValueInputValue;
  onChange: (
    value: { type: "unit"; value: Unit } | { type: "keyword"; value: string }
  ) => void;
  onCloseAutoFocus: (event: Event) => void;
};

export const useUnitSelect = ({
  property,
  value,
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
        options.push({
          id: "number",
          type: "unit",
          label: nestedSelectButtonUnitless,
        });
        continue;
      }

      const visibleUnits =
        unitGroup === "length" ? visibleLengthUnits : units[unitGroup];
      for (const unit of visibleUnits) {
        options.push({
          id: unit,
          type: "unit",
          label: unit.toLocaleUpperCase(),
        });
      }
    }

    // Special case for 0, which is often used as a unitless value
    const showUnitless =
      value.type === "unit" || value.type === "intermediate"
        ? isValid(property, `${value.value}`)
        : false;

    if (showUnitless && options.some((o) => o.id === "number") === false) {
      options.push({
        id: "number",
        type: "unit",
        label: nestedSelectButtonUnitless,
      });
    }

    // Add a valid unit, such as ch or vw, to the list of options, even if it's not already visible
    // This allows the currently selected unit to be displayed selected when the menu is opened
    if (
      unit !== undefined &&
      options.some((option) => option.id === unit) === false
    ) {
      options.push({
        id: unit,
        type: "unit",
        label:
          unit === "number"
            ? nestedSelectButtonUnitless
            : unit.toLocaleUpperCase(),
      });
    }

    const indexSortValue = (number: number) =>
      number === -1 ? Number.POSITIVE_INFINITY : number;

    // Use a stable sort for known dimensions, such as percentages after lengths
    // This ensures that the order of options remains consistent between renders
    options.sort(
      (optionA, optionB) =>
        indexSortValue(preferedSorting.indexOf(optionA.id)) -
        indexSortValue(preferedSorting.indexOf(optionB.id))
    );

    // This value can't have units, skip select
    // (show keywords menu instead)
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
      options.push({
        id: keyword,
        label: toPascalCase(keyword),
        type: "keyword",
      });
    }

    if (
      value.type === "keyword" &&
      options.some((option) => option.id === value.value) === false
    ) {
      options.push({
        id: value.value,
        label: toPascalCase(value.value),
        type: "keyword",
      });
    }

    return options;
  }, [property, value, unit]);

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
