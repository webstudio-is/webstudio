import { Breakpoint, CssRule } from "@webstudio-is/react-sdk";
import { MediaRule, StyleRule, VirtualStyleSheet } from "./style-sheet";

export class CssEngine<Sheet> {
  rulesCounter = -1;
  sheet: Sheet;
  mediaRules: Map<Breakpoint["id"], MediaRule> = new Map();
  constructor(sheet: Sheet) {
    this.sheet = sheet;
  }

  addBreakpoint(breakpoint: Breakpoint) {
    const mediaRule = new MediaRule(breakpoint);
    this.mediaRules.set(breakpoint.id, mediaRule);
    console.log(111, mediaRule.cssText);
    this.sheet.insertRule(mediaRule.cssText);
  }

  addRule(rule: CssRule) {
    const mediaRule = this.mediaRules.get(rule.breakpoint);
    if (mediaRule === undefined) {
      throw new Error(`Unknown breakpoint: ${rule.breakpoint}`);
    }
    const styleRule = new StyleRule(rule.style);
    styleRule.id = ++this.rulesCounter;
    return mediaRule.insertRule(styleRule);
  }
  mount() {
    if (
      this.sheet instanceof CSSStyleSheet &&
      typeof document === "object" &&
      "adoptedStyleSheets" in document
    ) {
      console.log(111, this.sheet);
      // @ts-expect-error TS2339: Property 'adoptedStyleSheets' does not exist on type 'Document'.
      document.adoptedStyleSheets = [this.sheet];
      return;
    }
    const style = document.createElement("style");
    for (const rule of this.sheet.rules) {
      cssText += rule;
    }
    style.textContent = cssText;
  }
  get cssText() {
    const css = [];
    for (const mediaRule of this.mediaRules.values()) {
      const { cssText } = mediaRule;
      if (cssText !== "") css.push(cssText);
    }
    return css.join("\n");
  }
}
