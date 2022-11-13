import { Breakpoint, CssRule } from "@webstudio-is/react-sdk";
import { MediaRule, StyleRule } from "./rules";
import { StyleElement } from "./style-element";
import { StyleSheet } from "./style-sheet";

export class CssEngine {
  #element;
  #mediaRules: Map<Breakpoint["id"], MediaRule> = new Map();
  #sheet: StyleSheet;
  #isDirty = false;
  #cssText = "";
  constructor() {
    this.#element = new StyleElement();
    this.#sheet = new StyleSheet(this.#element);
  }
  addBreakpoint(breakpoint: Breakpoint) {
    let mediaRule = this.#mediaRules.get(breakpoint.id);
    if (mediaRule === undefined) {
      mediaRule = new MediaRule(breakpoint);
      this.#mediaRules.set(breakpoint.id, mediaRule);
      this.#isDirty = true;
    }
    return mediaRule;
  }
  addRule(selectorText: string, rule: CssRule) {
    const mediaRule = this.#mediaRules.get(rule.breakpoint);
    if (mediaRule === undefined) {
      throw new Error(`Unknown breakpoint: ${rule.breakpoint}`);
    }
    this.#isDirty = true;
    const styleRule = new StyleRule(selectorText, rule.style);
    styleRule.onChange = this.#onChangeRule;
    return mediaRule.insertRule(styleRule);
  }
  render() {
    this.#element.mount();
    // This isn't going to do anything if the `cssText` hasn't changed.
    this.#sheet.replaceSync(this.cssText);
  }
  get cssText() {
    if (this.#isDirty === false) {
      return this.#cssText;
    }
    this.#isDirty = false;
    const css: Array<string> = [];
    for (const mediaRule of this.#mediaRules.values()) {
      const { cssText } = mediaRule;
      if (cssText !== "") css.push(cssText);
    }
    this.#cssText = css.join("\n");
    return this.#cssText;
  }

  #onChangeRule = () => {
    this.#isDirty = true;
  };
}
