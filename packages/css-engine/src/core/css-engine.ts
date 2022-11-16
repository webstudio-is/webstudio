import { CssRule } from "@webstudio-is/react-sdk";
import { MediaRule, StyleRule, type MediaRuleOptions } from "./rules";
import { StyleElement } from "./style-element";
import { StyleSheet } from "./style-sheet";

const defaultMediaRuleId = "__default-media-rule__";

export class CssEngine {
  #element;
  #mediaRules: Map<string, MediaRule> = new Map();
  #sheet: StyleSheet;
  #isDirty = false;
  #cssText = "";
  constructor() {
    this.#element = new StyleElement();
    this.#sheet = new StyleSheet(this.#element);
    this.addMediaRule(defaultMediaRuleId);
  }
  addMediaRule(id: string, options?: MediaRuleOptions) {
    let mediaRule = this.#mediaRules.get(id);
    if (mediaRule === undefined) {
      mediaRule = new MediaRule(options);
      this.#mediaRules.set(id, mediaRule);
      this.#isDirty = true;
    }
    return mediaRule;
  }
  addStyleRule(selectorText: string, rule: CssRule) {
    const mediaRule =
      this.#mediaRules.get(rule.breakpoint) ??
      this.#mediaRules.get(defaultMediaRuleId);
    this.#isDirty = true;
    const styleRule = new StyleRule(selectorText, rule.style);
    styleRule.onChange = this.#onChangeRule;
    if (mediaRule === undefined) {
      // Should be impossible to reach.
      throw new Error("No media rule found");
    }
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
