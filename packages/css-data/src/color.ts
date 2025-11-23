import { converter, formatCss, parse } from "culori";
import type { RgbValue } from "@webstudio-is/css-engine";

const toRgb = converter("rgb");

export type ParsedColor = RgbValue & {
  colorSpace?: string;
  original?: string;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const toByte = (value: number) => Math.round(clamp01(value) * 255);

/**
 * Parse arbitrary CSS color strings (CSS Color 4/5) into an RGB representation.
 * Keeps the source color space and a normalized string so we can round-trip.
 */
export const parseCssColor = (input: string): ParsedColor | undefined => {
  const normalizedInput = input.trim();
  if (normalizedInput.length === 0) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = parse(normalizedInput);
  } catch {
    return;
  }

  if (parsed === undefined || parsed === null) {
    return;
  }

  const rgbResult = toRgb(parsed);
  if (
    rgbResult === undefined ||
    rgbResult === null ||
    typeof rgbResult !== "object"
  ) {
    return;
  }

  const {
    r,
    g,
    b,
    alpha: alphaValue,
  } = rgbResult as {
    r?: number;
    g?: number;
    b?: number;
    alpha?: number;
  };

  if (typeof r !== "number" || typeof g !== "number" || typeof b !== "number") {
    return;
  }

  const alpha = Number(clamp01(alphaValue ?? 1).toFixed(2));
  const formatted = typeof parsed === "object" ? formatCss(parsed) : undefined;

  const color: ParsedColor = {
    type: "rgb",
    r: toByte(r),
    g: toByte(g),
    b: toByte(b),
    alpha,
  };

  const mode =
    typeof parsed === "object" && parsed !== null && "mode" in parsed
      ? (parsed as { mode?: string }).mode
      : undefined;

  if (mode && mode !== "rgb") {
    color.colorSpace = mode;
  }

  if (mode && mode !== "rgb") {
    color.original = formatted ?? normalizedInput;
  }

  return color;
};

/**
 * Serialize an RGB color, optionally preserving the source color space when provided.
 */
export const formatRgbColor = (
  color: ParsedColor,
  preferredColorSpace?: string
): string => {
  const targetSpace = preferredColorSpace ?? color.colorSpace;
  if (color.original && preferredColorSpace === color.colorSpace) {
    return color.original;
  }

  const rgbColor = {
    mode: "rgb",
    r: clamp01(color.r / 255),
    g: clamp01(color.g / 255),
    b: clamp01(color.b / 255),
    alpha: clamp01(color.alpha),
  };

  if (targetSpace) {
    try {
      const toPreferred = converter(targetSpace);
      const converted = toPreferred(rgbColor);
      const formattedPreferred = formatCss(converted);
      if (formattedPreferred) {
        return formattedPreferred;
      }
    } catch {
      // If the color space is not supported, fall back to RGBA below.
    }
  }

  const formatted = formatCss(rgbColor);
  if (formatted) {
    return formatted;
  }

  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha})`;
};
