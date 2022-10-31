import hyphenate from "hyphenate-style-name";
import { units } from "@webstudio-is/react-sdk";
import type { StyleProperty, StyleValue, Unit } from "@webstudio-is/react-sdk";

const unitRegex = new RegExp(
  `${(units as unknown as string[]).concat("number").join("|")}`
);

export const isValid = (property: string, value: string): boolean => {
  // Only browsers with houdini api will provide validation for now
  // @todo add a polyfill maybe
  if (
    typeof CSSStyleValue === "undefined" ||
    typeof CSSStyleValue.parse === "undefined"
  ) {
    return true;
  }

  try {
    CSSStyleValue.parse(hyphenate(property), value);
  } catch (error) {
    return false;
  }
  return true;
};

// wtf?
// eslint-disable-next-line no-useless-escape
const mathRegex = /[\+\-\*\/]/;

// - 2+2px
// - 2*2
const evaluate = (input: string, parsedUnit: [Unit] | null) => {
  const parsed = parseFloat(input);
  // If its not a number, it can't be a math expression.
  if (isNaN(parsed)) return parsed;

  // It's a math expression
  if (mathRegex.test(input)) {
    // Get rid of the unit
    if (parsedUnit !== null) {
      input = input.replace(parsedUnit[0], "");
    }
    try {
      return eval(`(${input})`);
    } catch (err) {
      return parsed;
    }
  }

  return parsed;
};

// Helper to let user input:
// - 10
// - 10p
// - 10px > px as unit
// - empty string
// - a keyword
export const parseCssValue = (
  property: StyleProperty,
  input: string,
  defaultUnit?: Unit
): StyleValue => {
  const invalidValue = {
    type: "invalid",
    value: input,
  } as const;
  if (input.length === 0) {
    return invalidValue;
  }

  const parsedUnit = unitRegex.exec(input) as [Unit] | null;
  const number = evaluate(input, parsedUnit);

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

  // If user didn't enter a unit, use the previous known unit otherwise fallback to px.
  const fallbackUnit: Unit = defaultUnit ?? "number";
  const [unit] = parsedUnit || [fallbackUnit];

  return {
    type: "unit",
    unit: isValid(property, number + unit.replace("number", "")) ? unit : "px",
    value: number,
  };
};
