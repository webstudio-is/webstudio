import { expect, test } from "vitest";
import type { StyleDecl } from "@webstudio-is/sdk";
import { isValidGeneratedStyleDeclaration, writableStyles } from "./styles";

const style = (property: string, value = "none"): StyleDecl => ({
  styleSourceId: "source",
  breakpointId: "base",
  property: property as StyleDecl["property"],
  value: { type: "unparsed", value },
});

test("accepts normal declarations and escaped content", () => {
  expect(
    isValidGeneratedStyleDeclaration(style("backgroundColor", "red"))
  ).toBe(true);
  expect(isValidGeneratedStyleDeclaration(style("content", '"a; } b"'))).toBe(
    true
  );
});

test("rejects CSS that the publish parser cannot read as one declaration", () => {
  expect(
    isValidGeneratedStyleDeclaration(
      style("--pE--_WitxzZqY_3KruPxn-\\ \\>\\ \\.figma-block-translate")
    )
  ).toBe(false);
  expect(
    isValidGeneratedStyleDeclaration(style("color", "red; width: 10px"))
  ).toBe(false);
  expect(
    isValidGeneratedStyleDeclaration(style("color", "red } a { width: 10px"))
  ).toBe(false);
});

test("rejects malformed writable style maps", () => {
  const invalid = style(
    "--pE--_WitxzZqY_3KruPxn-\\ \\>\\ \\.figma-block-translate"
  );
  expect(
    writableStyles.safeParse(new Map([["invalid", invalid]])).success
  ).toBe(false);
  expect(
    writableStyles.safeParse(new Map([["valid", style("color", "red")]]))
      .success
  ).toBe(true);
});
