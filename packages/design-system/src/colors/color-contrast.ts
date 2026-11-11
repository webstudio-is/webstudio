import type { SemanticColorName } from "./__generated__/css-variable-names";
import type { ColorMode } from "./color-source-utils";
import { cssVar } from "../css-var";

export type ColorContrastResult = {
  foreground: SemanticColorName;
  background: SemanticColorName;
  minimum: number;
  ratio: number;
};

const contrastContracts = [
  ...(
    [
      "--foreground-primary",
      "--foreground-secondary",
      "--foreground-accent",
      "--foreground-accent-secondary",
      "--foreground-positive",
      "--foreground-negative",
      "--foreground-warning",
      "--foreground-informative",
    ] as const
  ).flatMap((foreground) =>
    (
      [
        "--background-primary",
        "--background-floating",
        "--background-floating-raised",
        "--background-floating-nested",
      ] as const
    ).map((background) => [foreground, background, 4.5] as const)
  ),
  ["--foreground-primary", "--background-secondary", 4.5],
  ["--foreground-secondary", "--background-secondary", 4.5],
  ["--foreground-on-text-selection", "--background-text-selection", 4.5],
  // Text selection appears on both regular surfaces and secondary editor fields.
  ["--background-text-selection", "--background-primary", 3],
  ["--background-text-selection", "--background-secondary", 3],
  ["--foreground-on-inverse", "--background-inverse", 4.5],
  ["--foreground-on-accent", "--background-accent", 4.5],
  ["--foreground-on-accent-secondary", "--background-accent-secondary", 4.5],
  ["--foreground-on-positive", "--background-positive", 4.5],
  ["--foreground-on-negative", "--background-negative", 4.5],
  ["--foreground-positive", "--background-positive-subtle", 4.5],
  ["--foreground-negative", "--background-negative-subtle", 4.5],
  ["--foreground-warning", "--background-warning-subtle", 4.5],
  ["--foreground-informative", "--background-informative-subtle", 4.5],
  ["--foreground-primary", "--background-informative-subtle", 4.5],
  ["--foreground-secondary", "--background-informative-subtle", 4.5],
  ["--foreground-negative", "--background-informative-subtle", 4.5],
  ["--border-focus", "--background-secondary", 3],
] satisfies readonly (readonly [
  SemanticColorName,
  SemanticColorName,
  number,
])[];

export const colorContrastContractCount = contrastContracts.length;

const toLinearChannel = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const getLuminance = (color: Uint8ClampedArray) =>
  0.2126 * toLinearChannel(color[0]) +
  0.7152 * toLinearChannel(color[1]) +
  0.0722 * toLinearChannel(color[2]);

export const getColorContrast = (mode: ColorMode): ColorContrastResult[] => {
  const root = document.documentElement;
  const previousMode = root.getAttribute("data-color-scheme");
  const sample = document.createElement("span");
  sample.hidden = true;
  document.body.append(sample);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      throw new Error("Canvas color evaluation is unavailable");
    }

    root.setAttribute("data-color-scheme", mode);
    const luminances = new Map<SemanticColorName, number>();
    const readLuminance = (name: SemanticColorName) => {
      const cached = luminances.get(name);
      if (cached !== undefined) {
        return cached;
      }
      sample.style.color = cssVar(name);
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = getComputedStyle(sample).color;
      context.fillRect(0, 0, 1, 1);
      const color = context.getImageData(0, 0, 1, 1).data;
      if (color[3] !== 255) {
        throw new Error(`${name} must resolve to an opaque color`);
      }
      const value = getLuminance(color);
      luminances.set(name, value);
      return value;
    };

    return contrastContracts.map(([foreground, background, minimum]) => {
      const foregroundLuminance = readLuminance(foreground);
      const backgroundLuminance = readLuminance(background);
      const lighter = Math.max(foregroundLuminance, backgroundLuminance);
      const darker = Math.min(foregroundLuminance, backgroundLuminance);
      return {
        foreground,
        background,
        minimum,
        ratio: (lighter + 0.05) / (darker + 0.05),
      };
    });
  } finally {
    sample.remove();
    if (previousMode === null) {
      root.removeAttribute("data-color-scheme");
    } else {
      root.setAttribute("data-color-scheme", previousMode);
    }
  }
};
