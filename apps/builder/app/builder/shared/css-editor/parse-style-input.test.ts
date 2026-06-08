import { describe, test, expect } from "vitest";
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
    expect(
      parseStyleInput(
        "transition-timing-function: cubic-bezier(.36,0,.66,-0.56)",
        new Map()
      ).styleMap
    ).toEqual(
      new Map([
        [
          "transition-timing-function",
          {
            type: "layers",
            value: [
              {
                type: "function",
                name: "cubic-bezier",
                args: {
                  type: "layers",
                  value: [
                    { type: "unit", value: 0.36, unit: "number" },
                    { type: "unit", value: 0, unit: "number" },
                    { type: "unit", value: 0.66, unit: "number" },
                    { type: "unit", value: -0.56, unit: "number" },
                  ],
                },
              },
            ],
          },
        ],
      ])
    );

    expect(
      parseStyleInput(
        "transition-timing-function: steps(4, jump-start)",
        new Map()
      ).styleMap
    ).toEqual(
      new Map([
        [
          "transition-timing-function",
          {
            type: "layers",
            value: [
              {
                type: "function",
                name: "steps",
                args: {
                  type: "layers",
                  value: [
                    { type: "unit", value: 4, unit: "number" },
                    { type: "keyword", value: "jump-start" },
                  ],
                },
              },
            ],
          },
        ],
      ])
    );

    expect(
      parseStyleInput(
        "transition-timing-function: linear(0 0%, 1 100%)",
        new Map()
      ).styleMap
    ).toEqual(
      new Map([
        [
          "transition-timing-function",
          {
            type: "layers",
            value: [{ type: "unparsed", value: "linear(0 0%,1 100%)" }],
          },
        ],
      ])
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

  test("does not parse malformed custom property values", () => {
    const { styleMap: result } = parseStyleInput("--test: #sd'", new Map());
    expect(result).toEqual(new Map());
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
