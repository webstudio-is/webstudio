import { describe, expect, test } from "vitest";
import { rawTheme, theme } from "../stitches.config";

describe("CSS-native Craft colors", () => {
  test("keeps colors out of the Stitches theme", () => {
    expect(theme).not.toHaveProperty("colors");
    expect(rawTheme).not.toHaveProperty("colors");
  });
});
