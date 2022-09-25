import type { FontFormat } from "./types";

export const SYSTEM_FONTS: Record<string, Array<string>> = {
  Arial: ["sans-serif"],
  "Times New Roman": ["serif"],
  "Courier New": ["monospace"],
  "system-ui": [],
};

export const DEFAULT_FONT_FALLBACK = "sans-serif";

export const FONT_FORMATS: { [key in FontFormat]: string } = {
  woff: "woff",
  woff2: "woff2",
  ttf: "truetype",
  otf: "opentype",
} as const;

export const FONT_MIME_TYPES = Object.keys(FONT_FORMATS)
  .map((format) => `.${format}`)
  .join(", ");
