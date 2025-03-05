import { describe, test, expect } from "vitest";
import { parseStyleInput } from "./parse-style-input";

describe("parseStyleInput", () => {
  test("parses custom property", () => {
    const result = parseStyleInput("--custom-color");
    expect(result).toEqual(
      new Map([["--custom-color", { type: "keyword", value: "unset" }]])
    );
  });

  test("parses longhand property", () => {
    const result = parseStyleInput("color");
    expect(result).toEqual(
      new Map([["color", { type: "keyword", value: "unset" }]])
    );
  });

  test("parses shorthand property", () => {
    const result = parseStyleInput("margin");
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
    const result = parseStyleInput("  color  ");
    expect(result).toEqual(
      new Map([["color", { type: "keyword", value: "unset" }]])
    );
  });

  test("handles unparsable regular property", () => {
    const result = parseStyleInput("notapro perty");
    expect(result).toEqual(new Map());
  });

  test("converts unknown property to custom property assuming user forgot to add --", () => {
    const result = parseStyleInput("notaproperty");
    expect(result).toEqual(
      new Map([["--notaproperty", { type: "keyword", value: "unset" }]])
    );
  });

  test("parses single property-value pair", () => {
    const result = parseStyleInput("color: red");
    expect(result).toEqual(
      new Map([["color", { type: "keyword", value: "red" }]])
    );
  });

  test("parses multiple property-value pairs", () => {
    const result = parseStyleInput("color: red; display: block");
    expect(result).toEqual(
      new Map([
        ["color", { type: "keyword", value: "red" }],
        ["display", { type: "keyword", value: "block" }],
      ])
    );
  });

  test("parses multiple property-value pairs, one is invalid", () => {
    const result = parseStyleInput("color: red; somethinginvalid: block");
    expect(result).toEqual(
      new Map([
        ["color", { type: "keyword", value: "red" }],
        ["--somethinginvalid", { type: "unparsed", value: "block" }],
      ])
    );
  });

  test("parses custom property with value", () => {
    const result = parseStyleInput("--custom-color: red");
    expect(result).toEqual(
      new Map([["--custom-color", { type: "unparsed", value: "red" }]])
    );
  });

  test("handles malformed style block", () => {
    const result = parseStyleInput("color: red; invalid;");
    expect(result).toEqual(
      new Map([["color", { type: "keyword", value: "red" }]])
    );
  });
});
