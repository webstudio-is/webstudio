import { describe, expect, test } from "vitest";
import type { StyleValue } from "@webstudio-is/css-engine";
import { __testing__ } from "./background-content";

const { detectBackgroundType } = __testing__;

describe("detectBackgroundType", () => {
  test("returns image when style value undefined", () => {
    expect(detectBackgroundType(undefined)).toBe("image");
  });

  test("returns image for keyword none", () => {
    const value: StyleValue = { type: "keyword", value: "none" };
    expect(detectBackgroundType(value)).toBe("image");
  });

  test("returns image for url image value", () => {
    const value: StyleValue = {
      type: "image",
      value: { type: "url", url: "https://example.com/image.png" },
    };
    expect(detectBackgroundType(value)).toBe("image");
  });

  test("returns linearGradient for linear gradient", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "linear-gradient(red, blue)",
    };
    expect(detectBackgroundType(value)).toBe("linearGradient");
  });

  test("returns conicGradient for conic gradient", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "conic-gradient(red, blue)",
    };
    expect(detectBackgroundType(value)).toBe("conicGradient");
  });

  test("returns image for unsupported gradient types", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "unsupported-gradient(circle, red, blue)",
    };
    expect(detectBackgroundType(value)).toBe("image");
  });
});
