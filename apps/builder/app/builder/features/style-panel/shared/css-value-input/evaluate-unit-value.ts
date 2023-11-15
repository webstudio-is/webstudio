import { units } from "@webstudio-is/css-data";
import { evaluateMath } from "./evaluate-math";

const unitsList = Object.values(units).flat();

export const evaluateUnitValue = (
  value: string
): {
  mathResult: number | undefined;
  matchedUnit: string | undefined;
} => {
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

  return { matchedUnit, mathResult };
};
