import type { CssValueInputValue } from "./css-value-input";
import { toPascalCase } from "../keyword-utils";
import {
  keywordValues,
  properties,
  units,
  isValidDeclaration,
} from "@webstudio-is/css-data";
import type { UnitOption } from "./unit-select";
import type { StyleProperty } from "@webstudio-is/css-engine";

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
];

const visibleLengthUnits = ["px", "em", "rem", "dvw", "dvh"] as const;

/*
The boxShadow property is interdependent on other values of the proeprty,and cannot function in isolation.
Therefore, employing keywords for this property in UnitSelect mode is not valid.

Consequently, when utilized in Unit-only mode for properties with such interdependencies,
it is advisable not to display keyword-values as options.
This precaution is necessary as the use of keywords in this context can lead to
the generation of invalid values.
*/
const propertiesToIgnoreOptinionatedKewords: StyleProperty[] = ["boxShadow"];

export const buildOptions = (
  property: string,
  value: CssValueInputValue,
  nestedSelectButtonUnitless: string
) => {
  const unit =
    value.type === "unit" || value.type === "intermediate"
      ? value.unit
      : undefined;

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
      ? isValidDeclaration(property, `${value.value}`)
      : false;

  if (
    showUnitless &&
    options.some((option) => option.id === "number") === false
  ) {
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
  if (propertiesToIgnoreOptinionatedKewords.includes(property) === false) {
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
};
