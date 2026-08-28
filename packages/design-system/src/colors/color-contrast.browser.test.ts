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

  test("seed lightness and chroma control derived theme colors", () => {
    const root = document.documentElement;
    const sample = document.createElement("span");
    sample.style.color = "var(--background-accent)";
    document.body.append(sample);

    const accentBefore = getComputedStyle(sample).color;
    root.style.setProperty("--seed-accent", "oklch(65% 0.21 255)");
    const accentAfter = getComputedStyle(sample).color;

    sample.style.color = "var(--background-primary)";
    const neutralBefore = getComputedStyle(sample).color;
    root.style.setProperty("--seed-neutral", "oklch(50% 0.03 250)");
    const neutralAfter = getComputedStyle(sample).color;

    expect.soft(accentAfter).not.toBe(accentBefore);
    expect.soft(neutralAfter).not.toBe(neutralBefore);

    root.style.removeProperty("--seed-accent");
    root.style.removeProperty("--seed-neutral");
    sample.remove();
  });
});
