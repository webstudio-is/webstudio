/**
 * Based on https://github.com/sindresorhus/modern-normalize
 *
 * Attributions
 *
 * The MIT License (MIT)
 * Copyright (c) Nicolas Gallagher
 * Copyright (c) Jonathan Neal
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE
 */

// webstudio custom opinionated presets
import { borders } from "./presets";
import type { EmbedTemplateStyleDecl } from "../embed-template";

/**
Use a better box model (opinionated).
*/
const boxSizing = {
  property: "boxSizing",
  value: { type: "keyword", value: "border-box" },
} satisfies EmbedTemplateStyleDecl;

/**
 *  We dont support rules like this now, implement boxSizing for each used element
 *  *,
 * ::before,
 * ::after {
 *   box-sizing: border-box;
  }
*/
const baseStyle = [boxSizing, ...borders] satisfies EmbedTemplateStyleDecl[];

export const div = baseStyle;
export const address = baseStyle;
export const article = baseStyle;
export const aside = baseStyle;
export const figure = baseStyle;
export const footer = baseStyle;
export const header = baseStyle;
export const main = baseStyle;
export const nav = baseStyle;
export const section = baseStyle;
export const form = baseStyle;

export const h1 = baseStyle;
export const h2 = baseStyle;
export const h3 = baseStyle;
export const h4 = baseStyle;
export const h5 = baseStyle;
export const h6 = baseStyle;

export const i = baseStyle;

export const img = baseStyle;

export const a = baseStyle;
export const li = baseStyle;
export const ul = baseStyle;
export const ol = baseStyle;

export const p = baseStyle;
export const span = baseStyle;

