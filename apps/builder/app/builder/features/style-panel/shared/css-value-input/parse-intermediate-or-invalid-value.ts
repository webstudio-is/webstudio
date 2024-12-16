import type {
  StyleProperty,
  StyleValue,
  InvalidValue,
} from "@webstudio-is/css-engine";
import { units, parseCssValue, cssTryParseValue } from "@webstudio-is/css-data";
import type { IntermediateStyleValue } from "./css-value-input";
import { evaluateMath } from "./evaluate-math";
import { toKebabCase } from "../keyword-utils";

const unitsList = Object.values(units).flat();

export const parseIntermediateOrInvalidValue = (
  property: StyleProperty,
  styleValue: IntermediateStyleValue | InvalidValue,
  originalValue?: string
): StyleValue => {
  let value = styleValue.value.trim();
  if (value.endsWith(";")) {
    value = value.slice(0, -1);
  }

  // When user enters a number, we don't know if its a valid unit value,
  // so we are going to parse it with a unit and if its not invalid - we take it.
  const ast = cssTryParseValue(value);

  if (ast === undefined) {
    return {
      type: "invalid",
      value: originalValue ?? value,
    };
  }

  const node =
    "children" in ast && ast.children?.size === 1
      ? ast.children.first
      : undefined;

  if (node?.type === "Number") {
    const unit = "unit" in styleValue ? styleValue.unit : undefined;

    // Use number as a fallback for custom properties
    const fallbackUnitAsString = property.startsWith("--") ? "" : "px";

    const testUnit = unit === "number" ? "" : (unit ?? fallbackUnitAsString);

    const styleInput = parseCssValue(property, `${value}${testUnit}`);

    if (styleInput.type !== "invalid") {
      return styleInput;
    }
  }

  // Probably value is already valid, use it
  let styleInput = parseCssValue(property, value);

  if (styleInput.type !== "invalid") {
    return styleInput;
  }

  if ("unit" in styleValue && styleValue.unit === "number") {
    // when unit is number some properties supports only integer
    // for example z-index
    styleInput = parseCssValue(property, `${Math.round(Number(value))}`);
    if (styleInput.type !== "invalid") {
      return styleInput;
    }

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

  // Try evaluate something like 10px + 4 or 13 + 4em
  // Try to extract/remove anything similar to unit value
  const unitRegex = new RegExp(`(?:${unitsList.join("|")})`, "g");
  let matchedUnit = value.match(unitRegex)?.[0];

  let unitlessValue = value.replace(unitRegex, "");

  // If value ends with "-" it is probably a unitless value i.e. unit = number
  if (unitlessValue.endsWith("-")) {
    unitlessValue = unitlessValue.slice(0, -1).trim();
    // If we have matched unit, use it, otherwise try unitless value
    matchedUnit = matchedUnit === undefined ? "" : matchedUnit;
  }

  // Try to evaluate math expression if possible
  const mathResult = evaluateMath(unitlessValue);

  if (mathResult != null) {
    const unit =
      matchedUnit ?? ("unit" in styleValue ? (styleValue.unit ?? "px") : "px");
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

  // Users often mistype comma instead of dot and we want to be tolerant to that.
  // We need to try replace comma with dot and then try all parsing options again.
  if (value.includes(",")) {
    return parseIntermediateOrInvalidValue(
      property,
      {
        ...styleValue,
        value: value.replace(/,/g, "."),
      },
      originalValue ?? value
    );
  }

  // If we are here it means that value can be Valid but our parseCssValue can't handle it
  // or value is invalid
  return {
    type: "invalid",
    value: originalValue ?? value,
  };
};
