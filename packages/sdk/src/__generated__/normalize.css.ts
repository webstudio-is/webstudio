import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";

type StyleDecl = {
  state?: string;
  property: CssProperty;
  value: StyleValue;
};

export const div: StyleDecl[] = [
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "outline-width", value: { type: "unit", unit: "px", value: 1 } },
];

export const address = div;

export const article = div;

export const aside = div;

export const figure = div;

export const footer = div;

export const header = div;

export const main = div;

export const nav = div;

export const section = div;

export const form = div;

export const label = div;

export const time = div;

export const h1 = div;

export const h2 = div;

export const h3 = div;

export const h4 = div;

export const h5 = div;

export const h6 = div;

export const i = div;

export const img = div;

export const a = div;

export const li = div;

export const ul = div;

export const ol = div;

export const p = div;

export const span = div;

export const html: StyleDecl[] = [
  { property: "display", value: { type: "keyword", value: "grid" } },
  { property: "min-height", value: { type: "unit", unit: "%", value: 100 } },
  {
    property: "font-family",
    value: { type: "fontFamily", value: ["Arial", "Roboto", "sans-serif"] },
  },
  { property: "font-size", value: { type: "unit", unit: "px", value: 16 } },
  {
    property: "line-height",
    value: { type: "unit", unit: "number", value: 1.2 },
  },
  {
    property: "white-space-collapse",
    value: { type: "keyword", value: "preserve" },
  },
];

export const body: StyleDecl[] = [
  { property: "margin-top", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "margin-right",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "margin-bottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "margin-left",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const hr: StyleDecl[] = [
  { property: "height", value: { type: "unit", unit: "number", value: 0 } },
  { property: "color", value: { type: "keyword", value: "inherit" } },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const b: StyleDecl[] = [
  {
    property: "font-weight",
    value: { type: "unit", unit: "number", value: 700 },
  },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const strong = b;

export const code: StyleDecl[] = [
  {
    property: "font-family",
    value: {
      type: "fontFamily",
      value: [
        "ui-monospace",
        "SFMono-Regular",
        "Consolas",
        "Liberation Mono",
        "Menlo",
        "monospace",
      ],
    },
  },
  { property: "font-size", value: { type: "unit", unit: "em", value: 1 } },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const kbd = code;

export const samp = code;

export const pre = code;

export const small: StyleDecl[] = [
  { property: "font-size", value: { type: "unit", unit: "%", value: 80 } },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const sub: StyleDecl[] = [
  { property: "font-size", value: { type: "unit", unit: "%", value: 75 } },
  {
    property: "line-height",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "position", value: { type: "keyword", value: "relative" } },
  { property: "vertical-align", value: { type: "keyword", value: "baseline" } },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "bottom", value: { type: "unit", unit: "em", value: -0.25 } },
];

export const sup: StyleDecl[] = [
  { property: "font-size", value: { type: "unit", unit: "%", value: 75 } },
  {
    property: "line-height",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "position", value: { type: "keyword", value: "relative" } },
  { property: "vertical-align", value: { type: "keyword", value: "baseline" } },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "top", value: { type: "unit", unit: "em", value: -0.5 } },
];

export const table: StyleDecl[] = [
  {
    property: "text-indent",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-top-color",
    value: { type: "keyword", value: "inherit" },
  },
  {
    property: "border-right-color",
    value: { type: "keyword", value: "inherit" },
  },
  {
    property: "border-bottom-color",
    value: { type: "keyword", value: "inherit" },
  },
  {
    property: "border-left-color",
    value: { type: "keyword", value: "inherit" },
  },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
];

export const input: StyleDecl[] = [
  { property: "font-family", value: { type: "keyword", value: "inherit" } },
  { property: "font-size", value: { type: "unit", unit: "%", value: 100 } },
  {
    property: "line-height",
    value: { type: "unit", unit: "number", value: 1.15 },
  },
  { property: "margin-top", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "margin-right",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "margin-bottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "margin-left",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "border-top-style", value: { type: "keyword", value: "solid" } },
  {
    property: "border-right-style",
    value: { type: "keyword", value: "solid" },
  },
  {
    property: "border-bottom-style",
    value: { type: "keyword", value: "solid" },
  },
  { property: "border-left-style", value: { type: "keyword", value: "solid" } },
];

export const textarea = input;

export const optgroup: StyleDecl[] = [
  { property: "font-family", value: { type: "keyword", value: "inherit" } },
  { property: "font-size", value: { type: "unit", unit: "%", value: 100 } },
  {
    property: "line-height",
    value: { type: "unit", unit: "number", value: 1.15 },
  },
  { property: "margin-top", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "margin-right",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "margin-bottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "margin-left",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const radio: StyleDecl[] = [
  { property: "font-family", value: { type: "keyword", value: "inherit" } },
  { property: "font-size", value: { type: "unit", unit: "%", value: 100 } },
  {
    property: "line-height",
    value: { type: "unit", unit: "number", value: 1.15 },
  },
  { property: "margin-top", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "margin-right",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "margin-bottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "margin-left",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "border-top-style", value: { type: "keyword", value: "none" } },
  { property: "border-right-style", value: { type: "keyword", value: "none" } },
  {
    property: "border-bottom-style",
    value: { type: "keyword", value: "none" },
  },
  { property: "border-left-style", value: { type: "keyword", value: "none" } },
];

export const checkbox = radio;

export const button: StyleDecl[] = [
  { property: "font-family", value: { type: "keyword", value: "inherit" } },
  { property: "font-size", value: { type: "unit", unit: "%", value: 100 } },
  {
    property: "line-height",
    value: { type: "unit", unit: "number", value: 1.15 },
  },
  { property: "margin-top", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "margin-right",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "margin-bottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "margin-left",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "border-top-style", value: { type: "keyword", value: "solid" } },
  {
    property: "border-right-style",
    value: { type: "keyword", value: "solid" },
  },
  {
    property: "border-bottom-style",
    value: { type: "keyword", value: "solid" },
  },
  { property: "border-left-style", value: { type: "keyword", value: "solid" } },
  { property: "text-transform", value: { type: "keyword", value: "none" } },
];

export const select = button;

export const legend: StyleDecl[] = [
  {
    property: "padding-top",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "padding-right",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "padding-bottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "padding-left",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const progress: StyleDecl[] = [
  { property: "vertical-align", value: { type: "keyword", value: "baseline" } },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const summary: StyleDecl[] = [
  { property: "display", value: { type: "keyword", value: "list-item" } },
  { property: "box-sizing", value: { type: "keyword", value: "border-box" } },
  {
    property: "border-top-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-right-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-bottom-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "border-left-width",
    value: { type: "unit", unit: "px", value: 1 },
  },
];
