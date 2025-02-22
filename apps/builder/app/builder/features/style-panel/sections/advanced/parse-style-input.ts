import {
  type ParsedStyleDecl,
  properties,
  parseCss,
  camelCaseProperty,
} from "@webstudio-is/css-data";
import type { CssProperty, StyleProperty } from "@webstudio-is/css-engine";
import { lexer } from "css-tree";

type StyleDecl = Omit<ParsedStyleDecl, "property"> & {
  property: StyleProperty;
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
export const parseStyleInput = (css: string): Array<StyleDecl> => {
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
  if (camelCaseProperty(css as CssProperty) in properties) {
    return [
      {
        selector: "selector",
        property: camelCaseProperty(css as CssProperty),
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

  const hyphenatedStyles = parseCss(`selector{${css}}`);
  const newStyles: StyleDecl[] = [];

  for (const { property, ...styleDecl } of hyphenatedStyles) {
    // somethingunknown: red; -> --somethingunknown: red;
    if (
      // Note: currently in tests it returns unparsed, but in the client it returns invalid,
      // because we use native APIs when available in parseCss.
      styleDecl.value.type === "invalid" ||
      (styleDecl.value.type === "unparsed" &&
        property.startsWith("--") === false)
    ) {
      newStyles.push({
        ...styleDecl,
        property: `--${property}`,
      });
    } else {
      newStyles.push({
        ...styleDecl,
        property: camelCaseProperty(property),
      });
    }
  }

  return newStyles;
};
