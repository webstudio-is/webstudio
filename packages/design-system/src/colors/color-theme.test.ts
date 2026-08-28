import { describe, expect, test } from "vitest";
import { rawTheme, theme } from "../stitches.config";

describe("CSS-native Craft colors", () => {
  test("keeps colors out of the Stitches theme", () => {
    for (const scale of [
      "seed",
      "profile",
      "theme",
      "foreground",
      "background",
      "border",
      "overlay",
    ]) {
      expect(theme).not.toHaveProperty(scale);
      expect(rawTheme).not.toHaveProperty(scale);
    }
  });

  test("keeps the existing Builder color scale separate", () => {
    expect(theme.colors.backgroundPanel).toBe("$colors$background-panel");
    expect(rawTheme.colors.backgroundPanel).toBe("#fff");
  });
});
