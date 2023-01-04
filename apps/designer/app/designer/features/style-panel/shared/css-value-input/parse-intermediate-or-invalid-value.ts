import type {
  StyleProperty,
  StyleValue,
  InvalidValue,
} from "@webstudio-is/css-data";
import type { IntermediateStyleValue } from "./css-value-input";
import { parseCssValue } from "../parse-css-value";
import { evaluateMath } from "./evaluate-math";
import { units } from "@webstudio-is/css-data";
import { toKebabCase } from "../keyword-utils";

const unitsList = Object.values(units).flat();

export const parseIntermediateOrInvalidValue = (
  property: StyleProperty,
  value: IntermediateStyleValue | InvalidValue
): StyleValue => {
  // Try value with existing or fallback unit
  const unit = "unit" in value ? value.unit ?? "px" : "px";
  let styleInput = parseCssValue(property, `${value.value}${unit}`);

  if (styleInput.type !== "invalid") {
    return styleInput;
  }

  // Probably value is already valid, use it
  styleInput = parseCssValue(property, value.value);

  if (styleInput.type !== "invalid") {
    return styleInput;
  }

  // Probably in kebab-case value will be valid
  styleInput = parseCssValue(property, toKebabCase(value.value));

  if (styleInput.type !== "invalid") {
    return styleInput;
  }

  // Try evaluate something like 10px + 4 or 13 + 4em

  // Try to extract/remove anything similar to unit value
  const unitRegex = new RegExp(`(?:${unitsList.join("|")})`, "g");
  const matchedUnit = value.value.match(unitRegex)?.[0];
  const unitlessValue = value.value.replace(unitRegex, "");

  // Try to evaluate math expression if possible
  const mathResult = evaluateMath(unitlessValue);

  if (mathResult != null) {
    const unit = matchedUnit ?? ("unit" in value ? value.unit ?? "px" : "px");
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

  // If we are here it means that value can be Valid but our parseCssValue can't handle it
  // or value is invalid
  return {
    type: "invalid",
    value: value.value,
  };
};
