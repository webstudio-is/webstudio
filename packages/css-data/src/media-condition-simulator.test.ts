import { describe, test, expect } from "vitest";
import { parseMediaCondition } from "./media-condition-simulator";

describe("parseMediaCondition", () => {
  test("parses simple condition without parentheses", () => {
    const result = parseMediaCondition("prefers-color-scheme:dark");
    expect(result).toEqual({ feature: "prefers-color-scheme", value: "dark" });
  });

  test("parses condition with parentheses", () => {
    const result = parseMediaCondition("(prefers-color-scheme: dark)");
    expect(result).toEqual({ feature: "prefers-color-scheme", value: "dark" });
  });

  test("parses width condition", () => {
    const result = parseMediaCondition("min-width:768px");
    expect(result).toEqual({ feature: "min-width", value: "768px" });
  });

  test("parses hover condition", () => {
    const result = parseMediaCondition("hover:none");
    expect(result).toEqual({ feature: "hover", value: "none" });
  });

  test("parses orientation condition", () => {
    const result = parseMediaCondition("orientation:portrait");
    expect(result).toEqual({ feature: "orientation", value: "portrait" });
  });

  test("normalizes feature and value to lowercase", () => {
    const result = parseMediaCondition("Prefers-Color-Scheme:DARK");
    expect(result).toEqual({ feature: "prefers-color-scheme", value: "dark" });
  });

  test("handles spaces around colon", () => {
    const result = parseMediaCondition("prefers-color-scheme : dark");
    expect(result).toEqual({ feature: "prefers-color-scheme", value: "dark" });
  });

  test("returns undefined for invalid condition", () => {
    expect(parseMediaCondition("invalid")).toBeUndefined();
    expect(parseMediaCondition("")).toBeUndefined();
    expect(parseMediaCondition(":::")).toBeUndefined();
  });
});
