import type { Style, StyleProperty, StyleValue } from "../schema";
import { toValue, type TransformValue } from "./to-value";
import { toProperty } from "./to-property";

export class StylePropertyMap {
  #styleMap: Map<StyleProperty, StyleValue | undefined> = new Map();
  #isDirty = true;
  #string = "";
  #indent = 0;
  #transformValue?: TransformValue;
  #onChange?: () => void;
  constructor(
    style: Style,
    transformValue?: TransformValue,
    onChange?: () => void
  ) {
    this.#transformValue = transformValue;
    this.#onChange = onChange;
    let property: StyleProperty;
    for (property in style) {
      this.#styleMap.set(property, style[property]);
    }
  }
  setTransformer(transformValue: TransformValue) {
    this.#transformValue = transformValue;
  }
  set(property: StyleProperty, value?: StyleValue) {
    this.#styleMap.set(property, value);
    this.#isDirty = true;
    this.#onChange?.();
  }
  get(property: StyleProperty) {
    return this.#styleMap.get(property);
  }
  has(property: StyleProperty) {
    return this.#styleMap.has(property);
  }
  get size() {
    return this.#styleMap.size;
  }
  keys() {
    return this.#styleMap.keys();
  }
  delete(property: StyleProperty) {
    this.#styleMap.delete(property);
    this.#isDirty = true;
    this.#onChange?.();
  }
  clear() {
    this.#styleMap.clear();
    this.#isDirty = true;
    this.#onChange?.();
  }
  toString({ indent = 0 } = {}) {
    if (this.#isDirty === false && indent === this.#indent) {
      return this.#string;
    }
    this.#indent = indent;
    const block: Array<string> = [];
    const spaces = " ".repeat(indent);
    for (const [property, value] of this.#styleMap) {
      if (value === undefined) {
        continue;
      }
      block.push(
        `${spaces}${toProperty(property)}: ${toValue(
          value,
          this.#transformValue
        )}`
      );
    }
    this.#string = block.join(";\n");
    this.#isDirty = false;
    return this.#string;
  }
}

export class StyleRule {
  styleMap;
  selectorText;
  constructor(
    selectorText: string,
    style: StylePropertyMap | Style,
    transformValue?: TransformValue,
    onChange?: () => void
  ) {
    this.selectorText = selectorText;
    this.styleMap =
      style instanceof StylePropertyMap
        ? style
        : new StylePropertyMap(style, transformValue, onChange);
  }
  get cssText() {
    return this.toString();
  }
  toString(options = { indent: 0 }) {
    const spaces = " ".repeat(options.indent);
    return `${spaces}${this.selectorText} {\n${this.styleMap.toString({
      indent: options.indent + 2,
    })}\n${spaces}}`;
  }
}

export type MediaRuleOptions = {
  minWidth?: number;
  maxWidth?: number;
  mediaType?: "all" | "screen" | "print";
};

export class MediaRule {
  options: MediaRuleOptions;
  rules: Map<string, StyleRule | PlaintextRule>;
  #mediaType;
  constructor(options: MediaRuleOptions = {}) {
    this.options = options;
    this.rules = new Map();
    this.#mediaType = options.mediaType ?? "all";
  }
  insertRule(rule: StyleRule | PlaintextRule) {
    this.rules.set(
      "selectorText" in rule ? rule.selectorText : rule.cssText,
      rule
    );
    return rule;
  }
  get cssText() {
    return this.toString();
  }
  toString() {
    if (this.rules.size === 0) {
      return "";
    }
    const rules = [];
    for (const rule of this.rules.values()) {
      rules.push(rule.toString({ indent: 2 }));
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
  styleMap: StylePropertyMap;
  constructor(cssText: string) {
    this.cssText = cssText;
    this.styleMap = new StylePropertyMap({});
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
  options: FontFaceOptions;
  constructor(options: FontFaceOptions) {
    this.options = options;
  }
  get cssText() {
    return this.toString();
  }
  toString() {
    const decls = [];
    const { fontFamily, fontStyle, fontWeight, fontDisplay, src } =
      this.options;
    decls.push(
      `font-family: ${/\s/.test(fontFamily) ? `"${fontFamily}"` : fontFamily}`
    );
    decls.push(`font-style: ${fontStyle}`);
    decls.push(`font-weight: ${fontWeight}`);
    decls.push(`font-display: ${fontDisplay}`);
    decls.push(`src: ${src}`);
    return `@font-face {\n  ${decls.join("; ")};\n}`;
  }
}

export type AnyRule = StyleRule | MediaRule | PlaintextRule | FontFaceRule;
