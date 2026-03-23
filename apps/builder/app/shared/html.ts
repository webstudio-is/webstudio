import {
  type DefaultTreeAdapterMap,
  defaultTreeAdapter,
  parseFragment,
} from "parse5";
import {
  type WebstudioFragment,
  type Instance,
  elementComponent,
  Prop,
  tags,
  StyleDecl,
  Breakpoint,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { ariaAttributes, attributesByTag } from "@webstudio-is/html-data";
import {
  camelCaseProperty,
  parseCss,
  parseClassBasedSelector,
  parseMediaQuery,
  type ParsedStyleDecl,
  type ParsedClassSelector,
} from "@webstudio-is/css-data";
import { richTextContentTags } from "./content-model";
import { setIsSubsetOf } from "./shim";
import { isAttributeNameSafe } from "@webstudio-is/react-sdk";
import * as csstree from "css-tree";
import { titleCase } from "title-case";

type ElementNode = DefaultTreeAdapterMap["element"];

const spaceRegex = /^\s*$/;

const getAttributeType = (
  attribute: (typeof ariaAttributes)[number]
): "string" | "boolean" | "number" => {
  if (
    attribute.type === "string" ||
    attribute.type === "select" ||
    attribute.type === "url"
  ) {
    return "string";
  }
  if (attribute.type === "number" || attribute.type === "boolean") {
    return attribute.type;
  }
  attribute.type satisfies never;
  throw Error("Unknown type");
};

const getAttributeTypes = () => {
  const attributeTypes = new Map<string, "string" | "number" | "boolean">();
  for (const attribute of ariaAttributes) {
    attributeTypes.set(attribute.name, getAttributeType(attribute));
  }
  for (const attribute of attributesByTag["*"] ?? []) {
    attributeTypes.set(attribute.name, getAttributeType(attribute));
  }
  for (const [tag, attributes] of Object.entries(attributesByTag)) {
    if (attributes) {
      for (const attribute of attributes) {
        attributeTypes.set(
          `${tag}:${attribute.name}`,
          getAttributeType(attribute)
        );
      }
    }
  }
  return attributeTypes;
};

const findContentTags = (element: ElementNode, tags = new Set<string>()) => {
  for (const childNode of element.childNodes) {
    if (defaultTreeAdapter.isElementNode(childNode)) {
      tags.add(childNode.tagName);
      findContentTags(childNode, tags);
    }
  }
  return tags;
};

/**
 * Collect all text content from <style> elements in the parsed HTML tree
 */
const collectStyleTexts = (
  documentFragment: DefaultTreeAdapterMap["documentFragment"]
): string[] => {
  const texts: string[] = [];
  const walk = (node: DefaultTreeAdapterMap["parentNode"]) => {
    for (const child of node.childNodes) {
      if (
        defaultTreeAdapter.isElementNode(child) &&
        child.tagName === "style"
      ) {
        const textContent = child.childNodes
          .filter((c) => defaultTreeAdapter.isTextNode(c))
          .map((c) => (c as DefaultTreeAdapterMap["textNode"]).value)
          .join("");
        texts.push(textContent);
      }
      if (defaultTreeAdapter.isElementNode(child)) {
        walk(child);
      }
    }
  };
  walk(documentFragment);
  return texts;
};

/**
 * Get class names from a parse5 element's class attribute.
 */
const getElementClasses = (element: ElementNode): Set<string> => {
  const classAttr = element.attrs?.find((a) => a.name === "class");
  if (!classAttr) {
    return new Set();
  }
  return new Set(classAttr.value.split(/\s+/).filter(Boolean));
};

/**
 * Get the parent element node, or undefined if the parent is a document/fragment.
 */
const getParentElementNode = (node: ElementNode): ElementNode | undefined => {
  const parent = node.parentNode;
  return parent && defaultTreeAdapter.isElementNode(parent)
    ? parent
    : undefined;
};

/**
 * Check whether an element satisfies the ancestor constraints of a nested
 * selector. Walks up the parse5 tree from the element checking each ancestor
 * constraint from innermost to outermost.
 */
const elementMatchesAncestors = (
  element: ElementNode,
  ancestors: NonNullable<ParsedClassSelector["ancestors"]>
): boolean => {
  let current: ElementNode | undefined = getParentElementNode(element);

  // Check ancestors from innermost (last in array) to outermost (first)
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const { classNames: requiredClasses, combinator } = ancestors[i];
    const requiredSet = new Set(requiredClasses);

    if (combinator === "child") {
      // Direct parent must match
      if (!current) {
        return false;
      }
      if (!setIsSubsetOf(requiredSet, getElementClasses(current))) {
        return false;
      }
      current = getParentElementNode(current);
    } else {
      // "descendant" — search up the tree for any matching ancestor
      let found = false;
      while (current) {
        if (setIsSubsetOf(requiredSet, getElementClasses(current))) {
          current = getParentElementNode(current);
          found = true;
          break;
        }
        current = getParentElementNode(current);
      }
      if (!found) {
        return false;
      }
    }
  }

  return true;
};

