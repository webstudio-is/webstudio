import { Breakpoint, CssRule, Style, toValue } from "@webstudio-is/react-sdk";

let ruleCounter = -1;

export const resetRuleCounter = () => {
  ruleCounter = -1;
};

class StyleRule {
  id: number;
  style: Style;
  // @todo name can be composition token name or component name
  name = "s";
  constructor(style: Style) {
    this.style = style;
    this.id = ++ruleCounter;
  }
  toString() {
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

class MediaRule {
  id = "";
  breakpoint: Breakpoint;
  rules: Array<StyleRule> = [];
  constructor(breakpoint: Breakpoint) {
    this.breakpoint = breakpoint;
    this.id = breakpoint.id;
  }
  addRule(rule: StyleRule) {
    this.rules.push(rule);
    return rule;
  }
  toString() {
    if (this.rules.length === 0) return "";
    const query = `min-width: ${this.breakpoint.minWidth}px`;
    const rules = this.rules.map((rule) => `  ${rule}`).join("\n");
    return `@media (${query}) {\n${rules}\n}`;
  }
}

export class StyleSheet {
  mediaRules: Map<Breakpoint["id"], MediaRule> = new Map();
  style?: HTMLStyleElement;
  addBreakpoints(breakpoints: Array<Breakpoint>) {
    for (const breakpoint of breakpoints) {
      this.mediaRules.set(breakpoint.id, new MediaRule(breakpoint));
    }
  }
  addRule(rule: CssRule) {
    const mediaRule = this.mediaRules.get(rule.breakpoint);
    if (mediaRule === undefined) {
      throw new Error(`Unknown breakpoint: ${rule.breakpoint}`);
    }
    return mediaRule.addRule(new StyleRule(rule.style));
  }
  addRules(rules: Array<CssRule>) {
    for (const rule of rules) {
      this.addRule(rule);
    }
  }
  mount() {
    if (this.style !== undefined) {
      throw new Error("StyleSheet already mounted");
    }
    this.style = document.createElement("style");
    this.style.textContent = this.toString();
    document.head.appendChild(this.style);
  }
  unmount() {
    this.style?.parentElement?.removeChild(this.style);
  }
  toString() {
    const css = [];
    for (const mediaRule of this.mediaRules.values()) {
      const str = mediaRule.toString();
      if (str !== "") css.push(mediaRule.toString());
    }
    return css.join("\n");
  }
}
