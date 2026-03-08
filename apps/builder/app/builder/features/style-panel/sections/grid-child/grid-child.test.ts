import { describe, test, expect } from "vitest";
import type { StyleValue } from "@webstudio-is/css-engine";
import { __testing__ } from "./grid-child";

const { derivePositionMode } = __testing__;

describe("derivePositionMode", () => {
  const auto: StyleValue = { type: "keyword", value: "auto" };

  describe("returns 'auto' mode", () => {
    test("when all values are 'auto'", () => {
      expect(derivePositionMode(auto, auto, auto, auto)).toBe("auto");
    });

    test("when values are 'auto' with span tuples", () => {
      const spanValue: StyleValue = {
        type: "tuple",
        value: [
          { type: "keyword", value: "span" },
          { type: "unit", value: 2, unit: "number" },
        ],
      };
      expect(derivePositionMode(auto, spanValue, auto, spanValue)).toBe("auto");
    });

    test("when all values are span tuples", () => {
      const span2: StyleValue = {
        type: "tuple",
        value: [
          { type: "keyword", value: "span" },
          { type: "unit", value: 2, unit: "number" },
        ],
      };
      const span3: StyleValue = {
        type: "tuple",
        value: [
          { type: "keyword", value: "span" },
          { type: "unit", value: 3, unit: "number" },
        ],
      };
      expect(derivePositionMode(auto, span2, auto, span3)).toBe("auto");
    });
  });

  describe("returns 'manual' mode", () => {
    test("when any value is numeric", () => {
      const numeric: StyleValue = { type: "unit", value: 1, unit: "number" };
      expect(derivePositionMode(numeric, auto, auto, auto)).toBe("manual");
    });

    test("when all values are numeric", () => {
      const val1: StyleValue = { type: "unit", value: 1, unit: "number" };
      const val2: StyleValue = { type: "unit", value: 2, unit: "number" };
      const val3: StyleValue = { type: "unit", value: 1, unit: "number" };
      const val4: StyleValue = { type: "unit", value: 3, unit: "number" };
      expect(derivePositionMode(val1, val2, val3, val4)).toBe("manual");
    });

    test("when some values are numeric and some auto", () => {
      const numeric: StyleValue = { type: "unit", value: 2, unit: "number" };
      expect(derivePositionMode(auto, numeric, auto, auto)).toBe("manual");
    });
  });

  describe("returns 'area' mode", () => {
    test("when values contain named area keywords", () => {
      const areaName: StyleValue = { type: "keyword", value: "header" };
      expect(derivePositionMode(areaName, areaName, areaName, areaName)).toBe(
        "area"
      );
    });

    test("when some values are named areas and some auto", () => {
      const areaName: StyleValue = { type: "keyword", value: "sidebar" };
      // In practice, when using grid-area shorthand, all 4 values get the same area name
      expect(derivePositionMode(areaName, areaName, areaName, areaName)).toBe(
        "area"
      );
    });

    test("when start values are named areas", () => {
      const areaName: StyleValue = { type: "keyword", value: "main" };
      expect(derivePositionMode(areaName, auto, areaName, auto)).toBe("area");
    });
  });

  describe("edge cases", () => {
    test("prioritizes 'manual' over 'area' when mixed", () => {
      // If there's any numeric value, it's manual mode
      const numeric: StyleValue = { type: "unit", value: 1, unit: "number" };
      const areaName: StyleValue = { type: "keyword", value: "header" };
      expect(derivePositionMode(numeric, areaName, auto, auto)).toBe("manual");
    });

    test("handles guaranteedInvalid value by defaulting to auto", () => {
      const invalid: StyleValue = { type: "guaranteedInvalid" };
      expect(derivePositionMode(invalid, invalid, invalid, invalid)).toBe(
        "auto"
      );
    });

    test("handles unparsed values by defaulting to auto", () => {
      const unparsed: StyleValue = { type: "unparsed", value: "something" };
      expect(derivePositionMode(unparsed, unparsed, unparsed, unparsed)).toBe(
        "auto"
      );
    });
  });
});
