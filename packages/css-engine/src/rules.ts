import {
  Breakpoint,
  Style,
  toValue,
  StyleProperty,
  StyleValue,
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

export class MediaRule {
  #breakpoint: Breakpoint;
  rules: Array<StyleRule> = [];
  constructor(breakpoint: Breakpoint) {
    this.#breakpoint = breakpoint;
  }
  insertRule(rule: StyleRule) {
    this.rules.push(rule);
    return rule;
  }
  get cssText() {
    const rules = [];
    for (const rule of this.rules) {
      rules.push(`  ${rule.cssText}`);
    }
    return `@media (min-width: ${this.#breakpoint.minWidth}px) {\n${rules.join(
      "\n"
    )}\n}`;
  }
}

export type AnyRule = StyleRule | MediaRule;
