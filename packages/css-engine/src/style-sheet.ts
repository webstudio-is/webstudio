import {
  Breakpoint,
  CssRule,
  Style,
  StyleValue,
  toValue,
} from "@webstudio-is/react-sdk";

let ruleCounter = -1;

class Rule {
  style: Style;
  // @todo name can be composition token name or component name
  name: string = "s";
  constructor(style: Style) {
    this.style = style;
  }
  toString() {
    const block = [];
    let property: keyof Style;
    for (property in this.style) {
      const value = this.style[property];
      if (value === undefined) continue;
      block.push(`${property}: ${toValue(value)}`);
    }
    const selector = `${this.name}${++ruleCounter}`;
    return `.${selector} { ${block.join("; ")} }`;
  }
}

const createRule = (rule: CssRule) => new Rule(rule.style);

export class StyleSheet {
  rules: Array<Rule> = [];
  breakpoints: Array<Breakpoint> = [];
  style?: HTMLStyleElement;
  addBreakpoints(breakpoints: Array<Breakpoint>) {
    this.breakpoints.push(...breakpoints);
  }
  addRules(rules: Array<CssRule>) {
    // @todo throw if referenced breakpoint doesn't exist?
    this.rules.push(...rules.map(createRule));
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
    for (const rule of this.rules) {
      css.push(rule.toString());
    }
    return css.join("\n");
  }
}
