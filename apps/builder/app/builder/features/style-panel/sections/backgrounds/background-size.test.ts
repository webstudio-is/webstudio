import { expect, test, describe } from "vitest";
import type { StyleValue } from "@webstudio-is/css-engine";
import { __testing__ } from "./background-size";

const { getSelectValue } = __testing__;

describe("background-size utilities", () => {
  describe("getSelectValue", () => {
    test("returns keyword value when styleValue is a keyword", () => {
      const styleValue: StyleValue = {
        type: "keyword",
        value: "cover",
      };
      expect(getSelectValue(styleValue)).toBe("cover");
    });

    test("returns 'custom' when styleValue is a tuple", () => {
      const styleValue: StyleValue = {
        type: "tuple",
        value: [
          { type: "keyword", value: "auto" },
          { type: "keyword", value: "auto" },
        ],
      };
      expect(getSelectValue(styleValue)).toBe("custom");
    });

    test("returns 'custom' when styleValue is a tuple with unit values", () => {
      const styleValue: StyleValue = {
        type: "tuple",
        value: [
          { type: "unit", value: 100, unit: "px" },
          { type: "unit", value: 200, unit: "px" },
        ],
      };
      expect(getSelectValue(styleValue)).toBe("custom");
    });

    test("returns 'auto' when styleValue is undefined", () => {
      expect(getSelectValue(undefined)).toBe("auto");
    });

    test("returns 'auto' for unsupported style value types", () => {
      const styleValue: StyleValue = {
        type: "invalid",
        value: "something",
      } as StyleValue;
      expect(getSelectValue(styleValue)).toBe("auto");
    });

    test("tuple type always returns 'custom' to show width/height inputs", () => {
      // This is the critical test - tuple values must always return "custom"
      // to ensure the width/height inputs are visible
      const tupleValue: StyleValue = {
        type: "tuple",
        value: [
          { type: "unit", value: 50, unit: "%" },
          { type: "keyword", value: "auto" },
        ],
      };

      const selectValue = getSelectValue(tupleValue);

      // This assertion prevents the bug where tuple values were treated as "auto"
      expect(selectValue).toBe("custom");
      expect(selectValue).not.toBe("auto");
    });
  });
});
