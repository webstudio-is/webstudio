import { describe, test, expect } from "@jest/globals";
import { evaluateUnitValue } from "./evaluate-unit-value";

describe("Evalute Unit Value", () => {
  test("should evaluate string values with units 10px + 5px", () => {
    const { mathResult, matchedUnit } = evaluateUnitValue("10px + 5px");
    expect(mathResult).toEqual(15);
    expect(matchedUnit).toEqual("px");
  });

  test("should evaluate string values with units 10px - 5rem", () => {
    const { mathResult, matchedUnit } = evaluateUnitValue("10px - 5rem");
    expect(mathResult).toEqual(5);
    expect(matchedUnit).toEqual("px");
  });
});
