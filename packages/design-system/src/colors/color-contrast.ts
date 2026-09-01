import type { CssVariableName } from "./__generated__/css-variable-names";
import type { ColorMode } from "./color-source-utils";
import { cssVar } from "../css-var";

export type ColorContrastResult = {
  foreground: CssVariableName;
  background: CssVariableName;
  minimum: number;
  ratio: number;
};

const contrastContracts = [
  ["--foreground-primary", "--background-primary", 4.5],
  ["--foreground-secondary", "--background-primary", 4.5],
  ["--foreground-primary", "--background-secondary", 4.5],
  ["--foreground-secondary", "--background-secondary", 4.5],
  ["--foreground-accent", "--background-primary", 4.5],
  ["--foreground-accent-secondary", "--background-primary", 4.5],
  ["--foreground-positive", "--background-primary", 4.5],
  ["--foreground-negative", "--background-primary", 4.5],
  ["--foreground-warning", "--background-primary", 4.5],
  ["--foreground-informative", "--background-primary", 4.5],
  ["--foreground-primary", "--background-selection", 4.5],
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
] as const satisfies readonly (readonly [
  CssVariableName,
  CssVariableName,
  number,
])[];

const contrastColorNames = new Set<CssVariableName>(
  contrastContracts.flatMap(([foreground, background]) => [
    foreground,
    background,
  ])
);

export const colorContrastContractCount = contrastContracts.length;

const toLinearChannel = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const getLuminance = (color: Uint8ClampedArray) =>
  0.2126 * toLinearChannel(color[0]) +
  0.7152 * toLinearChannel(color[1]) +
  0.0722 * toLinearChannel(color[2]);

const createColorReader = () => {
  const samples = new Map<CssVariableName, HTMLElement>();
  const container = document.createElement("div");
  container.hidden = true;
  for (const name of contrastColorNames) {
    const sample = document.createElement("span");
    sample.style.color = cssVar(name);
    container.append(sample);
    samples.set(name, sample);
  }
  document.body.append(container);

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    container.remove();
    throw new Error("Canvas color evaluation is unavailable");
  }

  const read = (name: CssVariableName) => {
    const sample = samples.get(name);
    if (sample === undefined) {
      throw new Error(`Unknown contrast color: ${name}`);
    }
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = getComputedStyle(sample).color;
    context.fillRect(0, 0, 1, 1);
    const color = context.getImageData(0, 0, 1, 1).data;
    if (color[3] !== 255) {
      throw new Error(`${name} must resolve to an opaque color`);
    }
    return color;
  };

  return { read, dispose: () => container.remove() };
};

const createColorContrastReader = () => {
  const root = document.documentElement;
  const previousMode = root.getAttribute("data-color-scheme");
  const reader = createColorReader();

  const read = (mode: ColorMode): ColorContrastResult[] => {
    root.setAttribute("data-color-scheme", mode);
    const luminances = new Map<CssVariableName, number>();
    const readLuminance = (name: CssVariableName) => {
      const cached = luminances.get(name);
      if (cached !== undefined) {
        return cached;
      }
      const value = getLuminance(reader.read(name));
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
  };

  const dispose = () => {
    reader.dispose();
    if (previousMode === null) {
      root.removeAttribute("data-color-scheme");
    } else {
      root.setAttribute("data-color-scheme", previousMode);
    }
  };

  return { read, dispose };
};

export const getColorContrast = (mode: ColorMode): ColorContrastResult[] => {
  const reader = createColorContrastReader();
  try {
    return reader.read(mode);
  } finally {
    reader.dispose();
  }
};

export const __testing__ = { createColorContrastReader };
