import { detectFont } from "detect-font";
import {
  type Style,
  type StyleValue,
  type Unit,
  keywordValues,
} from "@webstudio-is/css-data";
import { properties, units } from "@webstudio-is/css-data";

const unitsList = Object.values(units).flat();
const unitRegex = new RegExp(`${unitsList.join("|")}`);

// @todo use a parser
const parseValue = (
  property: keyof typeof properties,
  value: string
): StyleValue => {
  const number = Number.parseFloat(value);
  const parsedUnit = unitRegex.exec(value);
  if (value === "rgba(0, 0, 0, 0)") {
    value = "transparent";
  }
  if (Number.isNaN(number)) {
    const values = keywordValues[
      property as keyof typeof keywordValues
    ] as ReadonlyArray<string>;

    if (values?.includes(value)) {
      return {
        type: "keyword",
        value: value,
      };
    }

    return {
      type: "unparsed",
      value: value,
    };
  }

  if (number === 0 && property in properties) {
    return properties[property].initial;
  }

  if (parsedUnit === null) {
    return {
      type: "unit",
      unit: "number",
      value: number,
    };
  }

  return {
    type: "unit",
    unit: parsedUnit[0] as Unit,
    value: number,
  };
};

export const getBrowserStyle = (element?: Element): Style => {
  const browserStyle: Style = {};
  if (element === undefined) {
    return browserStyle;
  }
  let knownProperty: keyof typeof properties;
  const computedStyle = getComputedStyle(element);
  for (knownProperty in properties) {
    if (knownProperty in computedStyle === false) {
      continue;
    }
    // Typescript doesn't know we can access CSSStyleDeclaration properties by keys
    const computedValue = computedStyle[knownProperty as unknown as number];
    browserStyle[knownProperty] = parseValue(knownProperty, computedValue);
  }
  // We need a single font-family that is actually rendered. Computed style will return a list of potential fonts.
  browserStyle.fontFamily = {
    type: "fontFamily",
    value: [detectFont(element)],
  };
  return browserStyle;
};
