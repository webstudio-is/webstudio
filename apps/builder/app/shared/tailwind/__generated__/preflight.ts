import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";

export const preflight: Record<
  string,
  undefined | { property: CssProperty; value: StyleValue }[]
> = {
  html: [
    {
      property: "line-height",
      value: { type: "unit", unit: "number", value: 1.5 },
    },
    {
      property: "text-size-adjust",
      value: { type: "unit", unit: "%", value: 100 },
    },
    { property: "tab-size", value: { type: "unit", unit: "number", value: 4 } },
    {
      property: "font-family",
      value: {
        type: "fontFamily",
        value: [
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
      },
    },
    {
      property: "font-feature-settings",
      value: { type: "keyword", value: "normal" },
    },
    {
      property: "font-variation-settings",
      value: { type: "keyword", value: "normal" },
    },
    {
      property: "-webkit-tap-highlight-color",
      value: { type: "keyword", value: "transparent" },
    },
  ],
  body: [
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
    { property: "line-height", value: { type: "keyword", value: "inherit" } },
  ],
  hr: [
    { property: "height", value: { type: "unit", unit: "number", value: 0 } },
    { property: "color", value: { type: "keyword", value: "inherit" } },
    {
      property: "border-top-width",
      value: { type: "unit", unit: "px", value: 1 },
    },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  h1: [
    { property: "font-size", value: { type: "keyword", value: "inherit" } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  h2: [
    { property: "font-size", value: { type: "keyword", value: "inherit" } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  h3: [
    { property: "font-size", value: { type: "keyword", value: "inherit" } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  h4: [
    { property: "font-size", value: { type: "keyword", value: "inherit" } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  h5: [
    { property: "font-size", value: { type: "keyword", value: "inherit" } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  h6: [
    { property: "font-size", value: { type: "keyword", value: "inherit" } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  a: [
    { property: "color", value: { type: "keyword", value: "inherit" } },
    {
      property: "text-decoration-line",
      value: { type: "keyword", value: "inherit" },
    },
    {
      property: "text-decoration-style",
      value: { type: "keyword", value: "inherit" },
    },
    {
      property: "text-decoration-color",
      value: { type: "keyword", value: "inherit" },
    },
  ],
  b: [{ property: "font-weight", value: { type: "keyword", value: "bolder" } }],
  strong: [
    { property: "font-weight", value: { type: "keyword", value: "bolder" } },
  ],
  code: [
    {
      property: "font-family",
      value: {
        type: "fontFamily",
        value: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
    {
      property: "font-feature-settings",
      value: { type: "keyword", value: "normal" },
    },
    {
      property: "font-variation-settings",
      value: { type: "keyword", value: "normal" },
    },
    { property: "font-size", value: { type: "unit", unit: "em", value: 1 } },
  ],
  kbd: [
    {
      property: "font-family",
      value: {
        type: "fontFamily",
        value: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
    {
      property: "font-feature-settings",
      value: { type: "keyword", value: "normal" },
    },
    {
      property: "font-variation-settings",
      value: { type: "keyword", value: "normal" },
    },
    { property: "font-size", value: { type: "unit", unit: "em", value: 1 } },
  ],
  samp: [
    {
      property: "font-family",
      value: {
        type: "fontFamily",
        value: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
    {
      property: "font-feature-settings",
      value: { type: "keyword", value: "normal" },
    },
    {
      property: "font-variation-settings",
      value: { type: "keyword", value: "normal" },
    },
    { property: "font-size", value: { type: "unit", unit: "em", value: 1 } },
  ],
  pre: [
    {
      property: "font-family",
      value: {
        type: "fontFamily",
        value: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
    {
      property: "font-feature-settings",
      value: { type: "keyword", value: "normal" },
    },
    {
      property: "font-variation-settings",
      value: { type: "keyword", value: "normal" },
    },
    { property: "font-size", value: { type: "unit", unit: "em", value: 1 } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  small: [
    { property: "font-size", value: { type: "unit", unit: "%", value: 80 } },
  ],
  sub: [
    { property: "font-size", value: { type: "unit", unit: "%", value: 75 } },
    {
      property: "line-height",
      value: { type: "unit", unit: "number", value: 0 },
    },
    { property: "position", value: { type: "keyword", value: "relative" } },
    {
      property: "vertical-align",
      value: { type: "keyword", value: "baseline" },
    },
    { property: "bottom", value: { type: "unit", unit: "em", value: -0.25 } },
  ],
  sup: [
    { property: "font-size", value: { type: "unit", unit: "%", value: 75 } },
    {
      property: "line-height",
      value: { type: "unit", unit: "number", value: 0 },
    },
    { property: "position", value: { type: "keyword", value: "relative" } },
    {
      property: "vertical-align",
      value: { type: "keyword", value: "baseline" },
    },
    { property: "top", value: { type: "unit", unit: "em", value: -0.5 } },
  ],
  table: [
    {
      property: "text-indent",
      value: { type: "unit", unit: "number", value: 0 },
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
    {
      property: "border-collapse",
      value: { type: "keyword", value: "collapse" },
    },
  ],
  button: [
    { property: "font-family", value: { type: "keyword", value: "inherit" } },
    {
      property: "font-feature-settings",
      value: { type: "keyword", value: "inherit" },
    },
    {
      property: "font-variation-settings",
      value: { type: "keyword", value: "inherit" },
    },
    { property: "font-size", value: { type: "unit", unit: "%", value: 100 } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    { property: "line-height", value: { type: "keyword", value: "inherit" } },
    { property: "color", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
    { property: "text-transform", value: { type: "keyword", value: "none" } },
    { property: "appearance", value: { type: "keyword", value: "button" } },
    {
      property: "background-color",
      value: { type: "keyword", value: "transparent" },
    },
    {
      property: "background-image",
      value: { type: "layers", value: [{ type: "keyword", value: "none" }] },
    },
    { property: "cursor", value: { type: "keyword", value: "pointer" } },
  ],
  input: [
    { property: "font-family", value: { type: "keyword", value: "inherit" } },
    {
      property: "font-feature-settings",
      value: { type: "keyword", value: "inherit" },
    },
    {
      property: "font-variation-settings",
      value: { type: "keyword", value: "inherit" },
    },
    { property: "font-size", value: { type: "unit", unit: "%", value: 100 } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    { property: "line-height", value: { type: "keyword", value: "inherit" } },
    { property: "color", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  optgroup: [
    { property: "font-family", value: { type: "keyword", value: "inherit" } },
    {
      property: "font-feature-settings",
      value: { type: "keyword", value: "inherit" },
    },
    {
      property: "font-variation-settings",
      value: { type: "keyword", value: "inherit" },
    },
    { property: "font-size", value: { type: "unit", unit: "%", value: 100 } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    { property: "line-height", value: { type: "keyword", value: "inherit" } },
    { property: "color", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  select: [
    { property: "font-family", value: { type: "keyword", value: "inherit" } },
    {
      property: "font-feature-settings",
      value: { type: "keyword", value: "inherit" },
    },
    {
      property: "font-variation-settings",
      value: { type: "keyword", value: "inherit" },
    },
    { property: "font-size", value: { type: "unit", unit: "%", value: 100 } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    { property: "line-height", value: { type: "keyword", value: "inherit" } },
    { property: "color", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
    { property: "text-transform", value: { type: "keyword", value: "none" } },
  ],
  textarea: [
    { property: "font-family", value: { type: "keyword", value: "inherit" } },
    {
      property: "font-feature-settings",
      value: { type: "keyword", value: "inherit" },
    },
    {
      property: "font-variation-settings",
      value: { type: "keyword", value: "inherit" },
    },
    { property: "font-size", value: { type: "unit", unit: "%", value: 100 } },
    { property: "font-weight", value: { type: "keyword", value: "inherit" } },
    { property: "line-height", value: { type: "keyword", value: "inherit" } },
    { property: "color", value: { type: "keyword", value: "inherit" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
    { property: "resize", value: { type: "keyword", value: "vertical" } },
  ],
  progress: [
    {
      property: "vertical-align",
      value: { type: "keyword", value: "baseline" },
    },
  ],
  summary: [
    { property: "display", value: { type: "keyword", value: "list-item" } },
  ],
  blockquote: [
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  dl: [
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  dd: [
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  figure: [
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  p: [
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  fieldset: [
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  legend: [
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
  ],
  ol: [
    {
      property: "list-style-position",
      value: { type: "keyword", value: "outside" },
    },
    { property: "list-style-image", value: { type: "keyword", value: "none" } },
    { property: "list-style-type", value: { type: "keyword", value: "none" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  ul: [
    {
      property: "list-style-position",
      value: { type: "keyword", value: "outside" },
    },
    { property: "list-style-image", value: { type: "keyword", value: "none" } },
    { property: "list-style-type", value: { type: "keyword", value: "none" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  menu: [
    {
      property: "list-style-position",
      value: { type: "keyword", value: "outside" },
    },
    { property: "list-style-image", value: { type: "keyword", value: "none" } },
    { property: "list-style-type", value: { type: "keyword", value: "none" } },
    {
      property: "margin-top",
      value: { type: "unit", unit: "number", value: 0 },
    },
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
  ],
  dialog: [
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
  ],
  img: [
    { property: "display", value: { type: "keyword", value: "block" } },
    { property: "vertical-align", value: { type: "keyword", value: "middle" } },
    { property: "max-width", value: { type: "unit", unit: "%", value: 100 } },
    { property: "height", value: { type: "keyword", value: "auto" } },
  ],
  video: [
    { property: "display", value: { type: "keyword", value: "block" } },
    { property: "vertical-align", value: { type: "keyword", value: "middle" } },
    { property: "max-width", value: { type: "unit", unit: "%", value: 100 } },
    { property: "height", value: { type: "keyword", value: "auto" } },
  ],
  canvas: [
    { property: "display", value: { type: "keyword", value: "block" } },
    { property: "vertical-align", value: { type: "keyword", value: "middle" } },
  ],
  audio: [
    { property: "display", value: { type: "keyword", value: "block" } },
    { property: "vertical-align", value: { type: "keyword", value: "middle" } },
  ],
  iframe: [
    { property: "display", value: { type: "keyword", value: "block" } },
    { property: "vertical-align", value: { type: "keyword", value: "middle" } },
  ],
  embed: [
    { property: "display", value: { type: "keyword", value: "block" } },
    { property: "vertical-align", value: { type: "keyword", value: "middle" } },
  ],
  object: [
    { property: "display", value: { type: "keyword", value: "block" } },
    { property: "vertical-align", value: { type: "keyword", value: "middle" } },
  ],
};
