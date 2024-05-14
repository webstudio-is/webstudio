import type { FontFormat } from "./schema";

export const SYSTEM_FONTS = new Map([
  ["Arial", ["Roboto", "sans-serif"]],
  ["Times New Roman", ["sans"]],
  ["Courier New", ["monospace"]],
  ["system-ui", []],
]);

export const DEFAULT_FONT_FALLBACK = "sans-serif";

export const FONT_FORMATS: Map<FontFormat, string> = new Map([
  ["woff", "woff"],
  ["woff2", "woff2"],
  ["ttf", "truetype"],
]);

export const FONT_MIME_TYPES = Array.from(FONT_FORMATS.keys())
  .map((format) => `.${format}`)
  .join(", ");

export const FONT_STYLES = ["normal", "italic", "oblique"] as const;
export type FontStyle = (typeof FONT_STYLES)[number];
