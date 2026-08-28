import { describe, expect, test } from "vitest";
import "./colors.css";
import { getColorContrast } from "./color-contrast";
import type { ColorMode } from "./color-source-utils";

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

const legacyLightColors = {
  "--background-primary": "#ffffff",
  "--background-secondary": "#f5f5f5",
  "--background-disabled": "#f8f8f8",
  "--background-inverse": "#11181c",
  "--background-accent": "#096cff",
  "--background-positive": "#00894a",
  "--background-positive-subtle": "#e9f9ee",
  "--background-negative": "#dc2929",
  "--background-negative-subtle": "#ffe9e9",
  "--background-warning-subtle": "#fffbd1",
  "--background-informative-subtle": "#e1f0ff",
  "--foreground-primary": "#11181c",
  "--foreground-secondary": "#656869",
  "--foreground-muted": "#687076",
  "--foreground-disabled": "#c1c8cd",
  "--foreground-on-inverse": "#ffffff",
  "--foreground-on-accent": "#ffffff",
  "--foreground-on-positive": "#ffffff",
  "--foreground-on-negative": "#ffffff",
  "--foreground-accent": "#096cff",
  // Darkened from the legacy green so positive text remains accessible on its subtle background.
  "--foreground-positive": "#0b7b45",
  "--foreground-negative": "#d13a3a",
  // Darkened from the legacy yellow so warning text meets 4.5:1 contrast.
  "--foreground-warning": "#786a00",
  "--foreground-informative": "#016ccc",
  "--border-default": "#e6e6e6",
  "--border-focus": "#096cff",
  "--border-negative": "#d13a3a",
  "--border-warning": "#f5d90a",
  "--border-informative": "#b7d9f8",
  "--overlay-interaction-hover": "#00000010",
  "--overlay-interaction-pressed": "#0000001c",
  "--overlay-on-inverse-hover": "#ffffff10",
  "--overlay-on-inverse-pressed": "#ffffff1c",
  "--overlay-scrim": "#11181ca8",
} as const;

const parseHex = (hex: string) => {
  const channels = hex.slice(1).match(/.{2}/g);
  if (channels === null) {
    throw new Error(`Invalid expected color: ${hex}`);
  }
  if (channels.length === 3) {
    channels.push("ff");
  }
  return channels.map((channel) => Number.parseInt(channel, 16));
};

describe("Craft color contrast", () => {
  test("default light semantics preserve the established palette", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    root.dataset.colorScheme = "light";

    try {
      for (const [name, expectedHex] of Object.entries(legacyLightColors)) {
        const actual = Array.from(readColor(name));
        const expected = parseHex(expectedHex);
        let tolerance = 9;
        if (name === "--background-negative-subtle") {
          tolerance = 4;
        } else if (
          name !== "--background-warning-subtle" &&
          (name.includes("subtle") ||
            name.startsWith("--border-") ||
            name === "--foreground-negative")
        ) {
          tolerance = 24;
        }

        for (const [index, expectedChannel] of expected.entries()) {
          expect
            .soft(
              Math.abs(actual[index] - expectedChannel),
              `${name} channel ${index}: ${actual.join(", ")} versus ${expected.join(", ")}`
            )
            .toBeLessThanOrEqual(index === 3 ? 1 : tolerance);
        }
      }
    } finally {
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    }
  });

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
      const positive = readColor("--background-positive-subtle");
      const negative = readColor("--background-negative-subtle");
      const warning = readColor("--background-warning-subtle");
      const informative = readColor("--background-informative-subtle");

      expect(positive[1]).toBeGreaterThan(positive[0]);
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

  test("dark scheme preserves dark neutral hierarchy and chromatic fills", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");

    try {
      root.dataset.colorScheme = "light";
      const lightAccent = readColor("--background-accent");

      root.dataset.colorScheme = "dark";
      const primary = readColor("--background-primary");
      const secondary = readColor("--background-secondary");
      const disabled = readColor("--background-disabled");
      const darkAccent = readColor("--background-accent");
      const onAccent = readColor("--foreground-on-accent");
      const hoverOverlay = readColor("--overlay-interaction-hover");

      expect(Math.max(...primary.slice(0, 3))).toBeLessThanOrEqual(36);
      expect(Math.max(...primary.slice(0, 3))).toBeGreaterThanOrEqual(12);
      expect(
        Math.max(...primary.slice(0, 3)) - Math.min(...primary.slice(0, 3))
      ).toBeLessThanOrEqual(6);
      for (const channel of [0, 1, 2]) {
        expect(secondary[channel]).toBeGreaterThan(disabled[channel]);
        expect(disabled[channel]).toBeGreaterThan(primary[channel]);
        expect(
          Math.abs(darkAccent[channel] - lightAccent[channel])
        ).toBeLessThanOrEqual(1);
        expect(onAccent[channel]).toBeGreaterThanOrEqual(248);
        expect(hoverOverlay[channel]).toBe(255);
      }
      expect(hoverOverlay[3]).toBe(16);
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
    const violations = new Map<string, { ratio: number; message: string }>();

    const recordFailures = (scenario: string, mode: ColorMode) => {
      const failures = getColorContrast(mode).filter(
        ({ ratio, minimum }) => ratio < minimum
      );
      for (const failure of failures) {
        const relationship = `${failure.foreground} on ${failure.background}`;
        const previous = violations.get(relationship);
        const message = `${scenario}: ${relationship} is ${failure.ratio.toFixed(2)}:1, expected ${failure.minimum}:1`;
        if (previous === undefined || previous.ratio > failure.ratio) {
          violations.set(relationship, { ratio: failure.ratio, message });
        }
      }
    };

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
                    recordFailures(
                      `${mode}, contrast ${content}/${surface}/${border}, ${lightness}%, ${chroma} chroma, ${hue}deg`,
                      mode
                    );
                  }
                }
              }
              for (const color of chromaticColors) {
                root.style.removeProperty(`--theme-color-${color}`);
              }
              for (const lightness of [0, 100]) {
                for (const chroma of [0, 0.2]) {
                  for (let hue = 0; hue < 360; hue += 15) {
                    root.style.setProperty(
                      "--theme-color-neutral",
                      `oklch(${lightness}% ${chroma} ${hue})`
                    );
                    recordFailures(
                      `${mode} neutral, contrast ${content}/${surface}/${border}, ${lightness}%, ${chroma} chroma, ${hue}deg`,
                      mode
                    );
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

    expect(Array.from(violations.values(), ({ message }) => message)).toEqual(
      []
    );
  });
});
