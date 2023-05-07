// all styles are taken from following source
// https://searchfox.org/mozilla-central/source/layout/style/res/html.css
// https://chromium.googlesource.com/chromium/blink/+/master/Source/core/css/html.css
// https://trac.webkit.org/browser/trunk/Source/WebCore/css/html.css

import type { htmlTags as HtmlTags } from "html-tags";
import type { StyleProperty, StyleValue } from "./schema";

type StyleDecl = {
  property: StyleProperty;
  value: StyleValue;
};
type Styles = StyleDecl[];

export type Html = {
  [tag in HtmlTags]?: Styles;
};

const displayBlock: Styles[number] = {
  property: "display",
  value: { type: "keyword", value: "block" },
};

const mt1em: Styles[number] = {
  property: "marginTop",
  value: { type: "unit", value: 1, unit: "em" },
};

const mb1em: Styles[number] = {
  property: "marginBottom",
  value: { type: "unit", value: 1, unit: "em" },
};

const ml40px: Styles[number] = {
  property: "marginLeft",
  value: { type: "unit", value: 40, unit: "px" },
};

const mr40px: Styles[number] = {
  property: "marginRight",
  value: { type: "unit", value: 40, unit: "px" },
};

const pl40px: Styles[number] = {
  property: "paddingLeft",
  value: { type: "unit", value: 40, unit: "px" },
};

const fontWeightBold: Styles[number] = {
  property: "fontWeight",
  // in browsers defined as bold
  // though builder accepts only numeric values
  value: { type: "keyword", value: "700" },
};

const fontStyleItalic: Styles[number] = {
  property: "fontStyle",
  value: { type: "keyword", value: "italic" },
};

const pt1px: Styles[number] = {
  property: "paddingTop",
  value: { type: "unit", value: 1, unit: "px" },
};

const pr1px: Styles[number] = {
  property: "paddingRight",
  value: { type: "unit", value: 1, unit: "px" },
};

const pb1px: Styles[number] = {
  property: "paddingBottom",
  value: { type: "unit", value: 1, unit: "px" },
};

const pl1px: Styles[number] = {
  property: "paddingLeft",
  value: { type: "unit", value: 1, unit: "px" },
};

/* blocks */

export const article: Styles = [displayBlock];
export {
  article as aside,
  article as details,
  article as div,
  article as dt,
  article as figcaption,
  article as footer,
  article as form,
  article as header,
  article as hgroup,
  article as html,
  article as main,
  article as nav,
  article as section,
  article as summary,
};

export const body: Styles = [
  displayBlock,
  {
    property: "marginTop",
    value: { type: "unit", value: 8, unit: "px" },
  },
  {
    property: "marginRight",
    value: { type: "unit", value: 8, unit: "px" },
  },
  {
    property: "marginBottom",
    value: { type: "unit", value: 8, unit: "px" },
  },
  {
    property: "marginLeft",
    value: { type: "unit", value: 8, unit: "px" },
  },
];

export const p: Styles = [displayBlock, mt1em, mb1em];
export { p as dl };

export const dd: Styles = [displayBlock, ml40px];

export const blockquote: Styles = [displayBlock, mt1em, mb1em, ml40px, mr40px];
export { blockquote as figure };

export const address: Styles = [displayBlock, fontStyleItalic];

// h1 font-size, margin-top and margin-bottom depend on outer tags
// so better define statically in preset styles
export const h1: Styles = [
  displayBlock,
  fontWeightBold,
  {
    property: "fontSize",
    value: { type: "unit", value: 2, unit: "em" },
  },
  {
    property: "marginTop",
    value: { type: "unit", value: 0.67, unit: "em" },
  },
  {
    property: "marginBottom",
    value: { type: "unit", value: 0.67, unit: "em" },
  },
];

export const h2: Styles = [
  displayBlock,
  fontWeightBold,
  {
    property: "fontSize",
    value: { type: "unit", value: 1.5, unit: "em" },
  },
  {
    property: "marginTop",
    value: { type: "unit", value: 0.83, unit: "em" },
  },
  {
    property: "marginBottom",
    value: { type: "unit", value: 0.83, unit: "em" },
  },
];

export const h3: Styles = [
  displayBlock,
  fontWeightBold,
  {
    property: "fontSize",
    value: { type: "unit", value: 1.17, unit: "em" },
  },
  {
    property: "marginTop",
    value: { type: "unit", value: 1, unit: "em" },
  },
  {
    property: "marginBottom",
    value: { type: "unit", value: 1, unit: "em" },
  },
];

export const h4: Styles = [
  displayBlock,
  fontWeightBold,
  {
    property: "marginTop",
    value: { type: "unit", value: 1.33, unit: "em" },
  },
  {
    property: "marginBottom",
    value: { type: "unit", value: 1.33, unit: "em" },
  },
];

export const h5: Styles = [
  displayBlock,
  fontWeightBold,
  {
    property: "fontSize",
    value: { type: "unit", value: 0.83, unit: "em" },
  },
  {
    property: "marginTop",
    value: { type: "unit", value: 1.67, unit: "em" },
  },
  {
    property: "marginBottom",
    value: { type: "unit", value: 1.67, unit: "em" },
  },
];

export const h6: Styles = [
  displayBlock,
  fontWeightBold,
  {
    property: "fontSize",
    value: { type: "unit", value: 0.67, unit: "em" },
  },
  {
    property: "marginTop",
    value: { type: "unit", value: 2.33, unit: "em" },
  },
  {
    property: "marginBottom",
    value: { type: "unit", value: 2.33, unit: "em" },
  },
];

