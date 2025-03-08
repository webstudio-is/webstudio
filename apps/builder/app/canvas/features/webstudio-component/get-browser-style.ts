import type {
  CssProperty,
  Style,
  StyleValue,
  Unit,
} from "@webstudio-is/css-engine";
import { camelCaseProperty, keywordValues } from "@webstudio-is/css-data";
import { propertiesData, units } from "@webstudio-is/css-data";

const unitsList = Object.values(units).flat();
const unitRegex = new RegExp(`${unitsList.join("|")}`);

// @todo use a parser
const parseValue = (property: CssProperty, value: string): StyleValue => {
  const number = Number.parseFloat(value);
  const parsedUnit = unitRegex.exec(value);
  if (value === "rgba(0, 0, 0, 0)") {
    value = "transparent";
  }
  if (Number.isNaN(number)) {
    const values = keywordValues[
      camelCaseProperty(property) as keyof typeof keywordValues
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

  if (number === 0 && propertiesData[property]) {
    return propertiesData[property].initial;
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
  let knownProperty: CssProperty;
  const computedStyle = getComputedStyle(element);
  for (knownProperty in propertiesData) {
    if (knownProperty in computedStyle === false) {
      continue;
    }
    // Typescript doesn't know we can access CSSStyleDeclaration properties by keys
    const computedValue = computedStyle.getPropertyValue(knownProperty);
    browserStyle[camelCaseProperty(knownProperty)] = parseValue(
      knownProperty,
      computedValue
    );
  }
  return browserStyle;
};
