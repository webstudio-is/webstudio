import { Breakpoint, Style, toValue } from "@webstudio-is/react-sdk";

export class StyleRule {
  id = -1;
  style: Style;
  // @todo name can be composition token name or component name
  name = "c";
  get className() {
    return `${this.name}${this.id}`;
  }
  constructor(style: Style, id: number) {
    this.style = style;
    this.id = id;
  }
  get cssText() {
    const block: Array<string> = [];
    let property: keyof Style;
    for (property in this.style) {
      const value = this.style[property];
      if (value === undefined) continue;
      block.push(`${property}: ${toValue(value)}`);
    }
    return `.${this.className} { ${block.join("; ")} }`;
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
    const rules = this.rules.map((rule) => `  ${rule.cssText}`).join("\n");
    return `@media (min-width: ${this.#breakpoint.minWidth}px) {\n${rules}\n}`;
  }
}

export type Rule = StyleRule | MediaRule;
