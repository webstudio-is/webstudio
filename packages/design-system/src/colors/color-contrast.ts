import type { CssVariableName } from "./__generated__/css-variable-names";
import type { ColorMode } from "./color-source-utils";

export type ColorContrastResult = {
  foreground: CssVariableName;
  background: CssVariableName;
  minimum: number;
  ratio: number;
};

const contrastContracts = [
  ["--foreground-primary", "--background-primary", 4.5],
  ["--foreground-secondary", "--background-primary", 4.5],
  ["--foreground-muted", "--background-primary", 4.5],
  ["--foreground-accent", "--background-primary", 4.5],
  ["--foreground-positive", "--background-primary", 4.5],
  ["--foreground-negative", "--background-primary", 4.5],
  ["--foreground-warning", "--background-primary", 4.5],
  ["--foreground-informative", "--background-primary", 4.5],
  ["--foreground-on-inverse", "--background-inverse", 4.5],
  ["--foreground-on-accent", "--background-accent", 4.5],
  ["--foreground-on-positive", "--background-positive", 4.5],
  ["--foreground-on-negative", "--background-negative", 4.5],
  ["--foreground-negative", "--background-negative-subtle", 4.5],
  ["--foreground-warning", "--background-warning-subtle", 4.5],
  ["--foreground-informative", "--background-informative-subtle", 4.5],
  ["--border-focus", "--background-primary", 3],
  ["--border-negative", "--background-primary", 3],
  ["--border-warning", "--background-primary", 3],
  ["--border-informative", "--background-primary", 3],
] as const satisfies readonly (readonly [
  CssVariableName,
  CssVariableName,
  number,
])[];

const toLinearChannel = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const getLuminance = (color: Uint8ClampedArray) =>
  0.2126 * toLinearChannel(color[0]) +
  0.7152 * toLinearChannel(color[1]) +
  0.0722 * toLinearChannel(color[2]);

const createColorReader = () => {
  const sample = document.createElement("span");
  sample.hidden = true;
  document.body.append(sample);

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    sample.remove();
    throw new Error("Canvas color evaluation is unavailable");
  }

  const read = (name: CssVariableName) => {
    sample.style.color = `var(${name})`;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = getComputedStyle(sample).color;
    context.fillRect(0, 0, 1, 1);
    const color = context.getImageData(0, 0, 1, 1).data;
    if (color[3] !== 255) {
      throw new Error(`${name} must resolve to an opaque color`);
    }
    return color;
  };

  return { read, dispose: () => sample.remove() };
};

export const getColorContrast = (mode: ColorMode): ColorContrastResult[] => {
  const root = document.documentElement;
  const previousMode = root.getAttribute("data-color-scheme");
  root.setAttribute("data-color-scheme", mode);
  const reader = createColorReader();

  try {
    return contrastContracts.map(([foreground, background, minimum]) => {
      const foregroundLuminance = getLuminance(reader.read(foreground));
      const backgroundLuminance = getLuminance(reader.read(background));
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
    reader.dispose();
    if (previousMode === null) {
      root.removeAttribute("data-color-scheme");
    } else {
      root.setAttribute("data-color-scheme", previousMode);
    }
  }
};
