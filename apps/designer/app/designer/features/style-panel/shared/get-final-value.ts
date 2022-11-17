import type { Style, StyleValue, StyleProperty } from "@webstudio-is/react-sdk";
import { toValue } from "@webstudio-is/css-engine";
import type { InheritedStyle } from "./get-inherited-style";
import { isValid } from "./parse-css-value";

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
  const inheritedValue =
    property in inheritedStyle ? inheritedStyle[property].value : undefined;
  if (currentValue?.value === "inherit" && inheritedValue !== undefined) {
    return inheritedValue;
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
