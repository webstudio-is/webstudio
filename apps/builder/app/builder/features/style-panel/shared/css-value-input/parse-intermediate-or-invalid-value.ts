import type {
  StyleProperty,
  StyleValue,
  InvalidValue,
} from "@webstudio-is/css-engine";
import type { IntermediateStyleValue } from "./css-value-input";
import { parseCssValue } from "@webstudio-is/css-data";
import { toKebabCase } from "../keyword-utils";
import { evaluateUnitValue } from "./evaluate-unit-value";

export const parseIntermediateOrInvalidValue = (
  property: StyleProperty,
  styleValue: IntermediateStyleValue | InvalidValue
): StyleValue => {
  const value = styleValue.value.trim();

  // Try value with existing or fallback unit
  const unit = "unit" in styleValue ? styleValue.unit ?? "px" : "px";
  let styleInput = parseCssValue(property, `${value}${unit}`);

  if (styleInput.type !== "invalid") {
    return styleInput;
  }

  // Probably value is already valid, use it
  styleInput = parseCssValue(property, value);

  if (styleInput.type !== "invalid") {
    return styleInput;
  }

  if (unit === "number") {
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

  const { mathResult, matchedUnit } = evaluateUnitValue(value);

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
