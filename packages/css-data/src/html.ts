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

const display = (value: string): Styles[number] => ({
  property: "display",
  value: { type: "keyword", value },
});

const marginTop = (value: number, unit?: "em" | "px"): Styles[number] => ({
  property: "marginTop",
  value: { type: "unit", value, unit: unit ?? "number" },
});

const marginRight = (value: number, unit?: "em" | "px"): Styles[number] => ({
  property: "marginRight",
  value: { type: "unit", value, unit: unit ?? "number" },
});

const marginBottom = (value: number, unit?: "em" | "px"): Styles[number] => ({
  property: "marginBottom",
  value: { type: "unit", value, unit: unit ?? "number" },
});

const marginLeft = (value: number, unit?: "em" | "px"): Styles[number] => ({
  property: "marginLeft",
  value: { type: "unit", value, unit: unit ?? "number" },
});

const paddingTop = (value: number, unit: "em" | "px"): Styles[number] => ({
  property: "paddingTop",
  value: { type: "unit", value, unit },
});

const paddingRight = (value: number, unit: "em" | "px"): Styles[number] => ({
  property: "paddingRight",
  value: { type: "unit", value, unit },
});

const paddingBottom = (value: number, unit: "em" | "px"): Styles[number] => ({
  property: "paddingBottom",
  value: { type: "unit", value, unit },
});

const paddingLeft = (value: number, unit: "em" | "px"): Styles[number] => ({
  property: "paddingLeft",
  value: { type: "unit", value, unit },
});

const color = (value: string): Styles[number] => ({
  property: "color",
  value: { type: "keyword", value },
});

const fontSize = (value: number, unit: "em"): Styles[number] => ({
  property: "fontSize",
  value: { type: "unit", value, unit },
});

const fontWeight = (value: "bold"): Styles[number] => ({
  property: "fontWeight",
  value: { type: "keyword", value },
});

const fontStyle = (value: "italic"): Styles[number] => ({
  property: "fontStyle",
  value: { type: "keyword", value },
});

const textAlign = (value: string): Styles[number] => ({
  property: "textAlign",
  value: { type: "keyword", value },
});

const verticalAlign = (value: string): Styles[number] => ({
  property: "verticalAlign",
  value: { type: "keyword", value },
});

const whiteSpace = (value: string): Styles[number] => ({
  property: "whiteSpace",
  value: { type: "keyword", value },
});

const cursor = (value: string): Styles[number] => ({
  property: "cursor",
  value: { type: "keyword", value },
});

const borderWidth = (value: number, unit: "px"): Styles => [
  {
    property: "borderTopWidth",
    value: { type: "unit", value, unit },
  },
  {
    property: "borderRightWidth",
    value: { type: "unit", value, unit },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", value, unit },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", value, unit },
  },
];

const borderStyle = (value: string): Styles => [
  {
    property: "borderTopStyle",
    value: { type: "keyword", value },
  },
  {
    property: "borderRightStyle",
    value: { type: "keyword", value },
  },
  {
    property: "borderBottomStyle",
    value: { type: "keyword", value },
  },
  {
    property: "borderLeftStyle",
    value: { type: "keyword", value },
  },
];

const borderColor = (value: string): Styles => [
  {
    property: "borderTopColor",
    value: { type: "keyword", value },
  },
  {
    property: "borderRightColor",
    value: { type: "keyword", value },
  },
  {
    property: "borderBottomColor",
    value: { type: "keyword", value },
  },
  {
    property: "borderLeftColor",
    value: { type: "keyword", value },
  },
];

const appearance = (value: string): Styles[number] => ({
  property: "appearance",
  value: { type: "keyword", value },
});

const userSelect = (value: string): Styles[number] => ({
  property: "userSelect",
  value: { type: "keyword", value },
});

const boxSizing = (value: string): Styles[number] => ({
  property: "boxSizing",
  value: { type: "keyword", value },
});

/* blocks */

export const article: Styles = [display("block")];
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
  display("block"),
  marginTop(8, "px"),
  marginRight(8, "px"),
  marginBottom(8, "px"),
  marginLeft(8, "px"),
];

export const p: Styles = [
  display("block"),
  marginTop(1, "em"),
  marginBottom(1, "em"),
];
export { p as dl };

export const dd: Styles = [display("block"), marginLeft(40, "px")];

export const blockquote: Styles = [
  display("block"),
  marginTop(1, "em"),
  marginBottom(1, "em"),
  marginLeft(40, "px"),
  marginRight(40, "px"),
];
export { blockquote as figure };

