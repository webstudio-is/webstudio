import type { StyleValue } from "../schema";
import { toValue, type TransformValue } from "./to-value";
import { hyphenateProperty } from "./to-property";
import { prefixStyles } from "./prefixer";
import { mergeStyles } from "./merger";

const mapGroupBy = <Item, Key>(
  array: Item[] | Iterable<Item>,
  getKey: (item: Item) => Key
) => {
  const groups = new Map<Key, Item[]>();
  for (const item of array) {
    const key = getKey(item);
    let group = groups.get(key);
    if (group === undefined) {
      group = [];
      groups.set(key, group);
    }
    group.push(item);
  }
  return groups;
};

/**
 * Merge styles on every group by breakpoint and selector
 * and convert back to declarations list
 */
const mergeDeclarations = (declarations: Iterable<Declaration>) => {
  const newDeclarations: Declaration[] = [];
  const groups = mapGroupBy(
    declarations,
    (declaration) => declaration.breakpoint + declaration.selector
  );
  for (const groupDeclarations of groups.values()) {
    const { breakpoint, selector } = groupDeclarations[0];
    const merged = mergeStyles(
      new Map(
        groupDeclarations.map((item) => [item.property, item.value] as const)
      )
    );
    for (const [property, value] of merged) {
      newDeclarations.push({
        breakpoint,
        selector,
        property,
        value,
      });
    }
  }
  return newDeclarations;
};

export type StyleMap = Map<string, StyleValue>;

export const generateStyleMap = (
  style: StyleMap,
  {
    indent = 0,
    transformValue,
  }: {
    indent?: number;
    transformValue?: TransformValue;
  } = {}
) => {
  const spaces = " ".repeat(indent);
  let lines = "";
  for (const [property, value] of style) {
    const propertyString = hyphenateProperty(property);
    const valueString = toValue(value, transformValue);
    const line = `${spaces}${propertyString}: ${valueString}`;
    lines += lines === "" ? line : `;\n${line}`;
  }
  return lines;
};

export type Declaration = {
  breakpoint: string;
  selector: string;
  property: string;
  value: StyleValue;
};

const normalizeDeclaration = <Type extends DeclarationKey>(
  declaration: Type
): Type => ({
  ...declaration,
  property: hyphenateProperty(declaration.property),
});

type DeclarationKey = Omit<Declaration, "value">;

const getDeclarationKey = (declaraionKey: DeclarationKey) => {
  const { breakpoint, selector, property } = declaraionKey;
  return `${breakpoint}:${selector}:${property}`;
};

/**
 * Reusable style rule in any nesting rule
 *
 * @mixin name {
 *   \@media breakpoint {
 *     &selector {
 *       property: value
 *     }
 *   }
 * }
 */
export class MixinRule {
  // use map to avoid duplicated properties
  #declarations = new Map<string, Declaration>();
  #dirtyBreakpoints = new Set<string>();
  /*
   * check if breakpoint was updated
   */
  isDirtyBreakpoint(breakpoint: string) {
    return this.#dirtyBreakpoints.has(breakpoint);
  }
  /**
   * reset breakpoints invalidation
   */
  clearBreakpoints() {
    this.#dirtyBreakpoints.clear();
  }
  setDeclaration(declaration: Declaration) {
    // @todo temporary solution until styles are migrated to hyphenated format
    declaration = normalizeDeclaration(declaration);
    this.#declarations.set(getDeclarationKey(declaration), declaration);
    this.#dirtyBreakpoints.add(declaration.breakpoint);
  }
  deleteDeclaration(declaration: DeclarationKey) {
    // @todo temporary solution until styles are migrated to hyphenated format
    declaration = normalizeDeclaration(declaration);
    this.#declarations.delete(getDeclarationKey(declaration));
    this.#dirtyBreakpoints.add(declaration.breakpoint);
  }
  getDeclarations() {
    return this.#declarations.values();
  }
}

/**
 * Universal style rule with nested selectors and media queries support
 * Rules are generated by each media query
 * and heavily cached to avoid complex computation
 *
 * selector {
 *   \@media breakpoint {
 *     &selector {
 *       property: value
 *     }
 *   }
 * }
 */
