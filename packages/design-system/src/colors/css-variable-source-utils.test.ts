import { describe, expect, test } from "vitest";
import {
  getUniqueCssVariableNames,
  parseCssVariableDeclarations,
} from "./css-variable-source-utils";

describe("CSS variable declarations", () => {
  test("collects literal declarations from TypeScript", () => {
    expect(
      parseCssVariableDeclarations({
        source: "component.tsx",
        code: `
          const state = declareCssVar("--component-state");
          const text = "declareCssVar('ignored')";
        `,
      })
    ).toEqual([{ name: "--component-state", source: "component.tsx" }]);
  });

  test("rejects declarations that cannot be statically registered", () => {
    expect(() =>
      parseCssVariableDeclarations({
        source: "component.ts",
        code: `declareCssVar(variableName)`,
      })
    ).toThrow("declareCssVar() requires a string literal");
  });

  test("rejects duplicate and reserved declarations", () => {
    expect(() =>
      getUniqueCssVariableNames({
        declarations: [
          { name: "--component-state", source: "first.ts" },
          { name: "--component-state", source: "second.ts" },
        ],
        reservedNames: new Set(),
      })
    ).toThrow("Duplicate CSS variable declaration --component-state");

    expect(() =>
      getUniqueCssVariableNames({
        declarations: [
          { name: "--foreground-primary", source: "component.ts" },
        ],
        reservedNames: new Set(["--foreground-primary"]),
      })
    ).toThrow("conflicts with colors.css");
  });
});
