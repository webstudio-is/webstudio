import { describe, test, expect } from "vitest";
import { parseStyleInput } from "./parse-style-input";

describe("parseStyleInput", () => {
  test("parses custom property", () => {
    const result = parseStyleInput("--custom-color");
    expect(result).toEqual([
      {
        selector: "selector",
        property: "--custom-color",
        value: { type: "unset", value: "" },
      },
    ]);
  });

  test("parses regular property", () => {
    const result = parseStyleInput("color");
    expect(result).toEqual([
      {
        selector: "selector",
        property: "color",
        value: { type: "unset", value: "" },
      },
    ]);
  });

  test("trims whitespace", () => {
    const result = parseStyleInput("  color  ");
    expect(result).toEqual([
      {
        selector: "selector",
        property: "color",
        value: { type: "unset", value: "" },
      },
    ]);
  });

  test("handles invalid regular property", () => {
    const result = parseStyleInput("notapro perty");
    expect(result).toEqual([]);
  });

  test("converts unknown property to custom property assuming user forgot to add --", () => {
    const result = parseStyleInput("notaproperty");
    expect(result).toEqual([
      {
        selector: "selector",
        property: "--notaproperty",
        value: { type: "unset", value: "" },
      },
    ]);
  });

  test("parses single property-value pair", () => {
    const result = parseStyleInput("color: red");
    expect(result).toEqual([
      {
        selector: "selector",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("parses multiple property-value pairs", () => {
    const result = parseStyleInput("color: red; display: block");
    expect(result).toEqual([
      {
        selector: "selector",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
      {
        selector: "selector",
        property: "display",
        value: { type: "keyword", value: "block" },
      },
    ]);
  });

  test("parses custom property with value", () => {
    const result = parseStyleInput("--custom-color: red");
    expect(result).toEqual([
      {
        selector: "selector",
        property: "--custom-color",
        value: { type: "unparsed", value: "red" },
      },
    ]);
  });

  test("handles malformed style block", () => {
    const result = parseStyleInput("color: red; invalid;");
    expect(result).toEqual([
      {
        selector: "selector",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });
});
