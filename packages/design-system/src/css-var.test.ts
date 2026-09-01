import { describe, expect, test } from "vitest";
import { cssVar, declareCssVar } from "./css-var";

const verifyPublicVariableType = () => {
  cssVar("--foreground-primary");
  const componentState = declareCssVar("--component-state");
  cssVar(componentState);
  // @ts-expect-error Authoring inputs are not public component variables.
  cssVar("--theme-color-accent");
  // @ts-expect-error Private variables must be passed through declareCssVar().
  cssVar("--component-state");
  // @ts-expect-error Private variables are local, not generator-registered globals.
  cssVar("--select-button-chevron-color");
  // @ts-expect-error CSS variable declarations must use custom property syntax.
  declareCssVar("component-state");
  // @ts-expect-error Color-system namespaces are reserved for colors.css.
  declareCssVar("--foreground-component-state");
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

  test("accepts locally declared private variables", () => {
    const componentState = declareCssVar("--component-state");

    expect(cssVar(componentState)).toBe("var(--component-state)");
    expect(cssVar(componentState, "none")).toBe("var(--component-state, none)");
  });
});