export const address: Styles = [display("block"), fontStyle("italic")];

// h1 font-size, margin-top and margin-bottom depend on outer tags
// so better define statically in preset styles
export const h1: Styles = [
  display("block"),
  fontWeight("bold"),
  fontSize(2, "em"),
  marginTop(0.67, "em"),
  marginBottom(0.67, "em"),
];

export const h2: Styles = [
  display("block"),
  fontWeight("bold"),
  fontSize(1.5, "em"),
  marginTop(0.83, "em"),
  marginBottom(0.83, "em"),
];

export const h3: Styles = [
  display("block"),
  fontWeight("bold"),
  fontSize(1.17, "em"),
  marginTop(1, "em"),
  marginBottom(1, "em"),
];

export const h4: Styles = [
  display("block"),
  fontWeight("bold"),
  marginTop(1.33, "em"),
  marginBottom(1.33, "em"),
];

export const h5: Styles = [
  display("block"),
  fontWeight("bold"),
  fontSize(0.83, "em"),
  marginTop(1.67, "em"),
  marginBottom(1.67, "em"),
];

export const h6: Styles = [
  display("block"),
  fontWeight("bold"),
  fontSize(0.67, "em"),
  marginTop(2.33, "em"),
  marginBottom(2.33, "em"),
];

export const pre: Styles = [
  display("block"),
  whiteSpace("pre"),
  marginTop(1, "em"),
  marginBottom(1, "em"),
];

/* tables */

export const table: Styles = [
  display("table"),
  {
    property: "borderSpacing",
    value: { type: "unit", value: 2, unit: "px" },
  },
  {
    property: "borderCollapse",
    value: { type: "keyword", value: "separate" },
  },
  boxSizing("border-box"),
  {
    property: "textIndent",
    value: { type: "unit", value: 0, unit: "number" },
  },
];

export const caption: Styles = [display("table-caption"), textAlign("center")];

export const tr: Styles = [display("table-row"), verticalAlign("inherit")];

export const col: Styles = [display("table-column")];

export const colgroup: Styles = [display("table-column-group")];

export const tbody: Styles = [
  display("table-row-group"),
  verticalAlign("middle"),
];

export const thead: Styles = [
  display("table-header-group"),
  verticalAlign("middle"),
];

export const tfoot: Styles = [
  display("table-footer-group"),
  verticalAlign("middle"),
];

export const td: Styles = [
  display("table-cell"),
  verticalAlign("inherit"),
  paddingTop(1, "px"),
  paddingRight(1, "px"),
  paddingBottom(1, "px"),
  paddingLeft(1, "px"),
];

export const th: Styles = [
  display("table-cell"),
  verticalAlign("inherit"),
  fontWeight("bold"),
  paddingTop(1, "px"),
  paddingRight(1, "px"),
  paddingBottom(1, "px"),
  paddingLeft(1, "px"),
];

/* inlines */

export const b: Styles = [
  // in firefox defined as bolder
  fontWeight("bold"),
];
export { b as strong };

export const i: Styles = [fontStyle("italic")];
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
  // in firefox defined as MarkText
  color("black"),
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
  verticalAlign("sub"),
  {
    property: "fontSize",
    value: { type: "keyword", value: "smaller" },
  },
];

export const sup: Styles = [
  verticalAlign("super"),
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
  cursor("pointer"),
  {
    property: "color",
    value: { type: "rgb", r: 0, g: 0, b: 238, alpha: 1 },
  },
  // active and visited states are not defined as usually overriden with stateless color
  // and modeling var-like defaults is too complex
];

/* lists */

// nested lists have no top/bottom margins
// so better redefine statically in preset
export const ul: Styles = [
  display("block"),
  {
    property: "listStyleType",
    value: { type: "keyword", value: "disc" },
  },
  marginTop(1, "em"),
  marginBottom(1, "em"),
  paddingLeft(40, "px"),
];

export const ol: Styles = [
  display("block"),
  {
    property: "listStyleType",
    value: { type: "keyword", value: "decimal" },
  },
  marginTop(1, "em"),
  marginBottom(1, "em"),
  paddingLeft(40, "px"),
];

export const li: Styles = [display("list-item"), textAlign("match-parent")];

/* leafs */

export const hr: Styles = [
  color("gray"),
  ...borderWidth(1, "px"),
  ...borderStyle("inset"),
  marginTop(0.5, "em"),
  marginBottom(0.5, "em"),
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
  display("block"),
];

/**
 * forms
 * https://searchfox.org/mozilla-central/source/layout/style/res/forms.css
 **/

