import * as colorjs from "colorjs.io/fn";
export type {
  PlainColorObject,
  ColorConstructor,
  ColorSpace,
  Coords,
} from "colorjs.io/fn";
import type { ColorSpace, PlainColorObject } from "colorjs.io/fn";
import type { ColorValue } from "./schema";

// ─── Color space registration ────────────────────────────────────────────────
// Registers all color spaces once on import so every consumer gets them
// automatically. This is a side-effect import for downstream modules.

colorjs.ColorSpace.register(colorjs.sRGB);
colorjs.ColorSpace.register(colorjs.sRGB_Linear);
colorjs.ColorSpace.register(colorjs.HSL);
colorjs.ColorSpace.register(colorjs.HWB);
colorjs.ColorSpace.register(colorjs.Lab);
colorjs.ColorSpace.register(colorjs.LCH);
colorjs.ColorSpace.register(colorjs.OKLab);
colorjs.ColorSpace.register(colorjs.OKLCH);
colorjs.ColorSpace.register(colorjs.P3);
colorjs.ColorSpace.register(colorjs.A98RGB);
colorjs.ColorSpace.register(colorjs.ProPhoto);
colorjs.ColorSpace.register(colorjs.REC_2020);
colorjs.ColorSpace.register(colorjs.XYZ_D65);
colorjs.ColorSpace.register(colorjs.XYZ_D50);

// Register CSS aliases that differ from the internal colorjs id so that
// ColorSpace.get() resolves them (e.g. from hdr-color-input values).
colorjs.ColorSpace.registry["display-p3"] = colorjs.P3;
colorjs.ColorSpace.registry["a98-rgb"] = colorjs.A98RGB;
colorjs.ColorSpace.registry["prophoto-rgb"] = colorjs.ProPhoto;

// Re-export colorjs as `color` so consumers never need to import colorjs.io/fn
// directly. Importing this module guarantees all color spaces are registered.
export const color = colorjs;

// ─── Shared utilities ────────────────────────────────────────────────────────

// Map each registered ColorSpace to its canonical ColorValue["colorSpace"] string.
// For all currently registered spaces, space.id already matches, but the map
// ensures exhaustiveness: registering a new space without adding it here will
// cause toColorSpace() to throw at runtime.
const registeredSpaces = new Map<ColorSpace, ColorValue["colorSpace"]>([
  [colorjs.sRGB, "srgb"],
  [colorjs.sRGB_Linear, "srgb-linear"],
  [colorjs.HSL, "hsl"],
  [colorjs.HWB, "hwb"],
  [colorjs.Lab, "lab"],
  [colorjs.LCH, "lch"],
  [colorjs.OKLab, "oklab"],
  [colorjs.OKLCH, "oklch"],
  [colorjs.P3, "p3"],
  [colorjs.A98RGB, "a98rgb"],
  [colorjs.ProPhoto, "prophoto"],
  [colorjs.REC_2020, "rec2020"],
  [colorjs.XYZ_D65, "xyz-d65"],
  [colorjs.XYZ_D50, "xyz-d50"],
]);

// Convert a colorjs ColorSpace instance to the canonical ColorValue["colorSpace"].
export const toColorSpace = (space: ColorSpace): ColorValue["colorSpace"] => {
  const id = registeredSpaces.get(space);
  if (id === undefined) {
    throw new Error(`Unregistered color space: ${space.id}`);
  }
  return id;
};

// Round a color component to 4 decimal places, treating undefined/null as 0.
export const toColorComponent = (value: undefined | null | number) =>
  Math.round((value ?? 0) * 10000) / 10000;

// ─── Color helpers ───────────────────────────────────────────────────────────

// Create an sRGB PlainColorObject. Coords are in the [0, 1] range.
export const srgbColor = (
  r: number,
  g: number,
  b: number,
  alpha: number = 1
): PlainColorObject => ({
  space: colorjs.sRGB,
  coords: [r, g, b],
  alpha,
});

export const transparentColor = srgbColor(0, 0, 0, 0);
export const whiteColor = srgbColor(1, 1, 1, 1);

// Resolve a color string via the browser canvas API. Handles color-mix(),
// relative color syntax, and other browser-native color functions that colorjs
// can't parse. Returns undefined in non-browser environments.
const resolveColorViaCanvas = (
  colorString: string
): PlainColorObject | undefined => {
  if (typeof document === "undefined") {
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.fillStyle = colorString;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return srgbColor(
    (r ?? 0) / 255,
    (g ?? 0) / 255,
    (b ?? 0) / 255,
    (a ?? 255) / 255
  );
};

// Parse a CSS color string to an sRGB PlainColorObject.
// Falls back to a canvas-based resolution for color-mix() and relative color
// syntax that colorjs doesn't handle. Returns transparentColor when parsing
// fails entirely (or in SSR environments).
export const parseColor = (cssString: string): PlainColorObject => {
  try {
    return colorjs.to(cssString, "srgb");
  } catch {
    return resolveColorViaCanvas(cssString) ?? transparentColor;
  }
};

// Euclidean distance between two sRGB colors (including alpha channel).
export const colorDistance = (
  a: PlainColorObject,
  b: PlainColorObject
): number => {
  const [ar, ag, ab] = a.coords;
  const [br, bg, bb] = b.coords;
  return Math.sqrt(
    ((ar ?? 0) - (br ?? 0)) ** 2 +
      ((ag ?? 0) - (bg ?? 0)) ** 2 +
      ((ab ?? 0) - (bb ?? 0)) ** 2 +
      ((a.alpha ?? 1) - (b.alpha ?? 1)) ** 2
  );
};

// Linear interpolation between two colors.
export const lerpColor = (
  a: PlainColorObject,
  b: PlainColorObject,
  ratio: number
): PlainColorObject => {
  const lerp = (start: number, end: number, t: number) =>
    start * (1 - t) + end * t;
  return {
    space: a.space,
    coords: [
      lerp(a.coords[0] ?? 0, b.coords[0] ?? 0, ratio),
      lerp(a.coords[1] ?? 0, b.coords[1] ?? 0, ratio),
      lerp(a.coords[2] ?? 0, b.coords[2] ?? 0, ratio),
    ],
    alpha: lerp(a.alpha ?? 1, b.alpha ?? 1, ratio),
  };
};

// Serialize an sRGB PlainColorObject to a CSS rgb()/rgba() string.
export const serializeColor = (color: PlainColorObject): string => {
  const [r, g, b] = color.coords;
  const red = Math.round((r ?? 0) * 255);
  const green = Math.round((g ?? 0) * 255);
  const blue = Math.round((b ?? 0) * 255);
  const alpha = color.alpha ?? 1;
  if (alpha < 1) {
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
  return `rgb(${red}, ${green}, ${blue})`;
};
