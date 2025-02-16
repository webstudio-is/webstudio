import {
  properties,
  parseCss,
  type ParsedStyleDecl,
} from "@webstudio-is/css-data";
import { type StyleProperty } from "@webstudio-is/css-engine";
import { camelCase } from "change-case";
import { lexer } from "css-tree";

/**
 * Does several attempts to parse:
 * - Custom property "--foo"
 * - Known regular property "color"
 * - Custom property without -- (user forgot to add)
 * - Custom property and value: --foo: red
 * - Property and value: color: red
 * - Multiple properties: color: red; background: blue
 */
export const parseStyleInput = (css: string): Array<ParsedStyleDecl> => {
  css = css.trim();
  // Is it a custom property "--foo"?
  if (css.startsWith("--") && lexer.match("<custom-ident>", css).matched) {
    return [
      {
        selector: "selector",
        property: css as StyleProperty,
        value: { type: "unset", value: "" },
      },
    ];
  }

  // Is it a known regular property?
  const camelCasedProperty = camelCase(css);
  if (camelCasedProperty in properties) {
    return [
      {
        selector: "selector",
        property: css as StyleProperty,
        value: { type: "unset", value: "" },
      },
    ];
  }

  // Is it a custom property "--foo"?
  if (lexer.match("<custom-ident>", `--${css}`).matched) {
    return [
      {
        selector: "selector",
        property: `--${css}`,
        value: { type: "unset", value: "" },
      },
    ];
  }

  return parseCss(`selector{${css}}`);
};
