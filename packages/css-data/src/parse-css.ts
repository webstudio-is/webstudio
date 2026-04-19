import { camelCase } from "change-case";
import * as csstree from "css-tree";
import type {
  StyleValue,
  CssProperty,
  StyleProperty,
} from "@webstudio-is/css-engine";
import {
  parseCssValue as parseCssValueLonghand,
  parseCssVar,
} from "./parse-css-value";
import { expandShorthands } from "./shorthands";
import { shorthandProperties } from "./__generated__/shorthand-properties";

const shorthandSet = new Set<string>(shorthandProperties);

// css-tree exposes `skip` as a Symbol on the walk function itself.
// Returning it from an enter() callback prevents descent into child nodes.
const walkSkip = (csstree.walk as unknown as { skip: symbol }).skip;

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

/**
 * Recursively resolve all var() references in a CSS value string.
 * Handles nested var() in fallbacks (e.g. var(--a, var(--b))).
 * Returns `walkSkip` from enter() to prevent double-processing nested nodes.
 *
 * Resolution order per var(): direct custom property → cssVars → inline fallback
 * (fallback is itself recursively resolved if it contains var()).
 *
 * Returns undefined when the value contains no var() (fast path) or when the
 * recursion depth limit is exceeded.
 */
const resolveVars = (
  value: string,
  customProperties: Map<string, string>,
  cssVars: Map<string, string> | undefined,
  depth = 0
): { resolved: string; dropped: string[] } | undefined => {
  if (!value.includes("var(") || depth > 8) {
    return;
  }

  let ast: csstree.CssNode;
  try {
    ast = csstree.parse(value, { context: "value", positions: true });
  } catch {
    return;
  }

  const subs: Array<{ start: number; end: number; text: string }> = [];
  const dropped: string[] = [];

  csstree.walk(ast, {
    visit: "Function",
    enter(node) {
      const fnNode = node as csstree.FunctionNode;
      if (fnNode.name !== "var" || !fnNode.loc) {
        return;
      }
      const varRef = parseCssVar(fnNode);
      if (!varRef) {
        return walkSkip;
      }

      const direct =
        customProperties.get(`--${varRef.value}`) ??
        cssVars?.get(`--${varRef.value}`);

      if (direct !== undefined) {
        subs.push({
          start: fnNode.loc.start.offset,
          end: fnNode.loc.end.offset,
          text: direct,
        });
        return walkSkip;
      }

      // Try inline fallback — may itself contain var() references.
      if (varRef.fallback?.type === "unparsed") {
        const fbValue = varRef.fallback.value;
        // If the fallback itself has no var(), use it directly.
        // Otherwise recursively resolve any nested vars inside it.
        const fallbackResult = fbValue.includes("var(")
          ? resolveVars(fbValue, customProperties, cssVars, depth + 1)
          : { resolved: fbValue, dropped: [] };
        if (
          fallbackResult !== undefined &&
          fallbackResult.dropped.length === 0
        ) {
          subs.push({
            start: fnNode.loc.start.offset,
            end: fnNode.loc.end.offset,
            text: fallbackResult.resolved,
          });
          return walkSkip;
        }
      }

      dropped.push(`--${varRef.value}`);
      return walkSkip;
    },
  });

  let resolved = value;
  for (const s of [...subs].reverse()) {
    resolved = resolved.slice(0, s.start) + s.text + resolved.slice(s.end);
  }
  // Substituted text may itself contain var() references (transitive vars).
  // Re-resolve until no more substitutions are possible.
  if (resolved !== value && resolved.includes("var(")) {
    const deeper = resolveVars(resolved, customProperties, cssVars, depth + 1);
    if (deeper) {
      return {
        resolved: deeper.resolved,
        dropped: [...new Set([...dropped, ...deeper.dropped])],
      };
    }
  }
  return { resolved, dropped };
};