// @todo for now not applied to html, as we don't have html element
/**
1. Correct the line height in all browsers.
2. Prevent adjustments of font size after orientation changes in iOS.
3. Use a more readable tab size (opinionated).
*/
export const html = [
  /* 1 */
  {
    property: "lineHeight",
    value: { type: "unit", value: 1.15, unit: "number" },
  },
  /* 2 */
  {
    property: "textSizeAdjust",
    value: { type: "unit", value: 100, unit: "%" },
  },
  /* 3 */
  {
    property: "tabSize",
    value: { type: "unit", value: 4, unit: "number" },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];

/**
1. Remove the margin in all browsers.
2. Improve consistency of default fonts in all browsers. (https://github.com/sindresorhus/modern-normalize/issues/3)
*/
export const body = [
  /* 1 */
  {
    property: "marginTop",
    value: { type: "unit", value: 0, unit: "number" },
  },
  {
    property: "marginRight",
    value: { type: "unit", value: 0, unit: "number" },
  },
  {
    property: "marginBottom",
    value: { type: "unit", value: 0, unit: "number" },
  },
  {
    property: "marginLeft",
    value: { type: "unit", value: 0, unit: "number" },
  },
  /* 2 */
  {
    property: "fontFamily",
    value: {
      type: "keyword",
      value: `system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'`,
    },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];

/**
1. Add the correct height in Firefox.
2. Correct the inheritance of border color in Firefox. (https://bugzilla.mozilla.org/show_bug.cgi?id=190655)
*/
export const hr = [
  /* 1 */
  {
    property: "height",
    value: { type: "unit", value: 0, unit: "number" },
  },
  /* 2 */
  {
    property: "color",
    value: { type: "keyword", value: "inherit" },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];

/**
Add the correct text decoration in Chrome, Edge, and Safari.

!!!Skipped as we don't support this logic!!!

abbr[title] {
 text-decoration: underline dotted;
}
*/

/**
Add the correct font weight in Edge and Safari.
*/
export const b = [
  {
    property: "fontWeight",
    value: { type: "keyword", value: "700" },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];
export const strong = b;

/**
1. Improve consistency of default fonts in all browsers. (https://github.com/sindresorhus/modern-normalize/issues/3)
2. Correct the odd 'em' font sizing in all browsers.
*/
export const code = [
  /* 1 */
  {
    property: "fontFamily",
    value: {
      type: "keyword",
      value: `ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace`,
    },
  },
  /* 2 */
  {
    property: "fontSize",
    value: { type: "unit", value: 1, unit: "em" },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];

export const kbd = code;
export const samp = code;
export const pre = code;

/**
Add the correct font size in all browsers.
*/

export const small = [
  {
    property: "fontSize",
    value: { type: "unit", value: 80, unit: "%" },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];

/**
Prevent 'sub' and 'sup' elements from affecting the line height in all browsers.
*/

const subSupBase = [
  {
    property: "fontSize",
    value: { type: "unit", value: 75, unit: "%" },
  },
  {
    property: "lineHeight",
    value: { type: "unit", value: 0, unit: "number" },
  },
  {
    property: "position",
    value: { type: "keyword", value: "relative" },
  },
  {
    property: "verticalAlign",
    value: { type: "keyword", value: "baseline" },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];

export const sub = [
  ...subSupBase,
  {
    property: "bottom",
    value: { type: "unit", value: -0.25, unit: "em" },
  },
] satisfies EmbedTemplateStyleDecl[];

export const sup = [
  ...subSupBase,
  {
    property: "top",
    value: { type: "unit", value: -0.5, unit: "em" },
  },
] satisfies EmbedTemplateStyleDecl[];

/*
Tabular data
============
*/

/**
1. Remove text indentation from table contents in Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=999088, https://bugs.webkit.org/show_bug.cgi?id=201297)
2. Correct table border color inheritance in Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=935729, https://bugs.webkit.org/show_bug.cgi?id=195016)
*/

export const table = [
  /* 1 */
  {
    property: "textIndent",
    value: { type: "unit", value: 0, unit: "number" },
  },
  ...borders,
  /* 2 */
  {
    property: "borderTopColor",
    value: { type: "keyword", value: "inherit" },
  },
  {
    property: "borderRightColor",
    value: { type: "keyword", value: "inherit" },
  },
  {
    property: "borderBottomColor",
    value: { type: "keyword", value: "inherit" },
  },
  {
    property: "borderLeftColor",
    value: { type: "keyword", value: "inherit" },
  },
  boxSizing,
] satisfies EmbedTemplateStyleDecl[];

/*
Forms
=====
*/

/**
1. Change the font styles in all browsers.
2. Remove the margin in Firefox and Safari.
*/

const buttonBase = [
  /* 1 */
  {
    property: "fontFamily",
    value: { type: "keyword", value: "inherit" },
  },
  {
    property: "fontSize",
    value: { type: "unit", value: 100, unit: "%" },
  },
  {
    property: "lineHeight",
    value: { type: "unit", value: 1.15, unit: "number" },
  },
  /* 2 */
  {
    property: "marginTop",
    value: { type: "unit", value: 0, unit: "number" },
  },
  {
    property: "marginRight",
    value: { type: "unit", value: 0, unit: "number" },
  },
  {
    property: "marginBottom",
    value: { type: "unit", value: 0, unit: "number" },
  },
  {
    property: "marginLeft",
    value: { type: "unit", value: 0, unit: "number" },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];

export const input = buttonBase;
export const optgroup = buttonBase;
export const textarea = buttonBase;

/**
Remove the inheritance of text transform in Edge and Firefox.
*/
export const button = [
  ...buttonBase,
  {
    property: "textTransform",
    value: { type: "keyword", value: "none" },
  },
] satisfies EmbedTemplateStyleDecl[];

export const select = button;

/**
Correct the inability to style clickable types in iOS and Safari.

!!!Skipped as we don't support this logic!!!

buttonBase,
[type='button'],
[type='reset'],
[type='submit'] {
  -webkit-appearance: buttonBase;
}
*/

/**
Remove the inner border and padding in Firefox.

!!!Skipped as we don't support this logic!!!

::-moz-focus-inner {
  border-style: none;
 padding: 0;
}
*/

/**
Restore the focus styles unset by the previous rule.

!!!Skipped as we don't support this logic!!!

:-moz-focusring {
  outline: 1px dotted ButtonText;
}
*/

/**
Remove the additional ':invalid' styles in Firefox.
See: https://github.com/mozilla/gecko-dev/blob/2f9eacd9d3d995c937b4251a5557d95d494c9be1/layout/style/res/forms.css#L728-L737

!!!Skipped as we don't support this logic!!!

:-moz-ui-invalid {
  box-shadow: none;
}
*/

/**
Remove the padding so developers are not caught out when they zero out 'fieldset' elements in all browsers.
*/

export const legend = [
  {
    property: "paddingTop",
    value: { type: "unit", value: 0, unit: "number" },
  },
  {
    property: "paddingRight",
    value: { type: "unit", value: 0, unit: "number" },
  },
  {
    property: "paddingBottom",
    value: { type: "unit", value: 0, unit: "number" },
  },
  {
    property: "paddingLeft",
    value: { type: "unit", value: 0, unit: "number" },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];

/**
Add the correct vertical alignment in Chrome and Firefox.
*/

export const progress = [
  {
    property: "verticalAlign",
    value: { type: "keyword", value: "baseline" },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];

/**
Correct the cursor style of increment and decrement buttons in Safari.

!!!Skipped as we don't support this logic!!!

::-webkit-inner-spin-buttonBase,
::-webkit-outer-spin-buttonBase {
  height: auto;
}
*/

/**
1. Correct the odd appearance in Chrome and Safari.
2. Correct the outline style in Safari.

!!!Skipped as we don't support this logic!!!

[type='search'] {
  -webkit-appearance: textfield;
 outline-offset: -2px;
}
*/

/**
Remove the inner padding in Chrome and Safari on macOS.

!!!Skipped as we don't support this logic!!!

::-webkit-search-decoration {
  -webkit-appearance: none;
}
*/

/**
1. Correct the inability to style clickable types in iOS and Safari.
2. Change font properties to 'inherit' in Safari.

!!!Skipped as we don't support this logic!!!

::-webkit-file-upload-buttonBase {
  -webkit-appearance: buttonBase;
 font: inherit;
}
*/

/*
Interactive
===========
*/

/*
Add the correct display in Chrome and Safari.
*/

export const summary = [
  {
    property: "display",
    value: { type: "keyword", value: "list-item" },
  },
  boxSizing,
  ...borders,
] satisfies EmbedTemplateStyleDecl[];
