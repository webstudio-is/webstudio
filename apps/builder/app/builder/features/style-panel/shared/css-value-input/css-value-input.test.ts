import { describe, test, expect } from "vitest";
import { __testing__ } from "./css-value-input";
const { getItemColor } = __testing__;

describe("getItemColor", () => {
  test("returns undefined for non-color keyword", () => {
    expect(getItemColor({ type: "keyword", value: "auto" })).toBeUndefined();
    expect(getItemColor({ type: "keyword", value: "flex" })).toBeUndefined();
  });

  test("returns the keyword value for a named color keyword", () => {
    expect(getItemColor({ type: "keyword", value: "red" })).toBe("red");
    expect(getItemColor({ type: "keyword", value: "transparent" })).toBe(
      "transparent"
    );
  });

  test("returns undefined for non-color var fallback types", () => {
    expect(
      getItemColor({
        type: "var",
        value: "spacing",
        fallback: { type: "unit", value: 8, unit: "px" },
      })
    ).toBeUndefined();
    expect(
      getItemColor({
        type: "var",
        value: "display",
        fallback: { type: "keyword", value: "flex" },
      })
    ).toBeUndefined();
  });

  test("returns color string for rgb var fallback", () => {
    expect(
      getItemColor({
        type: "var",
        value: "brand",
        fallback: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
      })
    ).toBe("rgb(255 0 0 / 1)");
  });

  test("returns color string for color var fallback", () => {
    const result = getItemColor({
      type: "var",
      value: "brand",
      fallback: {
        type: "color",
        colorSpace: "srgb",
        components: [1, 0, 0],
        alpha: 1,
      },
    });
    expect(result).toMatch(/rgb/);
  });

  test("returns value for unparsed var fallback that is a valid color", () => {
    expect(
      getItemColor({
        type: "var",
        value: "brand",
        fallback: { type: "unparsed", value: "red" },
      })
    ).toBe("red");
  });

  test("returns undefined for unparsed var fallback that is not a color", () => {
    expect(
      getItemColor({
        type: "var",
        value: "spacing",
        fallback: { type: "unparsed", value: "1rem" },
      })
    ).toBeUndefined();
  });

  test("returns value for keyword var fallback that is a named color", () => {
    expect(
      getItemColor({
        type: "var",
        value: "brand",
        fallback: { type: "keyword", value: "red" },
      })
    ).toBe("red");
  });

  test("returns undefined for var without fallback", () => {
    expect(getItemColor({ type: "var", value: "brand" })).toBeUndefined();
  });

  test("returns undefined for unit item", () => {
    expect(
      getItemColor({ type: "unit", value: 16, unit: "px" })
    ).toBeUndefined();
  });
});
