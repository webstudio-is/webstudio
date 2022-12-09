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
