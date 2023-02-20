import { describe, test, expect } from "@jest/globals";
import { parseIntermediateOrInvalidValue } from "./parse-intermediate-or-invalid-value";

const properties = ["width", "lineHeight", "backgroundPositionX"] as const;

const propertiesAndKeywords = [
  ["width", "auto"],
  ["lineHeight", "normal"],
  ["backgroundPositionX", "center"],
] as const;

describe("Parse intermediate or invalid value without math evaluation", () => {
  test("not lost unit value", () => {
    for (const propery of properties) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "intermediate",
        value: "10",
        unit: "em",
      });

      expect(result).toEqual({
        type: "unit",
        value: 10,
        unit: "em",
      });
    }
  });

  test("fallback to px", () => {
    for (const propery of properties) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "intermediate",
        value: "10",
      });

      expect(result).toEqual({
        type: "unit",
        value: 10,
        unit: "px",
      });
    }
  });

  test("switch on new unit if previous not known", () => {
    for (const propery of properties) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "intermediate",
        value: "10rem",
      });

      expect(result).toEqual({
        type: "unit",
        value: 10,
        unit: "rem",
      });
    }
  });

  test("switch on new unit if previous present", () => {
    for (const propery of properties) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "intermediate",
        value: "10rem",
        unit: "em",
      });

      expect(result).toEqual({
        type: "unit",
        value: 10,
        unit: "rem",
      });
    }
  });

  test("accept keywords", () => {
    for (const [propery, keyword] of propertiesAndKeywords) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "intermediate",
        value: keyword,
        unit: "em",
      });

      expect(result).toEqual({
        type: "keyword",
        value: keyword,
      });
    }
  });
});

describe("Parse intermediate or invalid value with math evaluation", () => {
  test("not lost unit value", () => {
    for (const propery of properties) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "intermediate",
        value: "10+10",
        unit: "em",
      });

      expect(result).toEqual({
        type: "unit",
        value: 20,
        unit: "em",
      });
    }
  });

  test("fallback to px", () => {
    for (const propery of properties) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "intermediate",
        value: "10 + 10",
      });

      expect(result).toEqual({
        type: "unit",
        value: 20,
        unit: "px",
      });
    }
  });

  test("switch on new unit if previous not known", () => {
    for (const propery of properties) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "intermediate",
        value: "10rem + 15px",
      });

      expect(result).toEqual({
        type: "unit",
        value: 25,
        unit: "rem",
      });
    }
  });

  test("switch on new unit if previous present", () => {
    for (const propery of properties) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "intermediate",
        value: "10rem + 15",
        unit: "em",
      });

      expect(result).toEqual({
        type: "unit",
        value: 25,
        unit: "rem",
      });
    }
  });
});

describe("Parse invalid", () => {
  test("fallback to px", () => {
    for (const propery of properties) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "invalid",
        value: "10",
      });

      expect(result).toEqual({
        type: "unit",
        value: 10,
        unit: "px",
      });
    }
  });

  test("switch on new unit if previous not known", () => {
    for (const propery of properties) {
      const result = parseIntermediateOrInvalidValue(propery, {
        type: "invalid",
        value: "10rem + 15px",
      });

      expect(result).toEqual({
        type: "unit",
        value: 25,
        unit: "rem",
      });
    }
  });
});

describe("Returns invalid if can't parse", () => {
  test("do not accept unknown units", () => {
    const result = parseIntermediateOrInvalidValue("width", {
      type: "intermediate",
      value: "10ee",
    });

    expect(result).toEqual({
      type: "invalid",
      value: "10ee",
    });
  });

  test("do not accept wrong keywords", () => {
    const result = parseIntermediateOrInvalidValue("lineHeight", {
      type: "intermediate",
      value: "auto",
    });

    expect(result).toEqual({
      type: "invalid",
      value: "auto",
    });
  });
});

describe("Value ending with `-` should be considered unitless", () => {
  test("Unitless intermediate transformed to unitless", () => {
    const result = parseIntermediateOrInvalidValue("lineHeight", {
      type: "intermediate",
      value: "10-",
    });

    expect(result).toEqual({
      type: "unit",
      value: 10,
      unit: "number",
    });
  });

  test("Unit intermediate transformed to unitless", () => {
    const result = parseIntermediateOrInvalidValue("lineHeight", {
      type: "intermediate",
      value: "10-",
      unit: "em",
    });

    expect(result).toEqual({
      type: "unit",
      value: 10,
      unit: "number",
    });
  });

  test("Unit intermediate with space transformed to unitless", () => {
    const result = parseIntermediateOrInvalidValue("lineHeight", {
      type: "intermediate",
      value: "10 -",
      unit: "em",
    });

    expect(result).toEqual({
      type: "unit",
      value: 10,
      unit: "number",
    });
  });

  test("Unit number intermediate transformed to unitless", () => {
    const result = parseIntermediateOrInvalidValue("lineHeight", {
      type: "intermediate",
      value: "10",
      unit: "number",
    });

    expect(result).toEqual({
      type: "unit",
      value: 10,
      unit: "number",
    });
  });

  test("Unitless expression transformed to unitless", () => {
    const result = parseIntermediateOrInvalidValue("lineHeight", {
      type: "intermediate",
      value: "10 + 20 -",
      unit: "px",
    });

    expect(result).toEqual({
      type: "unit",
      value: 30,
      unit: "number",
    });
  });

  test("Expression containing unit and unitless must be a unit", () => {
    const result = parseIntermediateOrInvalidValue("lineHeight", {
      type: "intermediate",
      value: "10px + 20 -",
      unit: "px",
    });

    expect(result).toEqual({
      type: "unit",
      value: 30,
      unit: "px",
    });
  });

  test("top with 0 should be unitless", () => {
    const result = parseIntermediateOrInvalidValue("top", {
      type: "intermediate",
      value: "0-",
      unit: "em",
    });

    expect(result).toEqual({
      type: "unit",
      value: 0,
      unit: "number",
    });
  });

  test("top with value 10 should have unit px", () => {
    const result = parseIntermediateOrInvalidValue("top", {
      type: "intermediate",
      value: "10",
      unit: "number",
    });

    expect(result).toEqual({
      type: "unit",
      value: 10,
      unit: "px",
    });
  });
});

describe("Colors", () => {
  test("color with value rgba(0,0,0,0)", () => {
    const result = parseIntermediateOrInvalidValue("color", {
      type: "intermediate",
      value: "rgba(10,20,30,0.5)",
    });

    expect(result).toEqual({
      type: "rgb",
      alpha: 0.5,
      r: 10,
      g: 20,
      b: 30,
    });
  });

  test("color with value rgba(0,0,0,0)", () => {
    const result = parseIntermediateOrInvalidValue("color", {
      type: "intermediate",
      value: "rgba(10,20,30,0.5)",
      unit: "px",
    });

    expect(result).toEqual({
      type: "rgb",
      alpha: 0.5,
      r: 10,
      g: 20,
      b: 30,
    });
  });
});
