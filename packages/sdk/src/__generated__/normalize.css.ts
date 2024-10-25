import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";

type StyleDecl = {
  state?: string;
  property: StyleProperty;
  value: StyleValue;
};

export const div: StyleDecl[] = [
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "outlineWidth", value: { type: "unit", unit: "px", value: 1 } },
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
  { property: "minHeight", value: { type: "unit", unit: "%", value: 100 } },
  {
    property: "fontFamily",
    value: { type: "fontFamily", value: ["Arial", "Roboto", "sans-serif"] },
  },
  { property: "fontSize", value: { type: "unit", unit: "px", value: 16 } },
  {
    property: "lineHeight",
    value: { type: "unit", unit: "number", value: 1.2 },
  },
  {
    property: "whiteSpaceCollapse",
    value: { type: "keyword", value: "preserve" },
  },
];

export const body: StyleDecl[] = [
  { property: "marginTop", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "marginRight",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "marginBottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "marginLeft", value: { type: "unit", unit: "number", value: 0 } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const hr: StyleDecl[] = [
  { property: "height", value: { type: "unit", unit: "number", value: 0 } },
  { property: "color", value: { type: "keyword", value: "inherit" } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const b: StyleDecl[] = [
  {
    property: "fontWeight",
    value: { type: "unit", unit: "number", value: 700 },
  },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const strong = b;

export const code: StyleDecl[] = [
  {
    property: "fontFamily",
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
  { property: "fontSize", value: { type: "unit", unit: "em", value: 1 } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const kbd = code;

export const samp = code;

export const pre = code;

export const small: StyleDecl[] = [
  { property: "fontSize", value: { type: "unit", unit: "%", value: 80 } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const sub: StyleDecl[] = [
  { property: "fontSize", value: { type: "unit", unit: "%", value: 75 } },
  { property: "lineHeight", value: { type: "unit", unit: "number", value: 0 } },
  { property: "position", value: { type: "keyword", value: "relative" } },
  { property: "verticalAlign", value: { type: "keyword", value: "baseline" } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "bottom", value: { type: "unit", unit: "em", value: -0.25 } },
];

export const sup: StyleDecl[] = [
  { property: "fontSize", value: { type: "unit", unit: "%", value: 75 } },
  { property: "lineHeight", value: { type: "unit", unit: "number", value: 0 } },
  { property: "position", value: { type: "keyword", value: "relative" } },
  { property: "verticalAlign", value: { type: "keyword", value: "baseline" } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "top", value: { type: "unit", unit: "em", value: -0.5 } },
];

export const table: StyleDecl[] = [
  { property: "textIndent", value: { type: "unit", unit: "number", value: 0 } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "borderTopColor", value: { type: "keyword", value: "inherit" } },
  {
    property: "borderRightColor",
    value: { type: "keyword", value: "inherit" },
  },
  {
    property: "borderBottomColor",
    value: { type: "keyword", value: "inherit" },
  },
  { property: "borderLeftColor", value: { type: "keyword", value: "inherit" } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
];

export const input: StyleDecl[] = [
  { property: "fontFamily", value: { type: "keyword", value: "inherit" } },
  { property: "fontSize", value: { type: "unit", unit: "%", value: 100 } },
  {
    property: "lineHeight",
    value: { type: "unit", unit: "number", value: 1.15 },
  },
  { property: "marginTop", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "marginRight",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "marginBottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "marginLeft", value: { type: "unit", unit: "number", value: 0 } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "borderTopStyle", value: { type: "keyword", value: "solid" } },
  { property: "borderRightStyle", value: { type: "keyword", value: "solid" } },
  { property: "borderBottomStyle", value: { type: "keyword", value: "solid" } },
  { property: "borderLeftStyle", value: { type: "keyword", value: "solid" } },
];

export const textarea = input;

export const optgroup: StyleDecl[] = [
  { property: "fontFamily", value: { type: "keyword", value: "inherit" } },
  { property: "fontSize", value: { type: "unit", unit: "%", value: 100 } },
  {
    property: "lineHeight",
    value: { type: "unit", unit: "number", value: 1.15 },
  },
  { property: "marginTop", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "marginRight",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "marginBottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "marginLeft", value: { type: "unit", unit: "number", value: 0 } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const radio: StyleDecl[] = [
  { property: "fontFamily", value: { type: "keyword", value: "inherit" } },
  { property: "fontSize", value: { type: "unit", unit: "%", value: 100 } },
  {
    property: "lineHeight",
    value: { type: "unit", unit: "number", value: 1.15 },
  },
  { property: "marginTop", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "marginRight",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "marginBottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "marginLeft", value: { type: "unit", unit: "number", value: 0 } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "borderTopStyle", value: { type: "keyword", value: "none" } },
  { property: "borderRightStyle", value: { type: "keyword", value: "none" } },
  { property: "borderBottomStyle", value: { type: "keyword", value: "none" } },
  { property: "borderLeftStyle", value: { type: "keyword", value: "none" } },
];

export const checkbox = radio;

export const button: StyleDecl[] = [
  { property: "fontFamily", value: { type: "keyword", value: "inherit" } },
  { property: "fontSize", value: { type: "unit", unit: "%", value: 100 } },
  {
    property: "lineHeight",
    value: { type: "unit", unit: "number", value: 1.15 },
  },
  { property: "marginTop", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "marginRight",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "marginBottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "marginLeft", value: { type: "unit", unit: "number", value: 0 } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  { property: "borderTopStyle", value: { type: "keyword", value: "solid" } },
  { property: "borderRightStyle", value: { type: "keyword", value: "solid" } },
  { property: "borderBottomStyle", value: { type: "keyword", value: "solid" } },
  { property: "borderLeftStyle", value: { type: "keyword", value: "solid" } },
  { property: "textTransform", value: { type: "keyword", value: "none" } },
];

export const select = button;

export const legend: StyleDecl[] = [
  { property: "paddingTop", value: { type: "unit", unit: "number", value: 0 } },
  {
    property: "paddingRight",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "paddingBottom",
    value: { type: "unit", unit: "number", value: 0 },
  },
  {
    property: "paddingLeft",
    value: { type: "unit", unit: "number", value: 0 },
  },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const progress: StyleDecl[] = [
  { property: "verticalAlign", value: { type: "keyword", value: "baseline" } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
];

export const summary: StyleDecl[] = [
  { property: "display", value: { type: "keyword", value: "list-item" } },
  { property: "boxSizing", value: { type: "keyword", value: "border-box" } },
  { property: "borderTopWidth", value: { type: "unit", unit: "px", value: 1 } },
  {
    property: "borderRightWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", unit: "px", value: 1 },
  },
];
