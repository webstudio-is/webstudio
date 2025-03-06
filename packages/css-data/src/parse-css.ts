import { camelCase } from "change-case";
import * as csstree from "css-tree";
import {
  StyleValue,
  type CssProperty,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { parseCssValue as parseCssValueLonghand } from "./parse-css-value";
import { expandShorthands } from "./shorthands";

export type ParsedStyleDecl = {
  breakpoint?: string;
  selector: string;
  state?: string;
  property: CssProperty;
  value: StyleValue;
};

// @todo we don't parse correctly most of them if not all
const prefixedProperties = [
  "-webkit-box-orient",
  "-webkit-line-clamp",
  "-webkit-font-smoothing",
  "-moz-osx-font-smoothing",
  "-webkit-tap-highlight-color",
  "-webkit-overflow-scrolling",
];
const prefixes = ["webkit", "moz", "ms", "o"];
const prefixRegex = new RegExp(`^-(${prefixes.join("|")})-`);

const normalizeProperty = (property: string): CssProperty => {
  // convert unprefixed used by webflow version into prefixed one
  if (property === "tap-highlight-color") {
    return "-webkit-tap-highlight-color";
  }
  if (property === "font-smoothing") {
    return "-webkit-font-smoothing";
  }
  if (prefixedProperties.includes(property)) {
    return property as CssProperty;
  }
  // remove old or unexpected prefixes
  return property.replace(prefixRegex, "") as CssProperty;
};

/**
 * Store prefixed properties without change
 * and convert to camel case only unprefixed properties
 * @todo stop converting to camel case and use hyphenated format
 */
export const camelCaseProperty = (
  property: CssProperty | StyleProperty
): StyleProperty => {
  property = normalizeProperty(property) as CssProperty | StyleProperty;
  // these are manually added with pascal case
  if (
    property === "-webkit-font-smoothing" ||
    property === "WebkitFontSmoothing"
  ) {
    return "WebkitFontSmoothing";
  }
  if (
    property === "-moz-osx-font-smoothing" ||
    property === "MozOsxFontSmoothing"
  ) {
    return "MozOsxFontSmoothing";
  }
  if (property.startsWith("-")) {
    return property as StyleProperty;
  }
  return camelCase(property) as StyleProperty;
};

const parseCssValue = (
  property: CssProperty,
  value: string
): Map<StyleProperty, StyleValue> => {
  const expanded = new Map(expandShorthands([[property, value]]));
  const final = new Map();
  for (const [property, value] of expanded) {
    if (value === "") {
      // Keep the browser behavior when property is defined with an empty value e.g. `color:;`
      // It may override some existing value and effectively set it to "unset";
      final.set(property, { type: "keyword", value: "unset" });
      continue;
    }

    final.set(property, parseCssValueLonghand(property, value));
  }
  return final;
};

const cssTreeTryParse = (input: string) => {
  try {
    const ast = csstree.parse(input);
    return ast;
  } catch {
    return;
  }
};

type Selector = {
  name: string;
  state?: string;
};

export const parseCss = (css: string): ParsedStyleDecl[] => {
  const ast = cssTreeTryParse(css);
  const styles = new Map<string, ParsedStyleDecl>();

  if (ast === undefined) {
    return [];
  }

  csstree.walk(ast, function (node) {
    if (node.type !== "Declaration" || this.rule?.prelude.type === undefined) {
      return;
    }

    if (this.atrule && this.atrule.name !== "media") {
      return;
    }

    const supportedMediaFeatures = ["min-width", "max-width"];
    const supportedUnits = ["px"];
    let breakpoint: undefined | string;
    let invalidBreakpoint = false;
    if (this.atrule?.prelude?.type === "AtrulePrelude") {
      csstree.walk(this.atrule.prelude, {
        enter: (node, item, list) => {
          if (node.type === "Identifier") {
            if (
              node.name === "screen" ||
              node.name === "all" ||
              node.name === "and"
            ) {
              list.remove(item);
            }
            // prevent saving print styles
            if (node.name === "print") {
              invalidBreakpoint = true;
            }
          }
          if (
            node.type === "MediaFeature" &&
            supportedMediaFeatures.includes(node.name) === false
          ) {
            invalidBreakpoint = true;
          }
          if (
            node.type === "Dimension" &&
            supportedUnits.includes(node.unit) === false
          ) {
            invalidBreakpoint = true;
          }
        },
        leave: (node) => {
          // complex media queries are not supported yet
          if (node.type === "MediaQuery" && node.children.size > 1) {
            invalidBreakpoint = true;
          }
          ``;
        },
      });
      const generated = csstree.generate(this.atrule.prelude);
      if (generated) {
        breakpoint = generated;
      }
    }
    if (invalidBreakpoint || this.rule.prelude.type !== "SelectorList") {
      return;
    }

    const selectors: Selector[] = [];

    for (const node of this.rule.prelude.children) {
      if (node.type !== "Selector") {
        continue;
      }
      let selector: Selector | undefined = undefined;
      const children = node.children.toArray();
      // @ts-expect-error NestingSelector is not defined in type definitions
      const startsWithNesting = children[0]?.type === "NestingSelector";
      for (let index = 0; index < children.length; index += 1) {
        const childNode = children[index];
        let name: string = "";
        let state: string | undefined;
        switch (childNode.type) {
          case "TypeSelector":
            name = childNode.name;
            break;
          case "ClassSelector":
            name = `.${childNode.name}`;
            break;
          case "AttributeSelector":
            // for example &[data-state=active]
            if (startsWithNesting && index === 1 && children.length === 2) {
              state = csstree.generate(childNode);
            } else {
              name = csstree.generate(childNode);
            }
            break;
          case "PseudoClassSelector": {
            // First pseudo selector is not a state but an element selector, e.g. :root
            if (selector) {
              state = `:${childNode.name}`;
            } else {
              name = `:${childNode.name}`;
            }
            break;
          }
          case "PseudoElementSelector":
            state = `::${childNode.name}`;
            break;
          case "Combinator":
            // " " vs " > "
            name =
              childNode.name === " " ? childNode.name : ` ${childNode.name} `;
            break;
        }

        if (selector) {
          selector.name += name;
          if (state) {
            selector.state = state;
          }
        } else {
          selector = { name, state };
        }
      }
      if (selector) {
        selectors.push(selector);
        selector = undefined;
      }
    }

    const stringValue = csstree.generate(node.value);

    const parsedCss = parseCssValue(
      normalizeProperty(node.property),
      stringValue
    );

    for (const { name: selector, state } of selectors) {
      for (const [property, value] of parsedCss) {
        const normalizedProperty = normalizeProperty(property);
        const styleDecl: ParsedStyleDecl = {
          selector,
          property: normalizedProperty,
          value,
        };
        if (breakpoint) {
          styleDecl.breakpoint = breakpoint;
        }
        if (state) {
          styleDecl.state = state;
        }

        // deduplicate styles within selector and state by using map
        styles.set(
          `${breakpoint}:${selector}:${state}:${normalizedProperty}`,
          styleDecl
        );
      }
    }
  });

  return Array.from(styles.values());
};

type ParsedBreakpoint = {
  minWidth?: number;
  maxWidth?: number;
};

export const parseMediaQuery = (
  mediaQuery: string
): undefined | ParsedBreakpoint => {
  const ast = csstree.parse(mediaQuery, { context: "mediaQuery" });
  let property: undefined | "minWidth" | "maxWidth";
  let value: undefined | number;
  csstree.walk(ast, (node) => {
    if (node.type === "MediaFeature") {
      if (node.name === "min-width") {
        property = "minWidth";
      }
      if (node.name === "max-width") {
        property = "maxWidth";
      }
    }
    if (node.type === "Dimension" && node.unit === "px") {
      value = Number(node.value);
    }
  });
  if (property === undefined || value === undefined) {
    return;
  }
  return {
    [property]: value,
  };
};
