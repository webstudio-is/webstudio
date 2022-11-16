import {
  toValue,
  type Style,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/react-sdk";
import hyphenate from "hyphenate-style-name";

class StylePropertyMap {
  #styleMap: Map<StyleProperty, StyleValue | undefined> = new Map();
  #isDirty = false;
  #string = "";
  onChange?: () => void;
  set(property: StyleProperty, value?: StyleValue) {
    this.#styleMap.set(property, value);
    this.#isDirty = true;
    this.onChange?.();
  }
  toString() {
    if (this.#isDirty === false) {
      return this.#string;
    }
    const block: Array<string> = [];
    for (const [property, value] of this.#styleMap) {
      if (value === undefined) continue;
      block.push(`${hyphenate(property)}: ${toValue(value)}`);
    }
    this.#string = block.join("; ");
    this.#isDirty = false;
    return this.#string;
  }
}

export class StyleRule {
  styleMap;
  selectorText;
  onChange?: () => void;
  constructor(selectorText: string, style: Style) {
    this.styleMap = new StylePropertyMap();
    this.selectorText = selectorText;
    let property: StyleProperty;
    for (property in style) {
      this.styleMap.set(property, style[property]);
    }
    this.styleMap.onChange = this.#onChange;
  }
  #onChange = () => {
    this.onChange?.();
  };
  get cssText() {
    return `${this.selectorText} { ${this.styleMap} }`;
  }
}

export type MediaRuleOptions = {
  minWidth?: number;
  maxWidth?: number;
  mediaType?: "all" | "screen" | "print";
};

export class MediaRule {
  #options: MediaRuleOptions;
  rules: Array<StyleRule | PlaintextRule> = [];
  #mediaType;
  constructor(options: MediaRuleOptions = {}) {
    this.#options = options;
    this.#mediaType = options.mediaType ?? "all";
  }
  insertRule(rule: StyleRule | PlaintextRule) {
    this.rules.push(rule);
    return rule;
  }
  get cssText() {
    if (this.rules.length === 0) return "";
    const rules = [];
    for (const rule of this.rules) {
      rules.push(`  ${rule.cssText}`);
    }
    let conditionText = "";
    const { minWidth, maxWidth } = this.#options;
    if (minWidth !== undefined) conditionText = `min-width: ${minWidth}px`;
    if (maxWidth !== undefined) conditionText = `max-width: ${maxWidth}px`;
    if (conditionText) conditionText = `and (${conditionText}) `;
    return `@media ${this.#mediaType} ${conditionText}{\n${rules.join(
      "\n"
    )}\n}`;
  }
}

export class PlaintextRule {
  cssText;
  styleMap = new Map();
  constructor(cssText: string) {
    this.cssText = cssText;
  }
}

export type AnyRule = StyleRule | MediaRule | PlaintextRule;
