import { describe, test, expect } from "@jest/globals";
import { convertUnits } from "./convert-units";

const unitSizes = {
  ch: 8,
  vw: 3.2,
  vh: 4.8,
  em: 14,
  rem: 16,
  px: 1,
};

describe("Evaluate math", () => {
  test("convert same units", () => {
    expect(convertUnits(unitSizes)(100, "px", "px")).toEqual(100);
    expect(convertUnits(unitSizes)(100, "deg", "deg")).toEqual(100);
  });

  test("do nothing if can't convert", () => {
    expect(convertUnits(unitSizes)(100, "deg", "rad")).toEqual(100);
  });

  test("convert size units", () => {
    expect(convertUnits(unitSizes)(224, "px", "em")).toEqual(16);
    expect(convertUnits(unitSizes)(16, "em", "px")).toEqual(224);

    expect(convertUnits(unitSizes)(16, "em", "rem")).toEqual(14);
    expect(convertUnits(unitSizes)(14, "rem", "em")).toEqual(16);

    expect(convertUnits(unitSizes)(320, "px", "vw")).toEqual(100);
    expect(convertUnits(unitSizes)(480, "px", "vh")).toEqual(100);

    expect(convertUnits(unitSizes)(100, "vw", "rem")).toEqual(20);
  });
});
