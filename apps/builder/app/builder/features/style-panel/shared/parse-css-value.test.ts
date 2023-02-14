import { describe, test, expect } from "@jest/globals";
import { parseCssValue } from "./parse-css-value";

describe("Parse CSS value", () => {
  describe("number value", () => {
    test("unitless", () => {
      expect(parseCssValue("lineHeight", "10")).toEqual({
        type: "unit",
        unit: "number",
        value: 10,
      });
    });
  });

  describe("unit value", () => {
    test("with unit", () => {
      expect(parseCssValue("width", "10px")).toEqual({
        type: "unit",
        unit: "px",
        value: 10,
      });
    });

    test("empty input", () => {
      expect(parseCssValue("width", "")).toEqual({
        type: "invalid",
        value: "",
      });
    });
  });

  describe("keyword value", () => {
    test("keyword", () => {
      expect(parseCssValue("width", "auto")).toEqual({
        type: "keyword",
        value: "auto",
      });
    });

    test("keyword display block", () => {
      expect(parseCssValue("display", "block")).toEqual({
        type: "keyword",
        value: "block",
      });
    });

    test("keyword with unit", () => {
      expect(parseCssValue("width", "autopx")).toEqual({
        type: "invalid",
        value: "autopx",
      });
    });

    test("invalid", () => {
      // This will return px as a fallback unit, as number is not valid for width.
      expect(parseCssValue("width", "10")).toEqual({
        type: "invalid",
        value: "10",
      });

      // This will return number unit, as number is valid for aspectRatio.
      expect(parseCssValue("aspectRatio", "10")).toEqual({
        type: "unit",
        unit: "number",
        value: 10,
      });
    });
  });

  describe("Unparesd valid values", () => {
    test("Simple valid function values", () => {
      expect(parseCssValue("filter", "blur(4px)")).toEqual({
        type: "unparsed",
        value: "blur(4px)",
      });

      expect(parseCssValue("width", "calc(4px + 16em)")).toEqual({
        type: "unparsed",
        value: "calc(4px + 16em)",
      });
    });

    test("Multiple valid function values", () => {
      expect(
        parseCssValue(
          "filter",
          "blur(4px) drop-shadow(16px 16px 20px blue) opacity(25%)"
        )
      ).toEqual({
        type: "unparsed",
        value: "blur(4px) drop-shadow(16px 16px 20px blue) opacity(25%)",
      });

      expect(parseCssValue("filter", "blur(calc(4px + 16em))")).toEqual({
        type: "unparsed",
        value: "blur(calc(4px + 16em))",
      });
    });

    test("Invalid function values", () => {
      expect(parseCssValue("width", "blur(4)")).toEqual({
        type: "invalid",
        value: "blur(4)",
      });
    });
  });
});