type NestedClassRule = {
  parsed: ParsedClassSelector;
  decls: ParsedStyleDecl[];
  selector: string;
};

/**
 * From a list of parsed style declarations, determine which selectors are
 * class-based selectors (extractable as tokens) and which are not.
 *
 * Simple class selectors go into classRules. Nested selectors (with
 * descendant/child combinators) go into nestedClassRules for tree matching.
 */
const classifyRules = (
  decls: ParsedStyleDecl[]
): {
  classRules: Map<string, ParsedStyleDecl[]>;
  nestedClassRules: Map<string, NestedClassRule>;
  hasNonClassRules: boolean;
} => {
  const classRules = new Map<string, ParsedStyleDecl[]>();
  const nestedClassRules = new Map<string, NestedClassRule>();
  let hasNonClassRules = false;

  for (const decl of decls) {
    const parsed = parseClassBasedSelector(decl.selector);
    if (parsed !== undefined) {
      const selectorState = parsed.states?.[0];
      const effectiveDecl = selectorState
        ? { ...decl, state: decl.state ?? selectorState }
        : decl;

      if (parsed.ancestors && parsed.ancestors.length > 0) {
        // Nested selector — needs tree matching
        let entry = nestedClassRules.get(parsed.tokenName);
        if (!entry) {
          entry = { parsed, decls: [], selector: decl.selector };
          nestedClassRules.set(parsed.tokenName, entry);
        }
        entry.decls.push(effectiveDecl);
      } else {
        // Simple class selector
        let rules = classRules.get(parsed.tokenName);
        if (!rules) {
          rules = [];
          classRules.set(parsed.tokenName, rules);
        }
        rules.push(effectiveDecl);
      }
    } else {
      hasNonClassRules = true;
    }
  }
  return { classRules, nestedClassRules, hasNonClassRules };
};

/**
 * Build the leftover CSS (non-class rules) from the original style text.
 * We re-parse with css-tree and walk rules to classify them:
 * - Class-based selectors (simple and compound) are removed (extracted as tokens)
 * - Non-class selectors are kept as leftover
 * - For mixed comma-separated selectors (.card, div {}), only the non-class
 *   portions are kept
 */
