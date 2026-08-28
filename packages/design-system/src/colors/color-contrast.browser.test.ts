import { describe, expect, test } from "vitest";
import "./colors.css";
import { getColorContrast } from "./color-contrast";

describe("Craft color contrast", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`${mode} mode satisfies every contrast contract`, () => {
      for (const result of getColorContrast(mode)) {
        expect(
          result.ratio,
          `${result.foreground} on ${result.background}`
        ).toBeGreaterThanOrEqual(result.minimum);
      }
    });
  }
});
