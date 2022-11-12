import { Breakpoint, CssRule } from "@webstudio-is/react-sdk";
import { MediaRule, StyleRule } from "./rules";
import { StyleSheet } from "./style-sheet";

export class CssEngine {
  rulesCounter = -1;
  mediaRules: Map<Breakpoint["id"], MediaRule> = new Map();
  sheet: StyleSheet;
  constructor() {
    this.sheet = new StyleSheet();
  }
  addBreakpoint(breakpoint: Breakpoint) {
    const mediaRule = new MediaRule(breakpoint);
    this.mediaRules.set(breakpoint.id, mediaRule);
  }
  addRule(rule: CssRule) {
    const mediaRule = this.mediaRules.get(rule.breakpoint);
    if (mediaRule === undefined) {
      throw new Error(`Unknown breakpoint: ${rule.breakpoint}`);
    }
    const styleRule = new StyleRule(rule.style, ++this.rulesCounter);
    return mediaRule.insertRule(styleRule);
  }
  render() {
    this.sheet.mount();
    this.sheet.replaceSync(this.cssText);
  }
  get cssText() {
    const css: Array<string> = [];
    for (const mediaRule of this.mediaRules.values()) {
      const { cssText } = mediaRule;
      if (cssText !== "") css.push(cssText);
    }
    return css.join("\n");
  }
}