const buildLeftoverCss = (cssText: string): string => {
  const ast = csstree.parse(cssText);
  const parts: string[] = [];

  /** Re-use parseClassBasedSelector as single source of truth */
  const isClassBasedSelector = (selector: csstree.CssNode): boolean =>
    selector.type === "Selector" &&
    parseClassBasedSelector(csstree.generate(selector)) !== undefined;

  /**
   * Process a Rule: if all selectors are class-based, skip entirely.
   * If none are, keep entirely. If mixed, keep only non-class selectors.
   */
  const getLeftoverRule = (node: csstree.Rule): string | undefined => {
    if (node.prelude?.type !== "SelectorList") {
      return csstree.generate(node);
    }
    const selectors = node.prelude.children.toArray();
    const nonClassSelectors = selectors.filter(
      (sel) => !isClassBasedSelector(sel)
    );
    if (nonClassSelectors.length === selectors.length) {
      // No class selectors found — keep entire rule
      return csstree.generate(node);
    }
    if (nonClassSelectors.length === 0) {
      // All selectors are class-based — skip entirely
      return undefined;
    }
    // Mixed: rebuild rule with only non-class selectors
    const selectorStrs = nonClassSelectors.map((sel) => csstree.generate(sel));
    const body = node.block ? csstree.generate(node.block) : "{}";
    return `${selectorStrs.join(",")}${body}`;
  };

  // Walk only top-level children of the stylesheet
  if (ast.type === "StyleSheet") {
    for (const node of ast.children) {
      if (node.type === "Rule") {
        const leftover = getLeftoverRule(node);
        if (leftover) {
          parts.push(leftover);
        }
      } else if (node.type === "Atrule") {
        if (node.name === "media") {
          // Check if this media query is unsupported by parseCss (print, non-px units)
          // If so, keep the entire block as leftover
          let isUnsupportedMedia = false;
          if (node.prelude) {
            csstree.walk(node.prelude, (walkNode) => {
              if (
                walkNode.type === "MediaQuery" &&
                walkNode.mediaType === "print"
              ) {
                isUnsupportedMedia = true;
              }
            });
          }
          if (isUnsupportedMedia) {
            parts.push(csstree.generate(node));
          } else {
            // For @media, check children — keep non-class rules
            const leftoverRules: string[] = [];
            if (node.block) {
              for (const child of node.block.children) {
                if (child.type === "Rule") {
                  const leftover = getLeftoverRule(child);
                  if (leftover) {
                    leftoverRules.push(leftover);
                  }
                } else if (child.type === "Atrule") {
                  // Nested at-rule within @media — keep if it contains non-class rules
                  const nestedLeftover = collectNonClassFromAtrule(
                    child,
                    getLeftoverRule
                  );
                  if (nestedLeftover) {
                    leftoverRules.push(nestedLeftover);
                  }
                }
              }
            }
            if (leftoverRules.length > 0) {
              const prelude = node.prelude
                ? csstree.generate(node.prelude)
                : "";
              parts.push(`@media ${prelude}{${leftoverRules.join("")}}`);
            }
          }
        } else {
          // @keyframes, @font-face, @supports, etc. — always keep
          parts.push(csstree.generate(node));
        }
      }
    }
  }
  return parts.join("");
};

const collectNonClassFromAtrule = (
  node: csstree.Atrule,
  getLeftoverRule: (rule: csstree.Rule) => string | undefined
): string | undefined => {
  if (node.name === "media" && node.block) {
    // Check if this nested @media is unsupported (e.g. print)
    let isUnsupportedMedia = false;
    if (node.prelude) {
      csstree.walk(node.prelude, (walkNode) => {
        if (walkNode.type === "MediaQuery" && walkNode.mediaType === "print") {
          isUnsupportedMedia = true;
        }
      });
    }
    if (isUnsupportedMedia) {
      return csstree.generate(node);
    }
    const leftoverRules: string[] = [];
    for (const child of node.block.children) {
      if (child.type === "Rule") {
        const leftover = getLeftoverRule(child);
        if (leftover) {
          leftoverRules.push(leftover);
        }
      } else if (child.type === "Atrule") {
        const nested = collectNonClassFromAtrule(child, getLeftoverRule);
        if (nested) {
          leftoverRules.push(nested);
        }
      }
    }
    if (leftoverRules.length > 0) {
      const prelude = node.prelude ? csstree.generate(node.prelude) : "";
      return `@media ${prelude}{${leftoverRules.join("")}}`;
    }
    return undefined;
  }
  // Non-media at-rules (like @supports nested in @media) — always keep
  return csstree.generate(node);
};

/**
 * Resolve overlapping range breakpoints by adjusting maxWidth values.
 * Range breakpoints are those that have both minWidth and maxWidth.
 * When ranges overlap, the earlier range's maxWidth is adjusted to
 * be less than the next range's minWidth.
 */
