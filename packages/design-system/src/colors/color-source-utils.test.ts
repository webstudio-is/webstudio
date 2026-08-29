import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as csstree from "css-tree";
import { describe, expect, test } from "vitest";
import {
  getCssVariableReferences,
  parseColorSource,
} from "./color-source-utils";

const source = readFileSync(resolve("src/colors/colors.css"), "utf8");

const replaceDeclaration = ({
  css,
  selector,
  property,
  value,
}: {
  css: string;
  selector?: string;
  property: string;
  value: string;
}) => {
  const stylesheet = csstree.parse(css);
  let replacementCount = 0;
  csstree.walk(stylesheet, {
    visit: "Rule",
    enter(node) {
      if (
        node.type !== "Rule" ||
        (selector !== undefined && csstree.generate(node.prelude) !== selector)
      ) {
        return;
      }
      node.block.children.forEach((child) => {
        if (child.type !== "Declaration" || child.property !== property) {
          return;
        }
        child.value = csstree.parse(value, { context: "value" });
        replacementCount += 1;
      });
    },
  });
  expect(replacementCount).toBe(1);
  return csstree.generate(stylesheet);
};

const addRootDeclarations = (
  css: string,
  declarations: Record<string, string>
) => {
  const stylesheet = csstree.parse(css);
  let rootCount = 0;
  csstree.walk(stylesheet, {
    visit: "Rule",
    enter(node) {
      if (node.type !== "Rule" || csstree.generate(node.prelude) !== ":root") {
        return;
      }
      rootCount += 1;
      for (const [property, value] of Object.entries(declarations)) {
        node.block.children.appendData(
          csstree.parse(`${property}:${value}`, { context: "declaration" })
        );
      }
    },
  });
  expect(rootCount).toBe(1);
  return csstree.generate(stylesheet);
};

describe("Craft color CSS source", () => {
  test("parses CSS variable references with native fallback syntax", () => {
    expect(
      getCssVariableReferences(
        "linear-gradient(var(--overlay-interaction-hover), var(--overlay-interaction-hover)), var(--background-primary, oklch(50% 0 0))"
      )
    ).toEqual([
      "--overlay-interaction-hover",
      "--overlay-interaction-hover",
      "--background-primary",
    ]);
  });

  test("parses theme parameters, scheme bounds, and semantic categories", () => {
    const colors = parseColorSource(source);

    expect(Object.keys(colors.theme.color)).toHaveLength(6);
    expect(Object.keys(colors.theme.contrast)).toHaveLength(3);
    expect(Object.keys(colors.scheme.light)).toEqual(
      Object.keys(colors.scheme.dark)
    );
    expect(Object.keys(colors.derived)).toHaveLength(28);
    expect(colors.derived).toHaveProperty("focus");
    expect(Object.keys(colors.semantic)).toEqual([
      "background",
      "foreground",
      "border",
      "overlay",
    ]);
    expect(
      Object.values(colors.semantic).reduce(
        (count, category) => count + Object.keys(category).length,
        0
      )
    ).toBe(33);
    expect(colors.semantic.background).toHaveProperty("positive-subtle");
    expect(colors.semantic.background).not.toHaveProperty("accent-hover");
    expect(colors.semantic.overlay).toHaveProperty("interaction-hover");
  });

  test("derives structural groups from the CSS source", () => {
    const extendedSource = addRootDeclarations(source, {
      "--theme-color-custom": "oklch(50% 0.1 300)",
      "--color-custom":
        "oklch(from var(--theme-color-custom) var(--scheme-chromatic-luminance-max) c h)",
      "--foreground-custom":
        "color-mix(in oklab, var(--color-custom) 86%, var(--color-foreground))",
    });
    const colors = parseColorSource(extendedSource);

    expect(colors.theme.color.custom).toBe("oklch(50% 0.1 300)");
    expect(colors.derived.custom).toContain("var(--theme-color-custom)");
    expect(colors.semantic.foreground.custom).toContain("var(--color-custom)");
  });

  test("rejects standalone semantic color literals", () => {
    const invalidSource = replaceDeclaration({
      css: source,
      property: "--background-primary",
      value: "oklch(50% 0.2 250)",
    });

    expect(() => parseColorSource(invalidSource)).toThrow(
      "--background-primary must derive from another color variable"
    );
  });

  test("rejects circular semantic references", () => {
    const firstCycle = replaceDeclaration({
      css: source,
      property: "--background-primary",
      value: "var(--background-secondary)",
    });
    const cycle = replaceDeclaration({
      css: firstCycle,
      property: "--background-secondary",
      value: "var(--background-primary)",
    });

    expect(() => parseColorSource(cycle)).toThrow(
      "Circular color reference: --background-primary -> --background-secondary -> --background-primary"
    );
  });

  test.each([
    { selector: ":root", mode: "light" },
    { selector: ':root[data-color-scheme="dark"]', mode: "dark" },
  ])("rejects missing references in $mode scheme bounds", ({ selector }) => {
    const invalidSource = replaceDeclaration({
      css: source,
      selector,
      property: "--scheme-background-lightness",
      value: "var(--scheme-missing)",
    });

    expect(() => parseColorSource(invalidSource)).toThrow(
      `--scheme-background-lightness references missing variable --scheme-missing`
    );
  });
});
