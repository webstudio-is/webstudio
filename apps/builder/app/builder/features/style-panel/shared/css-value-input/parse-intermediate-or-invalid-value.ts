import type {
  StyleProperty,
  StyleValue,
  InvalidValue,
} from "@webstudio-is/css-engine";
import { units, properties, parseCssValue } from "@webstudio-is/css-data";
import type { IntermediateStyleValue } from "./css-value-input";
import { evaluateMath } from "./evaluate-math";
import { toKebabCase } from "../keyword-utils";

const unitsList = Object.values(units).flat();

export const parseIntermediateOrInvalidValue = (
  property: StyleProperty,
  styleValue: IntermediateStyleValue | InvalidValue
): StyleValue => {
  const value = styleValue.value.trim();

  if (property.startsWith("--")) {
    return {
      type: "unparsed",
      value,
    };
  }

  const valueInfo = properties[property as keyof typeof properties];

  // - When user enters a number, we don't know if its a valid unit value,
  // so we are going to parse it with a unit and if its not invalid - we take it.
  // - When value can be a custom-ident or a string - we can't do that test, because its going to be
  // valid and we will end up adding unit to a user string.
  if (
    valueInfo.types.flat().includes("string") === false &&
    valueInfo.types.flat().includes("custom-ident") === false
  ) {
    const testUnit = "unit" in styleValue ? styleValue.unit ?? "px" : "px";
    const styleInput = parseCssValue(property, `${value}${testUnit}`);

    if (styleInput.type !== "invalid") {
      return styleInput;
    }
  }

  // Probably value is already valid, use it
  let styleInput = parseCssValue(property, value);

  if (styleInput.type !== "invalid") {
    return styleInput;
  }

  if ("unit" in styleValue && styleValue.unit === "number") {
    // Most css props supports 0 as unitless value, but not other numbers.
    // Its possible that we had { value: 0, unit: "number" } and value has changed
    // Lets try to parse it as px value
    styleInput = parseCssValue(property, `${value}px`);

    if (styleInput.type !== "invalid") {
      return styleInput;
    }
  }

  // Probably in kebab-case value will be valid
  styleInput = parseCssValue(property, toKebabCase(value));

  if (styleInput.type !== "invalid") {
    return styleInput;
  }

  // Try evaluate something like 10px + 4 or 13 + 4em

  // Try to extract/remove anything similar to unit value
  const unitRegex = new RegExp(`(?:${unitsList.join("|")})`, "g");
  let matchedUnit = value.match(unitRegex)?.[0];

  let unitlessValue = value.replace(unitRegex, "");

  // If value ends with "-" it is probably a unitless value i.e. unit = number
  if (unitlessValue.endsWith("-")) {
    unitlessValue = unitlessValue.slice(0, -1).trim();
    // If we have matched unit, use it, otherwise try unitless value
    matchedUnit = matchedUnit === undefined ? "" : matchedUnit;
  }

  // Try to evaluate math expression if possible
  const mathResult = evaluateMath(unitlessValue);

  if (mathResult != null) {
    const unit =
      matchedUnit ?? ("unit" in styleValue ? styleValue.unit ?? "px" : "px");
    styleInput = parseCssValue(property, `${String(mathResult)}${unit}`);

    if (styleInput.type !== "invalid") {
      return styleInput;
    }

    // If math expression is valid, use it as a value
    styleInput = parseCssValue(property, String(mathResult));

    if (styleInput.type !== "invalid") {
      return styleInput;
    }
  }

  // Last chance probably it's a color without #
  styleInput = parseCssValue(property, `#${value}`);

  if (styleInput.type !== "invalid") {
    return styleInput;
  }

  // If we are here it means that value can be Valid but our parseCssValue can't handle it
  // or value is invalid
  return {
    type: "invalid",
    value: value,
  };
};