const resolveOverlappingBreakpoints = (breakpoints: Breakpoint[]) => {
  // Collect all breakpoints that have both minWidth and maxWidth (range breakpoints)
  // plus simple minWidth-only and maxWidth-only breakpoints
  const widthBreakpoints = breakpoints.filter(
    (b) =>
      b.condition === undefined &&
      (b.minWidth !== undefined || b.maxWidth !== undefined)
  );

  if (widthBreakpoints.length < 2) {
    return;
  }

  // Sort range breakpoints by minWidth
  const rangeBreakpoints = widthBreakpoints
    .filter((b) => b.minWidth !== undefined && b.maxWidth !== undefined)
    .sort((a, b) => a.minWidth! - b.minWidth!);

  // Also consider simple min-width breakpoints as potential overlap targets
  const minOnlyBreakpoints = widthBreakpoints.filter(
    (b) => b.minWidth !== undefined && b.maxWidth === undefined
  );
  const maxOnlyBreakpoints = widthBreakpoints.filter(
    (b) => b.maxWidth !== undefined && b.minWidth === undefined
  );

  // Adjust range vs range overlaps
  for (let i = 0; i < rangeBreakpoints.length - 1; i++) {
    const current = rangeBreakpoints[i];
    const next = rangeBreakpoints[i + 1];
    if (current.maxWidth! >= next.minWidth!) {
      current.maxWidth = next.minWidth! - 1;
    }
  }

  // Adjust range vs min-width-only overlaps
  for (const range of rangeBreakpoints) {
    for (const minBp of minOnlyBreakpoints) {
      if (range.maxWidth! >= minBp.minWidth!) {
        range.maxWidth = minBp.minWidth! - 1;
      }
    }
  }

  // Adjust range vs max-width-only overlaps
  for (const range of rangeBreakpoints) {
    for (const maxBp of maxOnlyBreakpoints) {
      if (range.minWidth! <= maxBp.maxWidth!) {
        range.minWidth = maxBp.maxWidth! + 1;
      }
    }
  }
};

