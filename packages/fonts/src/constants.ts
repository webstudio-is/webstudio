import type { FontFormat } from "./types";

export const SYSTEM_FONTS = [
  {
    family: "Arial",
    fallbacks: ["sans-serif"],
  },
  {
    family: "Times New Roman",
    fallbacks: ["serif"],
  },
  {
    family: "Courier New",
    fallbacks: ["monospace"],
  },
  {
    family: "system-ui",
    fallbacks: ["system-ui"],
  },
] as const;

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
