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
  property,
  value,
}: {
  css: string;
  property: string;
  value: string;
}) => {
  const stylesheet = csstree.parse(css);
  let replacementCount = 0;
  csstree.walk(stylesheet, {
    visit: "Declaration",
    enter(node) {
      if (node.type !== "Declaration") {
        return;
      }
      if (node.property !== property) {
        return;
      }
      node.value = csstree.parse(value, { context: "value" });
      replacementCount += 1;
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

  test("parses seeds, profiles, theme colors, and semantic categories", () => {
    const colors = parseColorSource(source);

    expect(Object.keys(colors.seed)).toHaveLength(6);
    expect(Object.keys(colors.profile.light)).toEqual(
      Object.keys(colors.profile.dark)
    );
    expect(Object.keys(colors.theme)).toHaveLength(7);
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
    expect(colors.semantic.background).not.toHaveProperty("accent-hover");
    expect(colors.semantic.overlay).toHaveProperty("interaction-hover");
  });

  test("derives structural groups from the CSS source", () => {
    const extendedSource = addRootDeclarations(source, {
      "--seed-custom": "oklch(50% 0.1 300)",
      "--theme-custom":
        "oklch(from var(--seed-custom) var(--profile-intent-lightness) calc(c * var(--profile-intent-chroma)) h)",
      "--foreground-custom":
        "color-mix(in oklch, var(--theme-custom) 86%, var(--theme-foreground))",
    });
    const colors = parseColorSource(extendedSource);

    expect(colors.seed.custom).toBe("oklch(50% 0.1 300)");
    expect(colors.theme.custom).toContain("var(--seed-custom)");
    expect(colors.semantic.foreground.custom).toContain("var(--theme-custom)");
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
});
