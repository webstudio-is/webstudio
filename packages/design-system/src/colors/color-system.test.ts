import { describe, expect, test } from "vitest";
import {
  color,
  colorControllerNames,
  darkColorControllers,
  lightColorControllers,
  semanticColor,
} from "./color-system";

describe("color system", () => {
  test("defines exactly the same seven controllers in both themes", () => {
    expect(colorControllerNames).toEqual([
      "canvas",
      "ink",
      "accent",
      "positive",
      "negative",
      "warning",
      "informative",
    ]);
    expect(Object.keys(lightColorControllers)).toEqual(
      Object.keys(darkColorControllers)
    );
    expect(Object.keys(lightColorControllers)).toHaveLength(7);
  });

  test("keeps every semantic color connected to a theme controller", () => {
    for (const [name, value] of Object.entries(semanticColor)) {
      expect(value, name).toContain("var(--colors-theme");
    }
  });

  test("keeps literal colors out of semantic and compatibility colors", () => {
    const controllerNames = new Set(Object.keys(lightColorControllers));

    for (const [name, value] of Object.entries(color)) {
      if (controllerNames.has(name)) {
        continue;
      }

      expect(value, name).not.toContain("#");
      expect(value, name).not.toContain("rgb(");
      expect(value, name).not.toContain("hsl(");
      expect(value, name).toContain("var(--colors-");
      expect(value, name).not.toBe(`var(--colors-${name})`);
    }
  });
});
