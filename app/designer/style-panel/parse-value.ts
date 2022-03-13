import hyphenate from "hyphenate-style-name";
import { units } from "@webstudio-is/sdk";
import type { Style, StyleProperty, StyleValue, Unit } from "@webstudio-is/sdk";

const unitRegex = new RegExp(`${units.join("|")}`);

const isValid = (property: string, value: string): boolean => {
  // Only browsers with houdini api will provide validation for now
  // @todo add a polyfill maybe
  if (
    // @ts-ignore TS types don't have this interface yet
    typeof CSSStyleValue === "undefined" ||
    // @ts-ignore TS types don't have this interface yet
    typeof CSSStyleValue.parse === "undefined"
  ) {
    return true;
  }

  try {
    // @ts-ignore TS types don't have this interface yet
    CSSStyleValue.parse(hyphenate(property), value);
  } catch (error) {
    return false;
  }
  return true;
};

// Helper to let user input:
// - 10
// - 10p
// - 10px > px as unit
// - empty string
// - a keyword
export const parseValue = (
  property: StyleProperty,
  input: string,
  style: Style
): StyleValue => {
  const invalidValue = {
    type: "invalid",
    value: input,
  } as const;

  if (input.length === 0) {
    return invalidValue;
  }

  const parsedUnit = unitRegex.exec(input) as [Unit] | null;
  const number = parseFloat(input);

  // If we get a unit but there is no number - we assume its an accidental
  // unit match and its a keyword value.
  if (isNaN(number) === true) {
    if (isValid(property, input)) {
      return {
        type: "keyword",
        value: input,
      } as const;
    }
    return invalidValue;
  }

  // User is in the middle of typing a unit eg. 10p
  if (parsedUnit === null && input.length > String(number).length) {
    return invalidValue;
  }

  const previousValue = style[property];
  // If user didn't enter a unit, use the previous known unit otherwise fallback to px.
  const defaultUnit: Unit =
    previousValue !== undefined && "unit" in previousValue
      ? previousValue.unit
      : "number";
  const [unit] = parsedUnit || [defaultUnit];
  if (isValid(property, input) || isValid(property, input + unit)) {
    return {
      type: "unit",
      unit,
      value: number,
    };
  }

  return invalidValue;
};
