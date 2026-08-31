import { describe, expect, test } from "vitest";
import { cssVar, declareCssVar } from "./css-var";

const verifyPublicVariableType = () => {
  cssVar("--foreground-primary");
  declareCssVar("--select-button-chevron-color");
  cssVar("--select-button-chevron-color");
  // @ts-expect-error Authoring inputs are not public component variables.
  cssVar("--theme-color-accent");
  // @ts-expect-error Component variables must be explicitly declared.
  cssVar("--component-state");
  // @ts-expect-error CSS variable declarations must use custom property syntax.
  declareCssVar("component-state");
};
void verifyPublicVariableType;

describe("cssVar", () => {
  test("uses native CSS variable syntax", () => {
    expect(cssVar("--foreground-primary")).toBe("var(--foreground-primary)");
    expect(cssVar("--foreground-primary", "currentColor")).toBe(
      "var(--foreground-primary, currentColor)"
    );
    expect(
      cssVar("--foreground-primary", cssVar("--foreground-secondary"))
    ).toBe("var(--foreground-primary, var(--foreground-secondary))");
  });

  test("accepts globally declared component variables", () => {
    expect(cssVar("--select-button-chevron-color")).toBe(
      "var(--select-button-chevron-color)"
    );
    expect(cssVar("--select-button-chevron-color", "none")).toBe(
      "var(--select-button-chevron-color, none)"
    );
  });
});
