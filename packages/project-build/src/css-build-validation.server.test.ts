import { expect, test } from "vitest";
import { canBuildCss } from "./css-build-validation.server";

test.each([
  ["a{color:red}", true],
  ["a{--p\\ \\>\\ \\.figma-block-translate:none}", true],
  ["a{color:red}}", false],
  ["a{color:rgb(1, 2, 3}", false],
  ["a{color:red/*}", false],
] as const)("checks generated CSS %s", async (css, expected) => {
  expect(await canBuildCss(css)).toBe(expected);
});
