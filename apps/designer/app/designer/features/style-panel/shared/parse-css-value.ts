import hyphenate from "hyphenate-style-name";
import type { StyleProperty, StyleValue, Unit } from "@webstudio-is/css-data";
import { units } from "@webstudio-is/css-data";

const unitRegex = new RegExp(`${[...units, "number"].join("|")}`);

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

// If expression is a math expression, evaluates it.
// Otherwise returns undefined.
const evaluateMath = (expression: string) => {
  if (/^[\d\s.+*/-]+$/.test(expression) === false) {
    return undefined;
  }
  try {
    // Eval is safe here because of the regex above
    const result = eval(`(${expression})`);
    if (typeof result === "number") {
      return result;
    }
  } catch (err) {
    return undefined;
  }
};

// - 2+2px
// - 2*2
const evaluate = (input: string, parsedUnit: [Unit] | null) => {
  const result = evaluateMath(
    parsedUnit === null ? input : input.replace(parsedUnit[0], "")
  );

  if (result !== undefined) {
    return result;
  }

  const number = parseFloat(input);
  return isNaN(number) ? undefined : number;
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
  if (number === undefined) {
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
