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

    test("with default unit", () => {
      expect(parseCssValue("width", "10", "px")).toEqual({
        type: "unit",
        unit: "px",
        value: 10,
      });
    });

    test("with unit and default unit", () => {
      expect(parseCssValue("width", "10px", "rem")).toEqual({
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

    test("empty input with default unit", () => {
      expect(parseCssValue("width", "", "px")).toEqual({
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

    test("keyword with unit", () => {
      expect(parseCssValue("width", "autopx")).toEqual({
        type: "keyword",
        value: "autopx",
      });
    });

    test("incomplete", () => {
      // This will return invalid unit when `CSSStyleValue.parse` is available
      expect(parseCssValue("width", "10p")).toEqual({
        type: "unit",
        unit: "number",
        value: 10,
      });
    });
  });

  describe("math expression", () => {
    test("addition with unit", () => {
      expect(parseCssValue("width", "10+1px")).toEqual({
        type: "unit",
        unit: "px",
        value: 11,
      });
    });

    test("addition without unit", () => {
      expect(parseCssValue("width", "10+1", "px")).toEqual({
        type: "unit",
        unit: "px",
        value: 11,
      });
    });

    test("subtraction with unit", () => {
      expect(parseCssValue("width", "10-1px")).toEqual({
        type: "unit",
        unit: "px",
        value: 9,
      });
    });

    test("multiplication with unit", () => {
      expect(parseCssValue("width", "2*2px")).toEqual({
        type: "unit",
        unit: "px",
        value: 4,
      });
    });

    test("division with unit", () => {
      expect(parseCssValue("width", "4/2px")).toEqual({
        type: "unit",
        unit: "px",
        value: 2,
      });
    });
  });
});