export const pre: Styles = [
  displayBlock,
  {
    property: "whiteSpace",
    value: { type: "keyword", value: "pre" },
  },
  mt1em,
  mb1em,
];

/* tables */

export const table: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "table" },
  },
  {
    property: "borderSpacing",
    value: { type: "unit", value: 2, unit: "px" },
  },
  {
    property: "borderCollapse",
    value: { type: "keyword", value: "separate" },
  },
  {
    property: "boxSizing",
    value: { type: "keyword", value: "border-box" },
  },
  {
    property: "borderSpacing",
    value: { type: "unit", value: 0, unit: "number" },
  },
];

export const caption: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "table" },
  },
  {
    property: "textAlign",
    value: { type: "keyword", value: "center" },
  },
];

export const tr: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "table-row" },
  },
  {
    property: "verticalAlign",
    value: { type: "keyword", value: "inherit" },
  },
];

export const col: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "table-column" },
  },
];

export const colgroup: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "table-column-group" },
  },
];

export const tbody: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "table-row-group" },
  },
  {
    property: "verticalAlign",
    value: { type: "keyword", value: "middle" },
  },
];

export const thead: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "table-header-group" },
  },
  {
    property: "verticalAlign",
    value: { type: "keyword", value: "middle" },
  },
];

export const tfoot: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "table-footer-group" },
  },
  {
    property: "verticalAlign",
    value: { type: "keyword", value: "middle" },
  },
];

export const td: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "table-cell" },
  },
  {
    property: "verticalAlign",
    value: { type: "keyword", value: "inherit" },
  },
  {
    property: "textAlign",
    value: { type: "keyword", value: "unset" },
  },
  pt1px,
  pr1px,
  pb1px,
  pl1px,
];

export const th: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "table-cell" },
  },
  {
    property: "verticalAlign",
    value: { type: "keyword", value: "inherit" },
  },
  fontWeightBold,
  pt1px,
  pr1px,
  pb1px,
  pl1px,
];

/* inlines */

export const b: Styles = [
  // in firefox defined as bolder
  fontWeightBold,
];
export { b as strong };

export const i: Styles = [fontStyleItalic];
export { i as cite, i as em, i as var, i as dfn };

export const code: Styles = [
  {
    property: "fontFamily",
    // in firefox defined as -moz-fixed
    value: { type: "fontFamily", value: ["monospace"] },
  },
];
export { code as kbd, code as samp };

export const mark: Styles = [
  {
    property: "backgroundColor",
    // in firefox defined as Mark
    value: { type: "keyword", value: "yellow" },
  },
  {
    property: "color",
    // in firefox defined as MarkText
    value: { type: "keyword", value: "black" },
  },
];

export const u: Styles = [
  {
    property: "textDecorationStyle",
    value: { type: "keyword", value: "underline" },
  },
];
export { u as ins };

export const s: Styles = [
  {
    property: "textDecorationStyle",
    value: { type: "keyword", value: "line-through" },
  },
];
export { s as del };

export const sub: Styles = [
  {
    property: "verticalAlign",
    value: { type: "keyword", value: "sub" },
  },
  {
    property: "fontSize",
    value: { type: "keyword", value: "smaller" },
  },
];

export const sup: Styles = [
  {
    property: "verticalAlign",
    value: { type: "keyword", value: "super" },
  },
  {
    property: "fontSize",
    value: { type: "keyword", value: "smaller" },
  },
];

export const a: Styles = [
  {
    property: "textDecorationLine",
    value: { type: "keyword", value: "underline" },
  },
  {
    property: "cursor",
    value: { type: "keyword", value: "pointer" },
  },
];

/* lists */

// nested lists have no top/bottom margins
// so better redefine statically in preset
export const ul: Styles = [
  displayBlock,
  {
    property: "listStyleType",
    value: { type: "keyword", value: "disc" },
  },
  mt1em,
  mb1em,
  pl40px,
];

export const ol: Styles = [
  displayBlock,
  {
    property: "listStyleType",
    value: { type: "keyword", value: "decimal" },
  },
  mt1em,
  mb1em,
  pl40px,
];

export const li: Styles = [
  {
    property: "display",
    value: { type: "keyword", value: "list-item" },
  },
  {
    property: "textAlign",
    value: { type: "keyword", value: "match-parent" },
  },
];

/* leafs */

export const hr: Styles = [
  {
    property: "color",
    value: { type: "keyword", value: "gray" },
  },

  {
    property: "borderTopWidth",
    value: { type: "unit", value: 1, unit: "px" },
  },
  {
    property: "borderRightWidth",
    value: { type: "unit", value: 1, unit: "px" },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", value: 1, unit: "px" },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", value: 1, unit: "px" },
  },

  {
    property: "borderTopStyle",
    value: { type: "keyword", value: "inset" },
  },
  {
    property: "borderRightStyle",
    value: { type: "keyword", value: "inset" },
  },
  {
    property: "borderBottomStyle",
    value: { type: "keyword", value: "inset" },
  },
  {
    property: "borderLeftStyle",
    value: { type: "keyword", value: "inset" },
  },

  {
    property: "marginTop",
    value: { type: "unit", value: 0.5, unit: "em" },
  },
  {
    property: "marginBottom",
    value: { type: "unit", value: 0.5, unit: "em" },
  },
  {
    property: "marginLeft",
    value: { type: "keyword", value: "auto" },
  },
  {
    property: "marginRight",
    value: { type: "keyword", value: "auto" },
  },

  // firefox only
  {
    property: "overflow",
    value: { type: "keyword", value: "hidden" },
  },

  /* This is not really per spec but all browsers define it */
  displayBlock,
];
