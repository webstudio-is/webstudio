import type { FontFormat } from "./schema";

export const SYSTEM_FONTS = new Map([
  ["Arial", ["Arial", "Roboto", "sans-serif"]],
  ["Times New Roman", ["Times New Roman", "sans"]],
  ["Courier New", ["Courier New", "monospace"]],
  ["System UI", ["system-ui", "sans-serif"]],
  // Modern font stacks
  // https://github.com/system-fonts/modern-font-stacks
  [
    "Transitional",
    ["Charter", "Bitstream Charter", "Sitka Text", "Cambria", "serif"],
  ],
  [
    "Old Style",
    ["Iowan Old Style", "Palatino Linotype", "URW Palladio L", "P052", "serif"],
  ],
  [
    "Humanist",
    [
      "Seravek",
      "Gill Sans Nova",
      "Ubuntu",
      "Calibri",
      "DejaVu Sans",
      "source-sans-pro",
      "sans-serif",
    ],
  ],
  [
    "Geometric Humanist",
    [
      "Seravek",
      "Avenir",
      "Montserrat",
      "Corbel",
      "URW Gothic",
      "source-sans-pro",
      "sans-serif",
    ],
  ],
  [
    "Classical Humanist",
    ["Optima", "Candara", "Noto Sans", "source-sans-pro", "sans-serif"],
  ],
  [
    "Neo-Grotesque",
    [
      "Inter",
      "Roboto",
      "Helvetica Neue",
      "Arial Nova",
      "Nimbus Sans",
      "Arial",
      "sans-serif",
    ],
  ],
  ["Monospace Slab Serif", ["Nimbus Mono PS", "Courier New", "monospace"]],
  [
    "Monospace Code",
    [
      "ui-monospace",
      "Cascadia Code",
      "Source Code Pro",
      "Menlo",
      "Consolas",
      "DejaVu Sans Mono",
      "monospace",
    ],
  ],
  [
    "Industrial",
    [
      "Bahnschrift",
      "DIN Alternate",
      "Franklin Gothic Medium",
      "Nimbus Sans Narrow",
      "sans-serif-condensed",
      "sans-serif",
    ],
  ],
  [
    "Rounded Sans",
    [
      "ui-rounded",
      "Hiragino Maru Gothic ProN",
      "Quicksand",
      "Comfortaa",
      "Manjari",
      "Arial Rounded MT",
      "Arial Rounded MT Bold",
      "Calibri",
      "source-sans-pro",
      "sans-serif",
    ],
  ],
  [
    "Slab Serif",
    [
      "Rockwell",
      "Rockwell Nova",
      "Roboto Slab",
      "DejaVu Serif",
      "Sitka Small",
      "serif",
    ],
  ],
  [
    "Antique",
    [
      "Superclarendon",
      "Bookman Old Style",
      "URW Bookman",
      "URW Bookman L",
      "Georgia Pro",
      "Georgia",
      "serif",
    ],
  ],
  [
    "Didone",
    [
      "Didot",
      "Bodoni MT",
      "Noto Serif Display",
      "URW Palladio L",
      "P052",
      "Sylfaen",
      "serif",
    ],
  ],
  [
    "Handwritten",
    [
      "Segoe Print",
      "Bradley Hand",
      "Chilanka",
      "TSCu_Comic",
      "casual",
      "cursive",
    ],
  ],
  [
    "Emoji",
    [
      "Apple Color Emoji",
      "Segoe UI Emoji",
      "Segoe UI Symbol",
      "Noto Color Emoji",
    ],
  ],
  // Chineese fonts
  ["SimSun", ["SimSun", "Songti SC, sans-serif"]],
  ["PingFang SC", ["PingFang SC", "Microsoft Ya Hei", "sans-serif"]],
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
