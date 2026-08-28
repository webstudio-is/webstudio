import { describe, expect, test } from "vitest";
import {
  color,
  colorControllerNames,
  compatibilityColor,
  darkColorControllers,
  lightColorControllers,
  semanticColor,
} from "./color-system";
import { toColorVariableName, toSemanticColorScales } from "./color-name-utils";

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
      expect(value, name).toContain("var(--theme-");
    }
  });

  test("organizes semantic colors into the Craft categories", () => {
    const scales = toSemanticColorScales(semanticColor);

    expect(Object.keys(scales)).toEqual([
      "foreground",
      "background",
      "border",
      "overlay",
    ]);
    expect(scales.foreground.primary).toBe("var(--theme-ink)");
    expect(scales.background["accent-hover"]).toContain("var(--theme-accent)");
    expect(scales.border.focus).toBe("var(--theme-accent)");
    expect(scales.overlay.scrim).toContain("var(--theme-ink)");
  });

  test("rejects semantic colors outside the Craft categories", () => {
    expect(() => toSemanticColorScales({ contentPrimary: "black" })).toThrow(
      "Unknown semantic color category: contentPrimary"
    );
  });

  test("keeps literal colors out of semantic and compatibility colors", () => {
    for (const [name, value] of Object.entries({
      ...semanticColor,
      ...compatibilityColor,
    })) {
      expect(value, name).not.toContain("#");
      expect(value, name).not.toContain("rgb(");
      expect(value, name).not.toContain("hsl(");
      expect(value, name).toContain("var(--");
      expect(value, name).not.toMatch(/--[a-z0-9-]*[A-Z]/);
    }
  });

  test("keeps existing color names as adapters to Craft variables", () => {
    expect(color.backgroundPanel).toBe("var(--background-primary)");
    expect(color.contentPrimary).toBe("var(--theme-ink)");
    expect(color.backgroundNeutralHover).toContain("var(--theme-canvas)");
    expect(color).not.toHaveProperty("themeCanvas");
    expect(color.white).toBe(compatibilityColor.white);
    expect(toColorVariableName("foregroundPrimary")).toBe(
      "--foreground-primary"
    );
  });
});
