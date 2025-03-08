import {
  propertiesData,
  parseCss,
  shorthandProperties,
} from "@webstudio-is/css-data";
import { type CssProperty, type CssStyleMap } from "@webstudio-is/css-engine";
import { lexer } from "css-tree";

// When user provides only a property name, we need to make it `property:;` to be able to parse it.
const ensureValue = (css: string) => {
  css = css.trim();

  // Is it a custom property "--foo"?
  if (css.startsWith("--") && lexer.match("<custom-ident>", css).matched) {
    return `${css}:;`;
  }
  // Is it a known longhand property?
  if (propertiesData[css as CssProperty]) {
    return `${css}:;`;
  }
  // Is it a known shorthand property?
  if (
    shorthandProperties.includes(css as (typeof shorthandProperties)[number])
  ) {
    return `${css}:;`;
  }
  // Is it a custom property without dashes "--foo"?
  if (lexer.match("<custom-ident>", `--${css}`).matched) {
    return `--${css}:;`;
  }

  return css;
};

/**
 * Does several attempts to parse:
 * - Custom property "--foo"
 * - Known regular property "color"
 * - Custom property without -- (user forgot to add)
 * - Custom property and value: --foo: red
 * - Property and value: color: red
 * - Multiple properties: color: red; background: blue
 */
export const parseStyleInput = (css: string): CssStyleMap => {
  css = ensureValue(css);

  const styles = parseCss(`selector{${css}}`);

  const styleMap: CssStyleMap = new Map();

  for (const { property, value } of styles) {
    // somethingunknown: red; -> --somethingunknown: red;
    if (
      // Note: currently in tests it returns unparsed, but in the client it returns invalid,
      // because we use native APIs when available in parseCss.
      value.type === "invalid" ||
      (value.type === "unparsed" && property.startsWith("--") === false)
    ) {
      styleMap.set(`--${property}`, value);
    } else {
      // @todo This should be returning { type: "guaranteedInvalid" }
      styleMap.set(property, value);
    }
  }
  return styleMap;
};
