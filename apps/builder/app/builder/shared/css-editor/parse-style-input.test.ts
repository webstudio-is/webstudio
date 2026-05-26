import { describe, test, expect } from "vitest";
import { toValue } from "@webstudio-is/css-engine";
import { parseStyleInput } from "./parse-style-input";

describe("parseStyleInput", () => {
  test("parses custom property", () => {
    const { styleMap: result } = parseStyleInput("--custom-color", new Map());
    expect(result).toEqual(
      new Map([["--custom-color", { type: "unparsed", value: "" }]])
    );
  });

  test("parses longhand property", () => {
    const { styleMap: result } = parseStyleInput("color", new Map());
    expect(result).toEqual(
      new Map([["color", { type: "keyword", value: "unset" }]])
    );
  });

  test("parses shorthand property", () => {
    const { styleMap: result } = parseStyleInput("margin", new Map());
    expect(result).toEqual(
      new Map([
        ["margin-top", { type: "keyword", value: "unset" }],
        ["margin-right", { type: "keyword", value: "unset" }],
        ["margin-bottom", { type: "keyword", value: "unset" }],
        ["margin-left", { type: "keyword", value: "unset" }],
      ])
    );
  });

  test("trims whitespace", () => {
    const { styleMap: result } = parseStyleInput("  color  ", new Map());
    expect(result).toEqual(
      new Map([["color", { type: "keyword", value: "unset" }]])
    );
  });

  test("handles unparsable regular property", () => {
    const { styleMap: result } = parseStyleInput("notapro perty", new Map());
    expect(result).toEqual(new Map());
  });

  test("converts unknown property to custom property assuming user forgot to add --", () => {
    const { styleMap: result } = parseStyleInput("notaproperty", new Map());
    expect(result).toEqual(
      new Map([["--notaproperty", { type: "unparsed", value: "" }]])
    );
  });

  test("parses single property-value pair", () => {
    const { styleMap: result } = parseStyleInput("color: red", new Map());
    expect(result).toEqual(
      new Map([["color", { type: "keyword", value: "red" }]])
    );
  });

  test("parses transition timing functions", () => {
    const parseTimingFunction = (value: string) => {
      const { styleMap } = parseStyleInput(
        `transition-timing-function: ${value}`,
        new Map()
      );
      const parsedValue = styleMap.get("transition-timing-function");
      expect(parsedValue).toBeDefined();
      return toValue(parsedValue!);
    };

    expect(parseTimingFunction("cubic-bezier(.36,0,.66,-0.56)")).toEqual(
      "cubic-bezier(0.36, 0, 0.66, -0.56)"
    );
    expect(parseTimingFunction("steps(4, jump-start)")).toEqual(
      "steps(4, jump-start)"
    );
    expect(parseTimingFunction("linear(0 0%, 1 100%)")).toEqual(
      "linear(0 0%,1 100%)"
    );
  });

  test("parses multiple property-value pairs", () => {
    const { styleMap: result } = parseStyleInput(
      "color: red; display: block",
      new Map()
    );
    expect(result).toEqual(
      new Map([
        ["color", { type: "keyword", value: "red" }],
        ["display", { type: "keyword", value: "block" }],
      ])
    );
  });

  test("parses multiple property-value pairs, one is invalid", () => {
    const { styleMap: result } = parseStyleInput(
      "color: red; somethinginvalid: block",
      new Map()
    );
    expect(result).toEqual(
      new Map([
        ["color", { type: "keyword", value: "red" }],
        ["--somethinginvalid", { type: "unparsed", value: "block" }],
      ])
    );
  });

  test("parses custom property with value", () => {
    const { styleMap: result } = parseStyleInput(
      "--custom-color: red",
      new Map()
    );
    expect(result).toEqual(
      new Map([["--custom-color", { type: "unparsed", value: "red" }]])
    );
  });

  test("handles malformed style block", () => {
    const { styleMap: result } = parseStyleInput(
      "color: red; invalid;",
      new Map()
    );
    expect(result).toEqual(
      new Map([["color", { type: "keyword", value: "red" }]])
    );
  });

  test("output property with invalid value", () => {
    const { styleMap: result } = parseStyleInput("rotate: z 0;", new Map());
    expect(result).toEqual(
      new Map([["rotate", { type: "invalid", value: "z 0" }]])
    );
  });

  test("keeps expanded -webkit-text-stroke longhands as regular properties", () => {
    const { styleMap: result } = parseStyleInput(
      "-webkit-text-stroke: 1px red",
      new Map()
    );
    expect(result).toEqual(
      new Map([
        [
          "-webkit-text-stroke-width",
          {
            type: "unit",
            unit: "px",
            value: 1,
          },
        ],
        [
          "-webkit-text-stroke-color",
          {
            type: "keyword",
            value: "red",
          },
        ],
      ])
    );
  });
});
