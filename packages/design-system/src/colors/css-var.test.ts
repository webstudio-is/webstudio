import { describe, expect, test } from "vitest";
import { cssVar } from "./css-var";

const verifyPublicVariableType = () => {
  cssVar("--foreground-primary");
  // @ts-expect-error Authoring inputs are not public component variables.
  cssVar("--theme-accent");
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
});
