import { describe, expect, test } from "vitest";
import "./colors.css";
import { getColorContrast } from "./color-contrast";

const readColor = (name: string) => {
  const sample = document.createElement("span");
  sample.style.color = `var(${name})`;
  document.body.append(sample);

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    sample.remove();
    throw new Error("Canvas color evaluation is unavailable");
  }
  context.fillStyle = getComputedStyle(sample).color;
  context.fillRect(0, 0, 1, 1);
  const color = context.getImageData(0, 0, 1, 1).data;
  sample.remove();
  return color;
};

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

  test("theme color hue and chroma control derived semantic colors", () => {
    const root = document.documentElement;
    const sample = document.createElement("span");
    sample.style.color = "var(--background-accent)";
    document.body.append(sample);

    const accentBefore = getComputedStyle(sample).color;
    root.style.setProperty("--theme-color-accent", "oklch(50% 0.18 300)");
    const accentAfter = getComputedStyle(sample).color;

    sample.style.color = "var(--background-primary)";
    const neutralBefore = getComputedStyle(sample).color;
    root.style.setProperty("--theme-color-neutral", "oklch(50% 0.02 300)");
    const neutralAfter = getComputedStyle(sample).color;

    expect.soft(accentAfter).not.toBe(accentBefore);
    expect.soft(neutralAfter).not.toBe(neutralBefore);

    root.style.removeProperty("--theme-color-accent");
    root.style.removeProperty("--theme-color-neutral");
    sample.remove();
  });

  test("theme contrast parameters are effective and clamp to their range", () => {
    const root = document.documentElement;
    const relationships = {
      content: "--foreground-primary",
      surface: "--background-secondary",
      border: "--border-default",
    } as const;

    try {
      for (const [relationship, semanticColor] of Object.entries(
        relationships
      )) {
        const parameter = `--theme-contrast-${relationship}`;
        root.style.setProperty(parameter, "0%");
        const soft = Array.from(readColor(semanticColor));
        root.style.setProperty(parameter, "100%");
        const strong = Array.from(readColor(semanticColor));

        expect(strong, relationship).not.toEqual(soft);

        root.style.setProperty(parameter, "-100%");
        expect(Array.from(readColor(semanticColor)), relationship).toEqual(
          soft
        );
        root.style.setProperty(parameter, "200%");
        expect(Array.from(readColor(semanticColor)), relationship).toEqual(
          strong
        );
      }
    } finally {
      for (const relationship of Object.keys(relationships)) {
        root.style.removeProperty(`--theme-contrast-${relationship}`);
      }
    }
  });

  test("intent variants retain their semantic color family", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    try {
      root.dataset.colorScheme = "light";
      const negative = readColor("--background-negative-subtle");
      const warning = readColor("--background-warning-subtle");
      const informative = readColor("--background-informative-subtle");

      expect(negative[0]).toBeGreaterThan(negative[2]);
      expect(warning[0]).toBeGreaterThan(warning[2]);
      expect(informative[2]).toBeGreaterThan(informative[0]);
    } finally {
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    }
  });

  test("scrim remains dark in both color schemes", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    try {
      for (const mode of ["light", "dark"] as const) {
        root.dataset.colorScheme = mode;
        const scrim = readColor("--overlay-scrim");

        expect(Math.max(scrim[0], scrim[1], scrim[2]), mode).toBeLessThan(100);
      }
    } finally {
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    }
  });

  test("supported theme parameter range preserves every contrast contract", () => {
    const root = document.documentElement;
    const chromaticColors = [
      "accent",
      "positive",
      "negative",
      "warning",
      "informative",
    ];
    const contrasts = ["content", "surface", "border"];

    try {
      for (const mode of ["light", "dark"] as const) {
        for (const content of [0, 100]) {
          for (const surface of [0, 100]) {
            for (const border of [0, 100]) {
              root.style.setProperty("--theme-contrast-content", `${content}%`);
              root.style.setProperty("--theme-contrast-surface", `${surface}%`);
              root.style.setProperty("--theme-contrast-border", `${border}%`);
              for (const lightness of [0, 100]) {
                for (const chroma of [0, 0.4]) {
                  for (let hue = 0; hue < 360; hue += 15) {
                    for (const color of chromaticColors) {
                      root.style.setProperty(
                        `--theme-color-${color}`,
                        `oklch(${lightness}% ${chroma} ${hue})`
                      );
                    }
                    const failures = getColorContrast(mode).filter(
                      ({ ratio, minimum }) => ratio < minimum
                    );
                    expect
                      .soft(
                        failures,
                        `${mode}, contrast ${content}/${surface}/${border}, ${lightness}%, ${chroma} chroma, ${hue}deg`
                      )
                      .toEqual([]);
                  }
                }
              }
              for (const lightness of [0, 100]) {
                for (const chroma of [0, 0.2]) {
                  for (let hue = 0; hue < 360; hue += 15) {
                    root.style.setProperty(
                      "--theme-color-neutral",
                      `oklch(${lightness}% ${chroma} ${hue})`
                    );
                    const failures = getColorContrast(mode).filter(
                      ({ ratio, minimum }) => ratio < minimum
                    );
                    expect
                      .soft(
                        failures,
                        `${mode} neutral, contrast ${content}/${surface}/${border}, ${lightness}%, ${chroma} chroma, ${hue}deg`
                      )
                      .toEqual([]);
                  }
                }
              }
            }
          }
        }
      }
    } finally {
      for (const color of chromaticColors) {
        root.style.removeProperty(`--theme-color-${color}`);
      }
      for (const contrast of contrasts) {
        root.style.removeProperty(`--theme-contrast-${contrast}`);
      }
      root.style.removeProperty("--theme-color-neutral");
    }
  });
});