export const generateFragmentFromHtml = (
  html: string
): WebstudioFragment & { skippedSelectors: string[] } => {
  const attributeTypes = getAttributeTypes();
  const instances = new Map<Instance["id"], Instance>();
  const styleSourceSelections: StyleSourceSelection[] = [];
  const styleSources: StyleSource[] = [];
  const styles: StyleDecl[] = [];
  const breakpoints: Breakpoint[] = [];
  const props: Prop[] = [];
  let lastId = -1;
  const getNewId = () => {
    lastId += 1;
    return lastId.toString();
  };

  let baseBreakpoint: undefined | Breakpoint;
  const getBaseBreakpointId = () => {
    if (baseBreakpoint) {
      return baseBreakpoint.id;
    }
    baseBreakpoint = { id: "base", label: "" };
    breakpoints.push(baseBreakpoint);
    return baseBreakpoint.id;
  };

  // Breakpoint deduplication by key — breakpoints use their own ID counter
  let lastBreakpointId = -1;
  const getNewBreakpointId = () => {
    lastBreakpointId += 1;
    return lastBreakpointId.toString();
  };
  const breakpointByKey = new Map<string, Breakpoint>();
  const getOrCreateBreakpoint = (parsed: {
    minWidth?: number;
    maxWidth?: number;
    condition?: string;
  }): string => {
    const key = JSON.stringify(parsed);
    let bp = breakpointByKey.get(key);
    if (!bp) {
      const id = getNewBreakpointId();
      let label: string;
      if (parsed.condition) {
        // e.g. "prefers-color-scheme:dark" → "Prefers Color Scheme Dark"
        label = titleCase(parsed.condition.replace(/[-:]/g, " "));
      } else {
        const parts: string[] = [];
        if (parsed.minWidth !== undefined) {
          parts.push(`≥ ${parsed.minWidth}px`);
        }
        if (parsed.maxWidth !== undefined) {
          parts.push(`≤ ${parsed.maxWidth}px`);
        }
        label = parts.join(" and ");
      }
      bp = { id, label, ...parsed };
      breakpointByKey.set(key, bp);
      breakpoints.push(bp);
    }
    return bp.id;
  };

  const createLocalStyles = (instanceId: string, css: string) => {
    const localStyleSource: StyleSource = {
      type: "local",
      id: `${instanceId}:ws:style`,
    };
    styleSources.push(localStyleSource);
    styleSourceSelections.push({ instanceId, values: [localStyleSource.id] });
    for (const { property, value } of parseCss(`.styles{${css}}`)) {
      styles.push({
        styleSourceId: localStyleSource.id,
        breakpointId: getBaseBreakpointId(),
        property: camelCaseProperty(property),
        value,
      });
    }
  };

  // ---- Pre-parse all <style> tags to extract class-based tokens ----
  const documentFragment = parseFragment(html, {
    scriptingEnabled: false,
    sourceCodeLocationInfo: true,
  });

  // Collect style tag texts and their nodes
  const styleTexts = collectStyleTexts(documentFragment);
  const allCssText = styleTexts.join("\n");

  // Parse all CSS and classify rules
  const allDecls = parseCss(allCssText);
  const { classRules, nestedClassRules } = classifyRules(allDecls);

  // Track which class names are used by elements — IDs will be assigned later
  const usedClassNames = new Set<string>();
  // Track which nested token names were resolved against the tree
  const usedNestedTokenNames = new Set<string>();

  // Classify each style tag: "all-class" (skip embed), "no-class" (keep original),
  // "mixed" (regenerate leftover), or "empty" (skip)
  type StyleTagAction =
    | { type: "skip" }
    | { type: "keep-original" }
    | { type: "leftover"; css: string };

  const styleTagActions: StyleTagAction[] = [];
  for (const text of styleTexts) {
    if (spaceRegex.test(text) || text.length === 0) {
      styleTagActions.push({ type: "skip" });
      continue;
    }
    const parsedDecls = parseCss(text);
    const {
      classRules: tagClassRules,
      nestedClassRules: tagNestedRules,
      hasNonClassRules: tagHasNonClass,
    } = classifyRules(parsedDecls);

    if (
      parsedDecls.length === 0 &&
      tagClassRules.size === 0 &&
      tagNestedRules.size === 0
    ) {
      // Unparseable CSS — keep original
      styleTagActions.push({ type: "keep-original" });
    } else if (tagClassRules.size === 0 && tagNestedRules.size === 0) {
      // Only non-class rules — keep original
      styleTagActions.push({ type: "keep-original" });
    } else if (!tagHasNonClass) {
      // Only class rules — also check for unsupported media like @media print
      const leftover = buildLeftoverCss(text);
      if (leftover.length > 0) {
        styleTagActions.push({ type: "leftover", css: leftover });
      } else {
        styleTagActions.push({ type: "skip" });
      }
    } else {
      // Mixed — regenerate leftover
      const leftover = buildLeftoverCss(text);
      if (leftover.length > 0) {
        styleTagActions.push({ type: "leftover", css: leftover });
      } else {
        styleTagActions.push({ type: "skip" });
      }
    }
  }

  let styleTagIndex = 0;

  // Map of instanceId → resolved class names (for post-processing token assignments)
  const instanceTokenClasses = new Map<string, string[]>();

  const convertElementToInstance = (node: ElementNode) => {
    if (node.tagName === "script" && node.sourceCodeLocation) {
      const { startCol, startOffset, endOffset } = node.sourceCodeLocation;
      const indent = startCol - 1;
      const htmlFragment = html
        .slice(startOffset, endOffset)
        .split("\n")
        .map((line, index) => {
          if (index > 0 && /^\s+$/.test(line.slice(0, indent))) {
            return line.slice(indent);
          }
          return line;
        })
        .join("\n");
      const instance: Instance = {
        type: "instance",
        id: getNewId(),
        component: "HtmlEmbed",
        label: "Script",
        children: [],
      };
      instances.set(instance.id, instance);
      props.push({
        id: `${instance.id}:clientOnly`,
        instanceId: instance.id,
        name: "clientOnly",
        type: "boolean",
        value: true,
      });
      props.push({
        id: `${instance.id}:code`,
        instanceId: instance.id,
        name: "code",
        type: "string",
        value: htmlFragment,
      });
      return { type: "id" as const, value: instance.id };
    }
    if (node.tagName === "style" && node.sourceCodeLocation) {
      const tagIdx = styleTagIndex++;
      const action = styleTagActions[tagIdx] ?? { type: "skip" };

      if (action.type === "keep-original") {
        // Preserve original formatting — use original HTML fragment
        const { startCol, startOffset, endOffset } = node.sourceCodeLocation;
        const indent = startCol - 1;
        const htmlFragment = html
          .slice(startOffset, endOffset)
          .split("\n")
          .map((line, index) => {
            if (index > 0 && /^\s+$/.test(line.slice(0, indent))) {
              return line.slice(indent);
            }
            return line;
          })
          .join("\n");
        const instance: Instance = {
          type: "instance",
          id: getNewId(),
          component: "HtmlEmbed",
          label: "Style",
          children: [],
        };
        instances.set(instance.id, instance);
        props.push({
          id: `${instance.id}:code`,
          instanceId: instance.id,
          name: "code",
          type: "string",
          value: htmlFragment,
        });
        return { type: "id" as const, value: instance.id };
      }

      if (action.type === "leftover") {
        const instance: Instance = {
          type: "instance",
          id: getNewId(),
          component: "HtmlEmbed",
          label: "Style",
          children: [],
        };
        instances.set(instance.id, instance);
        props.push({
          id: `${instance.id}:code`,
          instanceId: instance.id,
          name: "code",
          type: "string",
          value: `<style>${action.css}</style>`,
        });
        return { type: "id" as const, value: instance.id };
      }

      // action.type === "skip" — all rules were class rules (or empty)
      return undefined;
    }
    if (!tags.includes(node.tagName)) {
      return;
    }
    const instance: Instance = {
      type: "instance",
      id: getNewId(),
      component: elementComponent,
      tag: node.tagName,
      children: [],
    };
    // users expect to get optimized images by default
    // though still able to create raw img element
    if (node.tagName === "img") {
      instance.component = "Image";
      delete instance.tag;
    }
    instances.set(instance.id, instance);
    for (const attr of node.attrs) {
      // skip attributes which cannot be rendered in jsx
      if (!isAttributeNameSafe(attr.name)) {
        continue;
      }
      const id = `${instance.id}:${attr.name}`;
      const instanceId = instance.id;
      const name = attr.name;
      // cast props to types extracted from html and aria specs
      const type =
        attributeTypes.get(`${node.tagName}:${name}`) ??
        attributeTypes.get(name) ??
        "string";
      // ignore style attribute to not conflict with react
      if (attr.name === "style") {
        createLocalStyles(instanceId, attr.value);
        continue;
      }
      // resolve class attribute against class rules from style tags
      if (
        attr.name === "class" &&
        (classRules.size > 0 || nestedClassRules.size > 0)
      ) {
        const classNames = attr.value.split(/\s+/).filter(Boolean);
        const resolvedTokenNames: string[] = [];
        const unresolvedClasses: string[] = [];

        // First: match individual class names as simple tokens
        for (const className of classNames) {
          if (classRules.has(className)) {
            resolvedTokenNames.push(className);
            usedClassNames.add(className);
          } else {
            unresolvedClasses.push(className);
          }
        }

        // Second: match compound class combinations (e.g., class="card active"
        // matches token "card.active" from .card.active {} selector)
        if (classNames.length >= 2) {
          const classSet = new Set(classNames);
          for (const tokenName of classRules.keys()) {
            if (!tokenName.includes(".")) {
              continue;
            }
            const parts = tokenName.split(".");
            if (parts.every((part) => classSet.has(part))) {
              resolvedTokenNames.push(tokenName);
              usedClassNames.add(tokenName);
            }
          }
        }

        // Third: match nested class rules (e.g., .card .title)
        if (nestedClassRules.size > 0) {
          const classSet = new Set(classNames);
          for (const [tokenName, { parsed }] of nestedClassRules) {
            const targetRequired = new Set(parsed.classNames);
            if (!setIsSubsetOf(targetRequired, classSet)) {
              continue;
            }
            if (
              parsed.ancestors &&
              !elementMatchesAncestors(node, parsed.ancestors)
            ) {
              continue;
            }
            resolvedTokenNames.push(tokenName);
            usedNestedTokenNames.add(tokenName);
            // Remove matched target class names from unresolved
            for (const cn of parsed.classNames) {
              const idx = unresolvedClasses.indexOf(cn);
              if (idx >= 0) {
                unresolvedClasses.splice(idx, 1);
              }
            }
          }
        }

        // Token style source selections will be created after all instances
        if (resolvedTokenNames.length > 0) {
          // Store the resolved token names for post-processing
          instanceTokenClasses.set(instanceId, resolvedTokenNames);
        }
        // Keep unresolved class names as class prop
        if (unresolvedClasses.length > 0) {
          props.push({
            id,
            instanceId,
            name: "class",
            type: "string",
            value: unresolvedClasses.join(" "),
          });
        }
        continue;
      }
      // selected option is represented as fake value attribute on select element
      if (node.tagName === "option" && attr.name === "selected") {
        continue;
      }
      if (type === "string") {
        props.push({ id, instanceId, name, type, value: attr.value });
        continue;
      }
      if (type === "number") {
        props.push({ id, instanceId, name, type, value: Number(attr.value) });
        continue;
      }
      if (type === "boolean") {
        props.push({ id, instanceId, name, type, value: true });
        continue;
      }
      (type) satisfies never;
    }
    const contentTags = findContentTags(node);
    const hasNonRichTextContent = !setIsSubsetOf(
      contentTags,
      richTextContentTags
    );
    if (node.tagName === "select") {
      for (const childNode of node.childNodes) {
        if (defaultTreeAdapter.isElementNode(childNode)) {
          if (
            childNode.tagName === "option" &&
            childNode.attrs.find((attr) => attr.name === "selected")
          ) {
            const valueAttr = childNode.attrs.find(
              (attr) => attr.name === "value"
            );
            // if value attribute is omitted, the value is taken from the text content of the option element
            const childText = childNode.childNodes.find((childNode) =>
              defaultTreeAdapter.isTextNode(childNode)
            );
            // selected option is represented as fake value attribute on select element
            props.push({
              id: `${instance.id}:value`,
              instanceId: instance.id,
              name: "value",
              type: "string",
              value: valueAttr?.value ?? childText?.value.trim() ?? "",
            });
          }
        }
      }
    }
    for (let index = 0; index < node.childNodes.length; index += 1) {
      const childNode = node.childNodes[index];
      if (defaultTreeAdapter.isElementNode(childNode)) {
        const child = convertElementToInstance(childNode);
        if (child) {
          instance.children.push(child);
        }
      }
      if (defaultTreeAdapter.isTextNode(childNode)) {
        // trim spaces around rich text
        // do not for code
        if (spaceRegex.test(childNode.value) && node.tagName !== "code") {
          if (index === 0 || index === node.childNodes.length - 1) {
            continue;
          }
        }
        let child: Instance["children"][number] = {
          type: "text",
          value: childNode.value,
        };
        if (node.tagName !== "code") {
          // collapse spacing characters inside of text to avoid preserved newlines
          child.value = child.value.replaceAll(/\s+/g, " ");
          // remove unnecessary spacing in nodes
          if (index === 0) {
            child.value = child.value.trimStart();
          }
          if (index === node.childNodes.length - 1) {
            child.value = child.value.trimEnd();
          }
        }
        // textarea content is initial value
        // and represented with fake value attribute
        if (node.tagName === "textarea") {
          props.push({
            id: `${instance.id}:value`,
            instanceId: instance.id,
            name: "value",
            type: "string",
            value: child.value.trim(),
          });
          continue;
        }
        // when element has content elements other than supported by rich text
        // wrap its text children with span, for example
        // <div>
        //   text
        //   <article></article>
        // </div>
        // is converted into
        // <div>
        //   <span>text</span>
        //   <article></article>
        // </div>
        if (hasNonRichTextContent) {
          // remove spaces between elements outside of rich text
          if (spaceRegex.test(childNode.value)) {
            continue;
          }
          const span: Instance = {
            type: "instance",
            id: getNewId(),
            component: elementComponent,
            tag: "span",
            children: [child],
          };
          instances.set(span.id, span);
          child = { type: "id", value: span.id };
        }
        instance.children.push(child);
      }
    }
    return { type: "id" as const, value: instance.id };
  };

  const children: Instance["children"] = [];
  for (const childNode of documentFragment.childNodes) {
    if (defaultTreeAdapter.isElementNode(childNode)) {
      const child = convertElementToInstance(childNode);
      if (child) {
        children.push(child);
      }
    }
  }

  // ---- Post-processing: create token style sources and styles ----
  // Now that all instances have been created and IDs assigned,
  // create token style sources (using the shared getNewId counter)
  // in the order that matches template rendering (instances first, then tokens)

  // Ensure all simple class rules become tokens, even when no elements reference them
  // (e.g. pasting just a <style> tag without HTML elements)
  for (const className of classRules.keys()) {
    usedClassNames.add(className);
  }
  // Add resolved nested tokens
  for (const tokenName of usedNestedTokenNames) {
    usedClassNames.add(tokenName);
  }

  const tokenIdMap = new Map<string, string>(); // className → styleSourceId

  for (const className of usedClassNames) {
    const styleSourceId = getNewId();
    tokenIdMap.set(className, styleSourceId);
    styleSources.push({
      type: "token",
      id: styleSourceId,
      name: className,
    });

    const decls =
      classRules.get(className) ?? nestedClassRules.get(className)?.decls;
    if (decls) {
      for (const decl of decls) {
        let breakpointId: string;
        if (decl.breakpoint) {
          const parsed = parseMediaQuery(decl.breakpoint);
          if (parsed === undefined) {
            continue;
          }
          const hasWidth =
            parsed.minWidth !== undefined || parsed.maxWidth !== undefined;
          const hasCondition = parsed.condition !== undefined;
          if (hasCondition) {
            const conditionParts: string[] = [];
            if (parsed.minWidth !== undefined) {
              conditionParts.push(`min-width:${parsed.minWidth}px`);
            }
            if (parsed.maxWidth !== undefined) {
              conditionParts.push(`max-width:${parsed.maxWidth}px`);
            }
            // hasCondition guarantees parsed.condition is defined
            conditionParts.push(parsed.condition as string);
            breakpointId = getOrCreateBreakpoint({
              condition: conditionParts.join(" and "),
            });
          } else if (hasWidth) {
            breakpointId = getOrCreateBreakpoint({
              ...(parsed.minWidth !== undefined
                ? { minWidth: parsed.minWidth }
                : {}),
              ...(parsed.maxWidth !== undefined
                ? { maxWidth: parsed.maxWidth }
                : {}),
            });
          } else {
            continue;
          }
        } else {
          breakpointId = getBaseBreakpointId();
        }
        styles.push({
          styleSourceId,
          breakpointId,
          property: camelCaseProperty(decl.property),
          value: decl.value,
          ...(decl.state ? { state: decl.state } : {}),
        });
      }
    }
  }

  // Create style source selections for instances that use tokens
  const selectionsByInstance = new Map(
    styleSourceSelections.map((sel) => [sel.instanceId, sel])
  );
  for (const [instanceId, classNames] of instanceTokenClasses) {
    const tokenIds = classNames
      .map((name) => tokenIdMap.get(name))
      .filter((id): id is string => id !== undefined);
    if (tokenIds.length > 0) {
      const existingSelection = selectionsByInstance.get(instanceId);
      if (existingSelection) {
        existingSelection.values.push(...tokenIds);
      } else {
        const newSelection: StyleSourceSelection = {
          instanceId,
          values: [...tokenIds],
        };
        styleSourceSelections.push(newSelection);
        selectionsByInstance.set(instanceId, newSelection);
      }
    }
  }

  // Resolve overlapping breakpoints
  resolveOverlappingBreakpoints(breakpoints);

  // Collect skipped nested selectors (no matching elements in the pasted HTML)
  const skippedSelectors: string[] = [];
  for (const [tokenName, { selector }] of nestedClassRules) {
    if (!usedNestedTokenNames.has(tokenName)) {
      skippedSelectors.push(selector);
    }
  }

  return {
    children,
    instances: Array.from(instances.values()),
    props,
    dataSources: [],
    resources: [],
    styleSourceSelections,
    styleSources,
    styles,
    breakpoints,
    assets: [],
    skippedSelectors,
  };
};
