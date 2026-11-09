import { expect, test } from "vitest";
import type { StyleDecl } from "@webstudio-is/sdk";
import { parseGeneratedStyleDeclaration, writableStyles } from "./styles";

const style = (property: string, value = "none"): StyleDecl => ({
  styleSourceId: "source",
  breakpointId: "base",
  property: property as StyleDecl["property"],
  value: { type: "unparsed", value },
});

test("parses CSS emitted from a saved style", () => {
  expect(
    parseGeneratedStyleDeclaration(style("backgroundColor", "red"))
  ).toEqual({
    declaration: { property: "background-color", value: "red" },
    errors: [],
  });
  expect(
    parseGeneratedStyleDeclaration(style("content", '"a; } b"')).errors
  ).toEqual([]);
  expect(
    parseGeneratedStyleDeclaration(style("color", "red /* comment */")).errors
  ).toEqual([]);
});

test("accepts escaped CSS properties that can be served without bundler parsing", () => {
  expect(
    parseGeneratedStyleDeclaration(
      style("--pE--_WitxzZqY_3KruPxn-\\ \\>\\ \\.figma-block-translate")
    ).errors
  ).toEqual([]);
});

test("rejects CSS values that create additional declarations or rules", () => {
  for (const [property, value] of [
    ["color", "red; width: 10px"],
    ["color", "red } a { width: 10px"],
  ]) {
    const result = parseGeneratedStyleDeclaration(style(property, value));
    expect(result.declaration).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
  }
});

test("rejects malformed writable style maps", () => {
  const invalid = style("color", "red; width: 10px");
  expect(
    writableStyles.safeParse(new Map([["invalid", invalid]])).success
  ).toBe(false);
  expect(
    writableStyles.safeParse(new Map([["valid", style("color", "red")]]))
      .success
  ).toBe(true);
});