/**
 * Substitute var() references in a shorthand value then expand the result.
 * Works for any shorthand (background, border, transition, font…).
 *
 * Returns undefined when the value contains no var() (fast path).
 * Returns { result: empty Map, droppedVars } when all vars are unresolvable.
 * Returns { result: parsed Map, droppedVars } when some vars resolved and
 * some did not — droppedVars is non-empty and an error should be reported,
 * but the partially-resolved value is still attempted (may produce invalid).
 *
 * Special case — cross-rule single var():
 * When the entire shorthand value is exactly one var(--x) and --x is defined
 * only in cssVars (not in the same-rule customProperties), the var() reference
 * is preserved in the expanded longhands instead of being inlined.  The
 * resolved value is used solely to guide shorthand expansion (i.e. to decide
 * which longhand sub-property the value belongs to).  Longhands whose
 * expanded string differs from the resolved var value are stored as concrete
 * (reset/initial) values, while the one longhand that received the var's
 * value is stored as var(--x).
 */
const substituteVarsInShorthand = (
  property: string,
  value: string,
  customProperties: Map<string, string>,
  cssVars?: Map<string, string>
):
  | { result: Map<CssProperty, StyleValue>; droppedVars: string[] }
  | undefined => {
  // Cross-rule single-var preservation: when the whole shorthand value is a
  // single var(--x) whose definition lives in another rule (cssVars only),
  // expand with the resolved concrete value to find the right sub-property,
  // but store the original var() text instead of the concrete value.
  //
  // Two sub-cases:
  //   Single-token var  (--clr: #f00 → background: var(--clr))
  //     expandShorthands maps one longhand to the resolved token; that
  //     longhand gets var(), reset longhands get their concrete defaults.
  //
  //   Multi-token var  (--b: 2px solid red → border: var(--b))
  //     No individual longhand string equals the full resolved text, so
  //     var() is assigned to ALL longhands (the var controls all of them).
  //
  // resolvedText is normalised through csstree so that values like
  // `rgb(255, 0, 0)` (with spaces) compare equal to the `rgb(255,0,0)`
  // that expandShorthands produces.
  const crossRuleVarMatch = value.trim().match(/^var\(\s*(--[\w-]+)[^)]*\)$/);
  if (crossRuleVarMatch !== null && cssVars !== undefined) {
    const varName = crossRuleVarMatch[1];
    if (!customProperties.has(varName) && cssVars.has(varName)) {
      const rawResolved = cssVars.get(varName)!.trim();
      let normalizedResolved = rawResolved;
      try {
        normalizedResolved = csstree.generate(
          csstree.parse(rawResolved, { context: "value" })
        );
      } catch {
        // keep rawResolved if parsing fails
      }

      const expandedStrings = new Map(
        expandShorthands([[property, normalizedResolved]])
      );
      const anyMatch = [...expandedStrings.values()].some(
        (s) => s === normalizedResolved
      );

      const originalVarText = value.trim();
      const result = new Map<CssProperty, StyleValue>();
      for (const [prop, expandedStr] of expandedStrings) {
        if (!anyMatch || expandedStr === normalizedResolved) {
          // Multi-token var (no match anywhere) → preserve var() on every
          // longhand. Single-token var → preserve var() only on the longhand(s)
          // that actually received the var's value.
          result.set(
            prop as CssProperty,
            parseCssValueLonghand(prop as CssProperty, originalVarText)
          );
        } else {
          // Longhand received a reset/default value — store it as concrete.
          result.set(
            prop as CssProperty,
            parseCssValueLonghand(prop as CssProperty, expandedStr)
          );
        }
      }
      return { result, droppedVars: [] };
    }
  }

  const resolution = resolveVars(value, customProperties, cssVars);
  if (resolution === undefined) {
    return;
  }

  const { resolved, dropped } = resolution;

  if (resolved === value) {
    // No substitution happened.
    if (dropped.length === 0) {
      // No recognizable var() nodes — let caller fall through to default.
      return;
    }
    // All vars were unresolvable — signal that the property will be dropped.
    return { result: new Map(), droppedVars: dropped };
  }

  return {
    result: parseCssValue(property as CssProperty, resolved),
    droppedVars: dropped,
  };
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

export type ParseCssResult = {
  styles: ParsedStyleDecl[];
  errors: string[];
};

/**
 * Extract all CSS custom property (--*) declarations from a CSS string,
 * regardless of which selector rule they appear in.
 * Useful when CSS from multiple rules (e.g. Tailwind utility classes) needs
 * to be resolved together as if they apply to the same element.
 */
