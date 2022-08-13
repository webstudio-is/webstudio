import type { Style, StyleValue, StyleProperty } from "@webstudio-is/react-sdk";
import type { InheritedStyle } from "./get-inherited-style";

// @todo expose which instance we inherited the value from
const getFinalValue = ({
  currentStyle,
  inheritedStyle,
  property,
}: {
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  property: StyleProperty;
}): StyleValue | void => {
  const currentValue = currentStyle[property];
  const inheritedValue =
    property in inheritedStyle ? inheritedStyle[property].value : undefined;
  if (currentValue?.value === "inherit" && inheritedValue !== undefined) {
    return inheritedValue;
  }
  return currentValue;
};

export { getFinalValue };
