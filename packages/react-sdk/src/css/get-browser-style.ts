import type { Style, StyleProperty, StyleValue, Unit } from "./types";
import { properties } from "./properties";
import { units } from "./units";

const unitRegex = new RegExp(`${units.join("|")}`);

// @todo use a parser
const parseValue = (property: StyleProperty, value: string): StyleValue => {
  const number = parseFloat(value);
  const parsedUnit = unitRegex.exec(value);
  if (value === "rgba(0, 0, 0, 0)") value = "transparent";
  if (isNaN(number) || parsedUnit === null) {
    return {
      type: "keyword",
      value,
    };
  }

  if (number === 0) {
    return properties[property].initial;
  }

  return {
    type: "unit",
    unit: parsedUnit[0] as Unit,
    value: number,
  };
};

export const getBrowserStyle = (element?: Element): Style => {
  const browserStyle: Style = {};
  if (element === undefined) return browserStyle;
  let knownProperty: StyleProperty;
  const computedStyle = getComputedStyle(element);
  for (knownProperty in properties) {
    if (knownProperty in computedStyle === false) continue;
    // @ts-ignore Typescript doesn't know we can access CSSStyleDeclaration properties by keys
    const computedValue = computedStyle[knownProperty];
    browserStyle[knownProperty] = parseValue(knownProperty, computedValue);
  }
  return browserStyle;
};