const formControlReset: Styles = [
  // in firefox defined as FieldText
  color("initial"),
  { property: "letterSpacing", value: { type: "keyword", value: "normal" } },
  { property: "wordSpacing", value: { type: "keyword", value: "normal" } },
  { property: "lineHeight", value: { type: "keyword", value: "normal" } },
  { property: "textTransform", value: { type: "keyword", value: "none" } },
  { property: "textIndent", value: { type: "unit", value: 0, unit: "number" } },
  { property: "textShadow", value: { type: "keyword", value: "none" } },
  display("inline-block"),
  textAlign("start"),
];

export const legend: Styles = [
  display("block"),
  paddingLeft(2, "px"),
  paddingRight(2, "px"),
];

export const fieldset: Styles = [
  display("block"),
  marginLeft(2, "px"),
  marginRight(2, "px"),
  paddingTop(0.35, "em"),
  paddingBottom(0.625, "em"),
  paddingLeft(0.75, "em"),
  paddingRight(0.75, "em"),
  ...borderWidth(2, "px"),
  // in browsers defined as groove
  ...borderStyle("solid"),
  ...borderColor("ThreeDFace"),
  { property: "minWidth", value: { type: "keyword", value: "min-content" } },
];

export const label: Styles = [cursor("default")];

export const input: Styles = [
  appearance("auto"),
  paddingTop(1, "px"),
  paddingRight(1, "px"),
  paddingBottom(1, "px"),
  paddingLeft(1, "px"),
  ...borderWidth(2, "px"),
  // in browsers defined as inset
  ...borderStyle("solid"),
  // in firefox defined as Field
  { property: "backgroundColor", value: { type: "keyword", value: "white" } },
  cursor("text"),
];

export const textarea: Styles = [
  ...formControlReset,
  appearance("auto"),
  marginTop(1, "px"),
  marginBottom(1, "px"),
  // in firefox 2px
  ...borderWidth(1, "px"),
  // in browsers defined as inset
  ...borderStyle("solid"),
  paddingTop(2, "px"),
  paddingRight(2, "px"),
  paddingBottom(2, "px"),
  paddingLeft(2, "px"),
  // in firefox defined as Field
  { property: "backgroundColor", value: { type: "keyword", value: "white" } },
  verticalAlign("text-bottom"),
  cursor("text"),
  { property: "resize", value: { type: "keyword", value: "both" } },
  whiteSpace("pre-wrap"),
  {
    property: "wordWrap",
    value: { type: "keyword", value: "break-word" },
  },
];

export const select: Styles = [
  ...formControlReset,
  display("inline-block"),
  marginTop(0),
  marginRight(0),
  marginBottom(0),
  marginLeft(0),
  paddingTop(1, "px"),
  paddingBottom(1, "px"),
  paddingRight(4, "px"),
  paddingLeft(4, "px"),
  ...borderWidth(2, "px"),
  // in browsers defined as inset
  ...borderStyle("solid"),
  whiteSpace("nowrap"),
  {
    property: "wordWrap",
    value: { type: "keyword", value: "normal" },
  },
  cursor("default"),
  boxSizing("border-box"),
  userSelect("none"),
  {
    property: "overflow",
    value: { type: "keyword", value: "clip" },
  },
  verticalAlign("baseline"),
  appearance("auto"),
];

export const option: Styles = [
  display("block"),
  { property: "float", value: { type: "keyword", value: "none" } },
  { property: "position", value: { type: "keyword", value: "static" } },
  { property: "minHeight", value: { type: "unit", value: 1, unit: "em" } },
  paddingTop(2, "px"),
  paddingBottom(2, "px"),
  paddingRight(2, "px"),
  paddingLeft(4, "px"),
  userSelect("none"),
  whiteSpace("nowrap"),
  {
    property: "wordWrap",
    value: { type: "keyword", value: "normal" },
  },
];

export const button: Styles = [
  ...formControlReset,
  appearance("auto"),
  // in firefox defined as 1px 8px
  paddingTop(2, "px"),
  paddingBottom(3, "px"),
  paddingLeft(6, "px"),
  paddingRight(6, "px"),
  ...borderWidth(2, "px"),
  // in browsers defined as outset
  ...borderStyle("solid"),
  cursor("default"),
  boxSizing("border-box"),
  userSelect("none"),
  textAlign("center"),
  {
    property: "backgroundColor",
    // in browsers defined as ButtonFace
    value: { type: "keyword", value: "lightgray" },
  },
];
