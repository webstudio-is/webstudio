import { describe, expect, test } from "vitest";
import "./colors.css";
import type {
  SemanticColorName,
  ThemeVariableName,
} from "./__generated__/css-variable-names";
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

const getRelativeLuminance = (color: Uint8ClampedArray) => {
  const channels = Array.from(color.slice(0, 3), (channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const getContrastRatio = (
  first: Uint8ClampedArray,
  second: Uint8ClampedArray
) => {
  const firstLuminance = getRelativeLuminance(first);
  const secondLuminance = getRelativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
};

describe("Craft color contrast", () => {
  test("default secondary colors preserve a clear visual hierarchy", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");

    try {
      for (const mode of ["light", "dark"] as const) {
        root.dataset.colorScheme = mode;
        const background = readColor("--background-primary");
        const surface = readColor("--background-secondary");
        const floating = readColor("--background-floating");
        const raised = readColor("--background-floating-raised");
        const nested = readColor("--background-floating-nested");
        const primaryForeground = readColor("--foreground-primary");
        const secondaryForeground = readColor("--foreground-secondary");
        const primaryContrast = getContrastRatio(primaryForeground, background);
        const secondaryContrast = getContrastRatio(
          secondaryForeground,
          background
        );

        expect(
          getContrastRatio(surface, background),
          `${mode} secondary surface`
        ).toBeGreaterThanOrEqual(1.15);
        expect(
          getContrastRatio(floating, background),
          `${mode} floating surface`
        ).toBeGreaterThanOrEqual(1.05);
        if (mode === "light") {
          expect(floating[0]).toBeLessThan(background[0]);
          expect(raised[0]).toBeLessThan(floating[0]);
          expect(nested[0]).toBeLessThan(raised[0]);
        } else {
          expect(floating[0]).toBeGreaterThan(background[0]);
          expect(raised[0]).toBeGreaterThan(floating[0]);
          expect(nested[0]).toBeGreaterThan(raised[0]);
        }
        expect(
          secondaryContrast,
          `${mode} secondary foreground`
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          secondaryContrast,
          `${mode} secondary foreground remains subordinate`
        ).toBeLessThanOrEqual(primaryContrast * 0.55);
      }
    } finally {
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    }
  });

  test("light warning surfaces remain visibly distinct", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    root.dataset.colorScheme = "light";

    try {
      const background = readColor("--background-primary");
      const warning = readColor("--background-warning-subtle");
      const ratio = getContrastRatio(warning, background);
      expect(ratio).toBeGreaterThanOrEqual(1.15);
      expect(ratio).toBeLessThanOrEqual(1.3);
    } finally {
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    }
  });

  test("disabled content remains legible but subordinate", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");

    try {
      for (const mode of ["light", "dark"] as const) {
        root.dataset.colorScheme = mode;
        const primary = readColor("--background-primary");
        const disabledBackground = readColor("--background-disabled");
        const raisedBackground = readColor("--background-floating-raised");
        const disabled = readColor("--foreground-disabled");
        const secondary = readColor("--foreground-secondary");

        for (const background of [
          primary,
          disabledBackground,
          raisedBackground,
        ]) {
          expect(
            getContrastRatio(disabled, background),
            `${mode} disabled content`
          ).toBeGreaterThanOrEqual(3);
        }
        expect(
          getContrastRatio(disabled, raisedBackground),
          `${mode} disabled content on raised surfaces`
        ).toBeLessThanOrEqual(3.4);
        expect(getContrastRatio(disabled, primary), mode).toBeLessThan(
          getContrastRatio(secondary, primary)
        );
      }
    } finally {
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    }
  });

  test("dark focus borders preserve accent color instead of using accent text", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    root.dataset.colorScheme = "dark";

    try {
      expect(Array.from(readColor("--border-focus"))).not.toEqual(
        Array.from(readColor("--foreground-accent"))
      );
    } finally {
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    }
  });

  test("default focus borders stay close to the required contrast", () => {
    for (const mode of ["light", "dark"] as const) {
      const focus = getColorContrast(mode).find(
        ({ foreground }) => foreground === "--border-focus"
      );
      expect(focus?.ratio, mode).toBeLessThanOrEqual(3.5);
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

  test("restores the scheme and removes temporary DOM when color evaluation fails", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    const previousBackground = root.style.getPropertyValue(
      "--background-primary"
    );
    const previousBodyNodes = Array.from(document.body.childNodes);
    root.style.setProperty("--background-primary", "transparent");

    try {
      expect(() => getColorContrast("dark")).toThrow();
      expect(root.getAttribute("data-color-scheme")).toBe(previousMode);
      expect(Array.from(document.body.childNodes)).toEqual(previousBodyNodes);
    } finally {
      root.style.setProperty("--background-primary", previousBackground);
    }
  });

  test("vivid theme preserves negative text and nested surface contrast", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    const theme = {
      "--theme-color-neutral": "oklch(45% 0.02 300)",
      "--theme-color-negative": "oklch(60% 0.3 20)",
      "--theme-contrast-content": "100%",
      "--theme-contrast-surface": "100%",
    };

    try {
      for (const [name, value] of Object.entries(theme)) {
        root.style.setProperty(name, value);
      }
      for (const mode of ["light", "dark"] as const) {
        root.dataset.colorScheme = mode;
        for (const result of getColorContrast(mode)) {
          if (result.foreground === "--foreground-negative") {
            expect(
              result.ratio,
              `${mode} on ${result.background}`
            ).toBeGreaterThanOrEqual(result.minimum);
          }
        }
      }
      root.dataset.colorScheme = "dark";
      expect(Array.from(readColor("--background-floating-nested"))).not.toEqual(
        Array.from(readColor("--background-secondary"))
      );
    } finally {
      for (const name of Object.keys(theme)) {
        root.style.removeProperty(name);
      }
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    }
  });

  test.each(["light", "dark"] as const)(
    "all theme controls affect their intended outputs in %s mode",
    (mode) => {
      const root = document.documentElement;
      const previousMode = root.getAttribute("data-color-scheme");
      const controls = {
        "--theme-color-neutral": {
          value: "oklch(50% 0.02 300)",
          output: "--foreground-primary",
        },
        "--theme-color-accent": {
          value: "oklch(50% 0.18 300)",
          output: "--background-accent",
        },
        "--theme-color-positive": {
          value: "oklch(50% 0.18 300)",
          output: "--background-positive",
        },
        "--theme-color-negative": {
          value: "oklch(50% 0.18 300)",
          output: "--background-negative",
        },
        "--theme-color-warning": {
          value: "oklch(50% 0.18 300)",
          output: "--foreground-warning",
        },
        "--theme-color-informative": {
          value: "oklch(50% 0.18 300)",
          output: "--foreground-informative",
        },
        "--theme-contrast-content": {
          value: "100%",
          output: "--foreground-primary",
        },
        "--theme-contrast-surface": {
          value: "100%",
          output: "--background-secondary",
        },
        "--theme-contrast-border": {
          value: "100%",
          output: "--border-default",
        },
      } satisfies Record<
        ThemeVariableName,
        { value: string; output: SemanticColorName }
      >;

      try {
        root.dataset.colorScheme = mode;
        for (const [parameter, { value, output }] of Object.entries(controls)) {
          const previousValue = root.style.getPropertyValue(parameter);
          try {
            const before = Array.from(readColor(output));
            root.style.setProperty(parameter, value);
            expect(
              Array.from(readColor(output)),
              `${mode} ${parameter}`
            ).not.toEqual(before);
          } finally {
            root.style.setProperty(parameter, previousValue);
          }
        }
      } finally {
        if (previousMode === null) {
          root.removeAttribute("data-color-scheme");
        } else {
          root.setAttribute("data-color-scheme", previousMode);
        }
      }
    }
  );

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

  test("default dark negative foreground remains distinctly red", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    root.dataset.colorScheme = "dark";

    try {
      const negative = readColor("--foreground-negative");
      expect(negative[0] - Math.max(negative[1], negative[2])).toBeGreaterThan(
        100
      );
    } finally {
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    }
  });

  test("default dark secondary accent foreground remains distinctly purple", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    root.dataset.colorScheme = "dark";

    try {
      const secondaryAccent = readColor("--foreground-accent-secondary");
      expect(secondaryAccent[0] - secondaryAccent[1]).toBeGreaterThanOrEqual(
        70
      );
      expect(secondaryAccent[2] - secondaryAccent[1]).toBeGreaterThanOrEqual(
        100
      );
    } finally {
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    }
  });

  test("default dark informative surface remains distinct from the panel", () => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    root.dataset.colorScheme = "dark";

    try {
      const background = readColor("--background-primary");
      const informative = readColor("--background-informative-subtle");
      expect(getContrastRatio(informative, background)).toBeGreaterThanOrEqual(
        1.2
      );
      expect(informative[2] - informative[0]).toBeGreaterThanOrEqual(25);
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
});
