import { Breakpoint, Style, toValue } from "@webstudio-is/react-sdk";

export class StyleRule {
  id = -1;
  style: Style;
  // @todo name can be composition token name or component name
  name = "s";
  constructor(style: Style) {
    this.style = style;
  }
  get cssText() {
    const block = [];
    let property: keyof Style;
    for (property in this.style) {
      const value = this.style[property];
      if (value === undefined) continue;
      block.push(`${property}: ${toValue(value)}`);
    }
    const selector = `${this.name}${this.id}`;
    return `.${selector} { ${block.join("; ")} }`;
  }
}

export class MediaRule {
  #id = "";
  #breakpoint: Breakpoint;
  rules: Array<StyleRule> = [];
  constructor(breakpoint: Breakpoint) {
    this.#breakpoint = breakpoint;
    this.#id = breakpoint.id;
  }
  insertRule(rule: StyleRule) {
    this.rules.push(rule);
    return rule;
  }
  get cssText() {
    if (this.rules.length === 0) return "";
    const rules = this.rules.map((rule) => `  ${rule.cssText}`).join("\n");
    return `@media (min-width: ${this.#breakpoint.minWidth}px) {\n${rules}\n}`;
  }
}

type Rule = StyleRule | MediaRule;

export class VirtualStyleSheet {
  rulesCounter = -1;
  rules: Array<Rule> = [];
  insertRule(rule: Rule) {
    this.rules.push(rule);
  }
  get cssText() {
    if (this.rules.length === 0) return "";
    return this.rules.map((rule) => rule.cssText).join("\n");
  }
}

export type StyleSheet = CSSStyleSheet | VirtualStyleSheet;
