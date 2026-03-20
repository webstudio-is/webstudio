import { camelCase } from "change-case";
import * as csstree from "css-tree";
import type {
  StyleValue,
  CssProperty,
  StyleProperty,
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
  "-webkit-text-stroke",
  "-webkit-text-stroke-color",
  "-webkit-text-stroke-width",
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

const parseCssValue = (property: CssProperty, value: string) => {
  const expanded = new Map(expandShorthands([[property, value]]));
  const final = new Map<CssProperty, StyleValue>();
  for (const [property, value] of expanded) {
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

  // Track context as we traverse — use a stack to support nested @media
  const atruleStack: csstree.Atrule[] = [];
  let currentRule: csstree.Rule | undefined;

  const supportedUnits = ["px"];

  csstree.walk(ast, {
    enter(node) {
      if (node.type === "Atrule") {
        atruleStack.push(node);
      } else if (node.type === "Rule") {
        currentRule = node;
      }
    },
    leave(node) {
      if (node.type === "Atrule") {
        atruleStack.pop();
      } else if (node.type === "Rule") {
        currentRule = undefined;
      }

      // Process declarations
      if (
        node.type !== "Declaration" ||
        !currentRule ||
        currentRule.prelude.type === undefined
      ) {
        return;
      }

      // All enclosing at-rules must be @media — reject @supports, @keyframes, etc.
      if (atruleStack.some((atrule) => atrule.name !== "media")) {
        return;
      }

      let breakpoint: undefined | string;
      let invalidBreakpoint = false;

      // Collect and flatten all enclosing @media preludes
      const flattenedParts: string[] = [];
      for (const atrule of atruleStack) {
        if (atrule.prelude?.type === "AtrulePrelude") {
          let hasNonPxWidthUnit = false;
          let hasPrintMedia = false;
          let currentFeatureName: string | undefined;
          csstree.walk(atrule.prelude, {
            enter: (node) => {
              if (node.type === "MediaQuery") {
                if (node.mediaType === "screen" || node.mediaType === "all") {
                  node.mediaType = null;
                }
                if (node.mediaType === "print") {
                  hasPrintMedia = true;
                }
              }
              if (node.type === "Feature") {
                currentFeatureName = node.name;
              }
              // Only reject non-px units on width features (min-width, max-width)
              if (
                node.type === "Dimension" &&
                node.unit !== "px" &&
                (currentFeatureName === "min-width" ||
                  currentFeatureName === "max-width")
              ) {
                hasNonPxWidthUnit = true;
              }
            },
            leave: (node) => {
              if (node.type === "Feature") {
                currentFeatureName = undefined;
              }
            },
          });
          if (hasPrintMedia || hasNonPxWidthUnit) {
            invalidBreakpoint = true;
            break;
          }
          const generated = csstree.generate(atrule.prelude);
          if (generated) {
            flattenedParts.push(generated);
          }
        }
      }

      if (!invalidBreakpoint && flattenedParts.length > 0) {
        breakpoint = flattenedParts.join(" and ");
      }

      if (invalidBreakpoint || currentRule.prelude.type !== "SelectorList") {
        return;
      }

      const selectors: Selector[] = [];

      for (const node of currentRule.prelude.children) {
        if (node.type !== "Selector") {
          continue;
        }
        let selector: Selector | undefined = undefined;
        const children = node.children.toArray();
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
    },
  });

  return Array.from(styles.values());
};

type ParsedBreakpoint = {
  minWidth?: number;
  maxWidth?: number;
  condition?: string;
};

export const parseMediaQuery = (
  mediaQuery: string
): undefined | ParsedBreakpoint => {
  const ast = csstree.parse(mediaQuery, { context: "mediaQuery" });
  let minWidth: undefined | number;
  let maxWidth: undefined | number;
  let currentWidthProperty: undefined | "minWidth" | "maxWidth";
  const otherFeatures: string[] = [];

  csstree.walk(ast, (node) => {
    if (node.type === "Feature") {
      if (node.name === "min-width") {
        currentWidthProperty = "minWidth";
      } else if (node.name === "max-width") {
        currentWidthProperty = "maxWidth";
      } else {
        currentWidthProperty = undefined;
        // Capture any other media feature as custom condition
        const generated = csstree.generate(node);
        // Remove outer parentheses if present
        let cleaned =
          generated.startsWith("(") && generated.endsWith(")")
            ? generated.slice(1, -1)
            : generated;
        // Normalize whitespace: remove spaces around colons for consistency
        cleaned = cleaned.replace(/\s*:\s*/g, ":");
        otherFeatures.push(cleaned);
      }
    }
    if (node.type === "Dimension" && node.unit === "px") {
      const value = Number(node.value);
      if (currentWidthProperty === "minWidth") {
        minWidth = value;
      } else if (currentWidthProperty === "maxWidth") {
        maxWidth = value;
      }
      currentWidthProperty = undefined;
    }
  });

  const condition =
    otherFeatures.length > 0 ? otherFeatures.join(" and ") : undefined;

  const hasWidth = minWidth !== undefined || maxWidth !== undefined;

  // If there's a custom condition and no width, return only condition
  if (condition !== undefined && !hasWidth) {
    return { condition };
  }

  if (!hasWidth && condition === undefined) {
    return;
  }

  return {
    ...(minWidth !== undefined ? { minWidth } : {}),
    ...(maxWidth !== undefined ? { maxWidth } : {}),
    ...(condition !== undefined ? { condition } : {}),
  };
};
