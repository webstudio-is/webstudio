import { expect, test } from "vitest";
import { parseGeneratedStyleDeclaration } from "./parse-generated-style-declaration";

test("parses emitted declarations and reports malformed ones", () => {
  expect(
    parseGeneratedStyleDeclaration({
      property: "backgroundColor",
      value: { type: "unparsed", value: "red" },
    }).declaration?.prop
  ).toBe("background-color");
  expect(
    parseGeneratedStyleDeclaration({
      property: "content",
      value: { type: "unparsed", value: '"a; } b"' },
    }).errors
  ).toEqual([]);
  const valid = parseGeneratedStyleDeclaration({
    property: "color",
    value: { type: "unparsed", value: "red /* comment */" },
  });
  expect(valid.errors).toEqual([]);
  expect(valid.declaration?.prop).toBe("color");

  const invalid = parseGeneratedStyleDeclaration({
    property: "color",
    value: { type: "unparsed", value: "red; width: 10px" },
  });
  expect(invalid.declaration).toBeUndefined();
  expect(invalid.errors.length).toBeGreaterThan(0);
  for (const property of [
    "--pE--_WitxzZqY_3KruPxn-\\ \\>\\ \\.figma-block-translate",
    "color",
  ]) {
    const value = property === "color" ? "red } a { width: 10px" : "none";
    const result = parseGeneratedStyleDeclaration({
      property,
      value: { type: "unparsed", value },
    });
    expect(result.declaration).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
  }
});