export class NestingRule {
  #selector: string;
  #descendantSuffix: string;
  #mixinRules = new Map<string, MixinRule>();
  #mixins = new Set<string>();
  // use map to avoid duplicated properties
  #declarations = new Map<string, Declaration>();
  // cached generated rule by breakpoint
  #cache = new Map<
    string,
    { generated: string; indent: number; transformValue?: TransformValue }
  >();
  constructor(
    mixinRules: Map<string, MixinRule>,
    selector: string,
    descendantSuffix: string
  ) {
    this.#selector = selector;
    this.#descendantSuffix = descendantSuffix;
    this.#mixinRules = mixinRules;
  }
  getSelector() {
    return this.#selector;
  }
  setSelector(selector: string) {
    this.#selector = selector;
    this.#cache.clear();
  }
  getDescendantSuffix() {
    return this.#descendantSuffix;
  }
  addMixin(mixin: string) {
    this.#mixins.add(mixin);
    this.#cache.clear();
  }
  applyMixins(mixins: string[]) {
    this.#mixins = new Set(mixins);
    this.#cache.clear();
  }
  setDeclaration(declaration: Declaration) {
    // @todo temporary solution until styles are migrated to hyphenated format
    declaration = normalizeDeclaration(declaration);
    this.#declarations.set(getDeclarationKey(declaration), declaration);
    this.#cache.delete(declaration.breakpoint);
  }
  deleteDeclaration(declaration: DeclarationKey) {
    // @todo temporary solution until styles are migrated to hyphenated format
    declaration = normalizeDeclaration(declaration);
    this.#declarations.delete(getDeclarationKey(declaration));
    this.#cache.delete(declaration.breakpoint);
  }
  #getDeclarations() {
    // apply mixins first and then merge added declarations
    const declarations = new Map<string, Declaration>();
    for (const mixin of this.#mixins) {
      const rule = this.#mixinRules.get(mixin);
      if (rule === undefined) {
        continue;
      }
      for (const declaration of rule.getDeclarations()) {
        declarations.set(getDeclarationKey(declaration), declaration);
      }
    }
    for (const declaration of this.#declarations.values()) {
      declarations.set(getDeclarationKey(declaration), declaration);
    }
    return declarations.values();
  }
  getMergedDeclarations() {
    return mergeDeclarations(this.#getDeclarations());
  }
  toString({
    breakpoint,
    indent = 0,
    transformValue,
  }: {
    breakpoint: string;
    indent?: number;
    transformValue?: TransformValue;
  }) {
    for (const mixin of this.#mixins) {
      const rule = this.#mixinRules.get(mixin);
      // invalidate cache when mixin is changed
      if (rule?.isDirtyBreakpoint(breakpoint)) {
        this.#cache.delete(breakpoint);
      }
    }

    const cached = this.#cache.get(breakpoint);
    // invalidate cache when indent and value transformer are changed
    if (
      cached &&
      cached.indent === indent &&
      cached.transformValue === transformValue
    ) {
      return cached.generated;
    }
    const styleBySelector = new Map<string, StyleMap>();
    for (const declaration of this.getMergedDeclarations()) {
      // generate declarations only for specified breakpoint
      if (declaration.breakpoint !== breakpoint) {
        continue;
      }
      const { selector: nestedSelector } = declaration;
      const selector = this.#selector + this.#descendantSuffix + nestedSelector;
      let style = styleBySelector.get(selector);
      if (style === undefined) {
        style = new Map();
        styleBySelector.set(selector, style);
      }
      style.set(declaration.property, declaration.value);
    }
    const spaces = " ".repeat(indent);
    // sort by selector to put values without nested selector first
    const generated = Array.from(styleBySelector)
      .sort(([leftSelector], [rightSelector]) =>
        leftSelector.localeCompare(rightSelector)
      )
      .map(([selector, style]) => {
        const content = generateStyleMap(prefixStyles(style), {
          indent: indent + 2,
          transformValue,
        });
        return `${spaces}${selector} {\n${content}\n${spaces}}\n`;
      })
      .join("")
      .trimEnd();
    this.#cache.set(breakpoint, { generated, indent, transformValue });
    return generated;
  }
}

export type MediaRuleOptions = {
  minWidth?: number;
  maxWidth?: number;
  mediaType?: "all" | "screen" | "print";
};

export class MediaRule {
  #name: string;
  options: MediaRuleOptions;
  rules: Map<string, PlaintextRule>;
  #mediaType;
  constructor(name: string, options: MediaRuleOptions = {}) {
    this.#name = name;
    this.options = options;
    this.rules = new Map();
    this.#mediaType = options.mediaType ?? "all";
  }
  insertRule(rule: PlaintextRule) {
    this.rules.set(rule.cssText, rule);
    return rule;
  }
  get cssText() {
    return this.toString();
  }
  toString() {
    return this.generateRule({ nestingRules: [] });
  }
  generateRule({
    nestingRules,
    transformValue,
  }: {
    nestingRules: NestingRule[];
    transformValue?: TransformValue;
  }) {
    if (this.rules.size === 0 && nestingRules.length === 0) {
      return "";
    }
    const rules = [];
    for (const rule of this.rules.values()) {
      rules.push(rule.toString());
    }
    for (const rule of nestingRules) {
      const generatedRule = rule.toString({
        breakpoint: this.#name,
        indent: 2,
        transformValue,
      });
      if (generatedRule !== "") {
        rules.push(generatedRule);
      }
    }
    // avoid rendering empty media queries
    if (rules.length === 0) {
      return "";
    }
    let conditionText = "";
    const { minWidth, maxWidth } = this.options;
    if (minWidth !== undefined) {
      conditionText = ` and (min-width: ${minWidth}px)`;
    }
    if (maxWidth !== undefined) {
      conditionText += ` and (max-width: ${maxWidth}px)`;
    }
    return `@media ${this.#mediaType}${conditionText} {\n${rules.join(
      "\n"
    )}\n}`;
  }
}

export class PlaintextRule {
  cssText;
  constructor(cssText: string) {
    this.cssText = cssText;
  }
  toString() {
    return this.cssText;
  }
}

export type FontFaceOptions = {
  fontFamily: string;
  fontStyle?: "normal" | "italic" | "oblique";
  fontWeight?: number | string;
  fontDisplay: "swap" | "auto" | "block" | "fallback" | "optional";
  src: string;
};

export class FontFaceRule {
  #cached: undefined | string;
  #options: FontFaceOptions;
  constructor(options: FontFaceOptions) {
    this.#options = options;
  }
  get cssText() {
    return this.toString();
  }
  toString() {
    if (this.#cached) {
      return this.#cached;
    }
    const decls = [];
    const { fontFamily, fontStyle, fontWeight, fontDisplay, src } =
      this.#options;
    const value = toValue(
      { type: "fontFamily", value: [fontFamily] },
      // Avoids adding a fallback automatically which needs to happen for font family in general but not for font face.
      (value) => value
    );
    decls.push(`font-family: ${value}`);
    decls.push(`font-style: ${fontStyle}`);
    decls.push(`font-weight: ${fontWeight}`);
    decls.push(`font-display: ${fontDisplay}`);
    decls.push(`src: ${src}`);
    this.#cached = `@font-face {\n  ${decls.join("; ")};\n}`;
    return this.#cached;
  }
}
