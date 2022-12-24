import type { Style, StyleValue, StyleProperty } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import type { InheritedStyle } from "./style-source";
import { isValid } from "./parse-css-value";

export const isNumericString = (input: string) =>
  String(input).trim().length !== 0 && isNaN(Number(input)) === false;

// @todo expose which instance we inherited the value from
export const getFinalValue = ({
  currentStyle,
  inheritedStyle,
  property,
}: {
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  property: StyleProperty;
}): StyleValue | undefined => {
  const currentValue = currentStyle[property];
  const inheritedValue = inheritedStyle[property]?.value;
  if (toValue(currentValue) === "inherit" && inheritedValue !== undefined) {
    return inheritedValue;
  }
  if (currentValue?.type !== "unit" && isNumericString(toValue(currentValue))) {
    return {
      value: Number(toValue(currentValue)),
      type: "unit",
      unit: "number",
    };
  }
  if (
    currentValue &&
    currentValue.type === "unit" &&
    isValid(
      property,
      toValue({ ...currentValue, value: Math.abs(currentValue.value) })
    ) === false
  ) {
    return { value: String(currentValue.value), type: "invalid" };
  }
  return currentValue;
};
