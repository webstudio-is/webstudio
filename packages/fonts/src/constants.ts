import type { FontFormat } from "./schema";

export const SYSTEM_FONTS = new Map([
  [
    "System UI",
    {
      stack: ["system-ui", "sans-serif"],
      description:
        "System UI fonts are those native to the operating system interface. They are highly legible and easy to read at small sizes, contains many font weights, and is ideal for UI elements.",
    },
  ],
  // Modern font stacks
  // https://github.com/system-fonts/modern-font-stacks
  [
    "Transitional",
    {
      stack: ["Charter", "Bitstream Charter", "Sitka Text", "Cambria", "serif"],
      description:
        "Transitional typefaces are a mix between Old Style and Modern typefaces that was developed during The Enlightenment. One of the most famous examples of a Transitional typeface is Times New Roman, which was developed for the Times of London newspaper.",
    },
  ],
  [
    "Old Style",
    {
      stack: [
        "Iowan Old Style",
        "Palatino Linotype",
        "URW Palladio L",
        "P052",
        "serif",
      ],
      description:
        "Old Style typefaces are characterized by diagonal stress, low contrast between thick and thin strokes, and rounded serifs, and were developed in the Renaissance period. One of the most famous examples of an Old Style typeface is Garamond.",
    },
  ],
  [
    "Humanist",
    {
      stack: [
        "Seravek",
        "Gill Sans Nova",
        "Ubuntu",
        "Calibri",
        "DejaVu Sans",
        "source-sans-pro",
        "sans-serif",
      ],
      description:
        "Humanist typefaces are characterized by their organic, calligraphic forms and low contrast between thick and thin strokes. These typefaces are inspired by the handwriting of the Renaissance period and are often considered to be more legible and easier to read than other sans-serif typefaces.",
    },
  ],
  [
    "Geometric Humanist",
    {
      stack: [
        "Avenir",
        "Montserrat",
        "Corbel",
        "URW Gothic",
        "source-sans-pro",
        "sans-serif",
      ],
      description:
        "Geometric Humanist typefaces are characterized by their clean, geometric forms and uniform stroke widths. These typefaces are often considered to be modern and sleek in appearance, and are often used for headlines and other display purposes. Futura is a famous example of this classification.",
    },
  ],
  [
    "Classical Humanist",
    {
      stack: [
        "Optima",
        "Candara",
        "Noto Sans",
        "source-sans-pro",
        "sans-serif",
      ],
      description:
        "Classical Humanist typefaces are characterized by how the strokes subtly widen as they reach the stroke terminals without ending in a serif. These typefaces are inspired by classical Roman capitals and the stone-carving on Renaissance-period tombstones.",
    },
  ],
  [
    "Neo-Grotesque",
    {
      stack: [
        "Inter",
        "Roboto",
        "Helvetica Neue",
        "Arial Nova",
        "Nimbus Sans",
        "Arial",
        "sans-serif",
      ],
      description:
        "Neo-Grotesque typefaces are a style of sans-serif that was developed in the late 19th and early 20th centuries and is characterized by its clean, geometric forms and uniform stroke widths. One of the most famous examples of a Neo-Grotesque typeface is Helvetica.",
    },
  ],
  [
    "Monospace Slab Serif",
    {
      stack: ["Nimbus Mono PS", "Courier New", "monospace"],
      description:
        "Monospace Slab Serif typefaces are characterized by their fixed-width letters, which have the same width regardless of their shape, and its simple, geometric forms. Used to emulate typewriter output for reports, tabular work and technical documentation.",
    },
  ],
  [
    "Monospace Code",
    {
      stack: [
        "ui-monospace",
        "Cascadia Code",
        "Source Code Pro",
        "Menlo",
        "Consolas",
        "DejaVu Sans Mono",
        "monospace",
      ],
      description:
        "Monospace Code typefaces are specifically designed for use in programming and other technical applications. These typefaces are characterized by their monospaced design, which means that all letters and characters have the same width, and their clear, legible forms.",
    },
  ],
  [
    "Industrial",
    {
      stack: [
        "Bahnschrift",
        "DIN Alternate",
        "Franklin Gothic Medium",
        "Nimbus Sans Narrow",
        "sans-serif-condensed",
        "sans-serif",
      ],
      description:
        "Industrial typefaces originated in the late 19th century and was heavily influenced by the advancements in technology and industry during that time. Industrial typefaces are characterized by their bold, sans-serif letterforms, simple and straightforward appearance, and the use of straight lines and geometric shapes.",
    },
  ],
  [
    "Rounded Sans",
    {
      stack: [
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
      description:
        "Rounded typefaces are characterized by the rounded curved letterforms and give a softer, friendlier appearance. The rounded edges give the typeface a more organic and playful feel, making it suitable for use in informal or child-friendly designs. The rounded sans-serif style has been popular since the 1950s, and it continues to be widely used in advertising, branding, and other forms of graphic design.",
    },
  ],
  [
    "Slab Serif",
    {
      stack: [
        "Rockwell",
        "Rockwell Nova",
        "Roboto Slab",
        "DejaVu Serif",
        "Sitka Small",
        "serif",
      ],
      description:
        "Slab Serif typefaces are characterized by the presence of thick, block-like serifs on the ends of each letterform. These serifs are usually unbracketed, meaning they do not have any curved or tapered transitions to the main stroke of the letter.",
    },
  ],
  [
    "Antique",
    {
      stack: [
        "Superclarendon",
        "Bookman Old Style",
        "URW Bookman",
        "URW Bookman L",
        "Georgia Pro",
        "Georgia",
        "serif",
      ],
      description:
        "Antique typefaces, also known as Egyptians, are a subset of serif typefaces that were popular in the 19th century. They are characterized by their block-like serifs and thick uniform stroke weight.",
    },
  ],
  [
    "Didone",
    {
      stack: [
        "Didot",
        "Bodoni MT",
        "Noto Serif Display",
        "URW Palladio L",
        "P052",
        "Sylfaen",
        "serif",
      ],
      description:
        "Didone typefaces, also known as Modern typefaces, are characterized by the high contrast between thick and thin strokes, vertical stress, and hairline serifs with no bracketing. The Didone style emerged in the late 18th century and gained popularity during the 19th century.",
    },
  ],
  [
    "Handwritten",
    {
      stack: [
        "Segoe Print",
        "Bradley Hand",
        "Chilanka",
        "TSCu_Comic",
        "casual",
        "cursive",
      ],
      description:
        "Handwritten typefaces are designed to mimic the look and feel of handwriting. Despite the vast array of handwriting styles, this font stack tend to adopt a more informal and everyday style of handwriting.",
    },
  ],
  [
    "Arial",
    {
      stack: ["Arial", "Roboto", "sans-serif"],
      description:
        "A clean, sans-serif font designed for legibility and versatility. Ideal for modern, minimalistic designs or digital content that requires simplicity.",
    },
  ],
  [
    "Times New Roman",
    {
      stack: ["Times New Roman", "sans"],
      description:
        "A classic serif font known for its formal, professional appearance. Best suited for traditional documents, reports, and academic writing.",
    },
  ],
  [
    "Courier New",
    {
      stack: ["Courier New", "monospace"],
      description:
        "A monospaced serif font with uniform spacing, mimicking typewriter text. Perfect for coding, technical documents, or retro-styled designs.",
    },
  ],
  // Chineese fonts
  [
    "SimSun",
    {
      stack: ["SimSun", "Songti SC, sans-serif"],
      description:
        "A traditional serif font designed for Chinese characters, offering clear and readable text. Ideal for formal Chinese documents or multilingual content requiring both Chinese and Latin text.",
    },
  ],
  [
    "PingFang SC",
    {
      stack: ["PingFang SC", "Microsoft Ya Hei", "sans-serif"],
      description:
        "A modern sans-serif font designed for simplified Chinese characters. Sleek and clean, it’s best for digital content and interfaces where modern, streamlined design is needed.",
    },
  ],
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