export const extractCssCustomProperties = (
  css: string
): Map<string, string> => {
  const map = new Map<string, string>();
  const ast = cssTreeTryParse(css);
  if (ast === undefined) {
    return map;
  }
  csstree.walk(ast, {
    visit: "Declaration",
    enter(node) {
      const decl = node as csstree.Declaration;
      const prop = normalizeProperty(decl.property);
      if (prop.startsWith("--")) {
        map.set(prop, csstree.generate(decl.value));
      }
    },
  });
  return map;
};

export const parseCss = (
  css: string,
  cssVars: Map<string, string>
): ParseCssResult => {
  const ast = cssTreeTryParse(css);
  const stylesMap = new Map<string, ParsedStyleDecl>();
  const errors: string[] = [];

  if (ast === undefined) {
    return { styles: [], errors };
  }

  // Track context as we traverse — use a stack to support nested @media
  const atruleStack: csstree.Atrule[] = [];
  let currentRule: csstree.Rule | undefined;
  // Custom properties declared in the current rule, used to resolve var() in shorthand expansion.
  // Pre-populated for each rule (two-pass) so that forward references like
  //   border-color: rgb(x y z / var(--op));  --op: 0.6;
  // resolve correctly regardless of declaration order.
  const customProperties = new Map<string, string>();

  const collectRuleCustomProperties = (rule: csstree.Rule) => {
    customProperties.clear();
    csstree.walk(rule, {
      visit: "Declaration",
      enter(node) {
        const decl = node as csstree.Declaration;
        const prop = normalizeProperty(decl.property);
        if (prop.startsWith("--")) {
          customProperties.set(prop, csstree.generate(decl.value));
        }
      },
    });
  };

  csstree.walk(ast, {
    enter(node) {
      if (node.type === "Atrule") {
        atruleStack.push(node);
      } else if (node.type === "Rule") {
        currentRule = node;
        collectRuleCustomProperties(node);
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
                // Mutates AST in-place to normalize media type for breakpoint string generation;
                // the AST is discarded after parseCss returns so this is safe.
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
            case "IdSelector":
              name = `#${childNode.name}`;
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
      const property = normalizeProperty(node.property);

      let parsedCss: Map<CssProperty, StyleValue>;
      if (shorthandSet.has(property)) {
        const substituted = substituteVarsInShorthand(
          property,
          stringValue,
          customProperties,
          cssVars
        );
        if (substituted !== undefined) {
          parsedCss = substituted.result;
          for (const varName of substituted.droppedVars) {
            errors.push(
              `"${property}" was not applied because ${varName} could not be resolved`
            );
          }
        } else {
          parsedCss = parseCssValue(property, stringValue);
        }
      } else {
        parsedCss = parseCssValue(property, stringValue);
      }

      for (const { name: selector, state } of selectors) {
        for (const [prop, value] of parsedCss) {
          const normalizedProperty = normalizeProperty(prop);
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
          stylesMap.set(
            `${breakpoint}:${selector}:${state}:${normalizedProperty}`,
            styleDecl
          );
        }
      }
    },
  });

  return { styles: Array.from(stylesMap.values()), errors };
};

export type ParsedClassSelector = {
  /** Token name: "card" for .card, "card__title" for .card .title */
  tokenName: string;
  /** Target class names (the last segment): ["card"] or ["title"] */
  classNames: string[];
  /**
   * Non-class selector suffixes on the target: attribute selectors, pseudo-classes, pseudo-elements.
   * e.g. ["[disabled]"] for .btn[disabled], [":hover"] for .card:hover
   */
  states?: string[];
  /**
   * Ancestor constraints for nested selectors (e.g., .card .title).
   * Ordered from outermost to innermost ancestor.
   * Each entry's combinator describes the relationship to the next segment.
   */
  ancestors?: Array<{
    classNames: string[];
    combinator: "descendant" | "child";
  }>;
};

/**
 * Parse a selector string and determine if it's a class-based selector
 * suitable for token extraction. Uses css-tree to handle the full CSS
 * selector spec.
 *
 * Supports simple selectors, compound selectors, and nested selectors
 * using descendant (" ") and child (">") combinators where ALL segments
 * are class-based.
 *
 * Supported patterns:
 *   .card                      → { tokenName: "card", classNames: ["card"] }
 *   .card.active               → { tokenName: "card.active", classNames: ["card", "active"] }
 *   .btn[disabled]             → { tokenName: "btn", ..., states: ["[disabled]"] }
 *   .card:hover                → { tokenName: "card", ..., states: [":hover"] }
 *   .card .title               → { tokenName: "card__title", ..., ancestors: [{classNames:["card"], combinator:"descendant"}] }
 *   .card > .title             → { tokenName: "card__title", ..., ancestors: [{classNames:["card"], combinator:"child"}] }
 *   .a .b .c                   → { tokenName: "a__b__c", ..., ancestors: [{..,"descendant"},{..,"descendant"}] }
 *   .card > .title:hover       → { tokenName: "card__title", ..., states: [":hover"], ancestors: [...] }
 *
 * Returns undefined for:
 * - Selectors with sibling combinators (+, ~)
 * - Selectors with non-class nodes in ancestor segments (e.g., .card h1, h1 .card)
 * - Pure element/id selectors
 */
export const parseClassBasedSelector = (
  selector: string
): ParsedClassSelector | undefined => {
  let ast: csstree.CssNode;
  try {
    ast = csstree.parse(selector, { context: "selector" });
  } catch {
    return undefined;
  }

  if (ast.type !== "Selector") {
    return undefined;
  }

  const children = ast.children.toArray();
  if (children.length === 0) {
    return undefined;
  }

  // First node must be a ClassSelector
  if (children[0].type !== "ClassSelector") {
    return undefined;
  }

  // Split children into segments at Combinator nodes
  type Segment = {
    nodes: csstree.CssNode[];
    combinator?: "descendant" | "child";
  };
  const segments: Segment[] = [];
  let currentNodes: csstree.CssNode[] = [];

  for (const child of children) {
    if (child.type === "Combinator") {
      if (child.name === " ") {
        segments.push({ nodes: currentNodes, combinator: "descendant" });
      } else if (child.name === ">") {
        segments.push({ nodes: currentNodes, combinator: "child" });
      } else {
        // Sibling combinators (+, ~) — reject
        return undefined;
      }
      currentNodes = [];
    } else {
      currentNodes.push(child);
    }
  }
  // Push the last (target) segment
  segments.push({ nodes: currentNodes });

  // Validate all segments and extract class names
  const ancestors: Array<{
    classNames: string[];
    combinator: "descendant" | "child";
  }> = [];

  // Process ancestor segments (all except the last)
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const segClassNames: string[] = [];
    for (const node of segment.nodes) {
      if (node.type === "ClassSelector") {
        segClassNames.push(node.name);
      } else {
        // Non-class node in an ancestor segment — reject
        return undefined;
      }
    }
    if (segClassNames.length === 0) {
      return undefined;
    }
    ancestors.push({
      classNames: segClassNames,
      combinator: segment.combinator!,
    });
  }

  // Process the last (target) segment
  const lastSegment = segments[segments.length - 1];
  const classNames: string[] = [];
  const states: string[] = [];

  for (const node of lastSegment.nodes) {
    switch (node.type) {
      case "ClassSelector":
        classNames.push(node.name);
        break;
      case "AttributeSelector":
      case "PseudoClassSelector":
      case "PseudoElementSelector":
        states.push(csstree.generate(node));
        break;
      default:
        return undefined;
    }
  }

  if (classNames.length === 0) {
    return undefined;
  }

  // Build token name: join segment class names with "__"
  const segmentNames = [
    ...ancestors.map((a) =>
      a.classNames.length === 1 ? a.classNames[0] : a.classNames.join(".")
    ),
    classNames.length === 1 ? classNames[0] : classNames.join("."),
  ];
  const tokenName = segmentNames.join("__");

  return {
    tokenName,
    classNames,
    ...(states.length > 0 ? { states } : {}),
    ...(ancestors.length > 0 ? { ancestors } : {}),
  };
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
