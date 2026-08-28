import { describe, expect, test } from "vitest";
import { rawTheme, theme } from "../stitches.config";

describe("Craft color theme", () => {
  test("configures Craft scales and keeps the legacy Stitches color scale", () => {
    expect(theme.theme.canvas).toBe("$theme$canvas");
    expect(theme.foreground.primary).toBe("$foreground$primary");
    expect(theme.background["accent-hover"]).toBe("$background$accent-hover");
    expect(theme.colors.backgroundPanel).toBe("$colors$background-panel");
    expect(rawTheme.foreground.primary).toBe("var(--theme-ink)");
    expect(rawTheme.colors.backgroundPanel).toBe("var(--background-primary)");
  });
});
