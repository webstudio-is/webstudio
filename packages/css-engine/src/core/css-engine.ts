import type { Style } from "@webstudio-is/css-data";
import {
  FontFaceRule,
  MediaRule,
  PlaintextRule,
  StyleRule,
  type FontFaceOptions,
  type MediaRuleOptions,
} from "./rules";
import { compareMedia } from "./compare-media";
import { StyleElement } from "./style-element";
import { StyleSheet } from "./style-sheet";
import type { TransformValue } from "./to-value";

const defaultMediaRuleId = "__default-media-rule__";

type CssRule = {
  style: Style;
  breakpoint?: string;
};

export type CssEngineOptions = { name?: string };

export class CssEngine {
  #element;
  #mediaRules: Map<string, MediaRule> = new Map();
  #plainRules: Map<string, PlaintextRule> = new Map();
  #fontFaceRules: Array<FontFaceRule> = [];
  #sheet: StyleSheet;
  #isDirty = false;
  #cssText = "";
  constructor({ name }: CssEngineOptions) {
    this.#element = new StyleElement(name);
    this.#sheet = new StyleSheet(this.#element);
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
  addStyleRule(
    selectorText: string,
    rule: CssRule,
    transformValue?: TransformValue
  ) {
    const mediaRule = this.addMediaRule(rule.breakpoint || defaultMediaRuleId);
    this.#isDirty = true;
    const styleRule = new StyleRule(selectorText, rule.style, transformValue);
    styleRule.onChange = this.#onChangeRule;
    if (mediaRule === undefined) {
      // Should be impossible to reach.
      throw new Error("No media rule found");
    }
    mediaRule.insertRule(styleRule);
    return styleRule;
  }
  addPlaintextRule(cssText: string) {
    const rule = this.#plainRules.get(cssText);
    if (rule !== undefined) {
      return rule;
    }
    this.#isDirty = true;
    return this.#plainRules.set(cssText, new PlaintextRule(cssText));
  }
  addFontFaceRule(options: FontFaceOptions) {
    this.#isDirty = true;
    return this.#fontFaceRules.push(new FontFaceRule(options));
  }
  clear() {
    this.#mediaRules.clear();
    this.#plainRules.clear();
    this.#fontFaceRules = [];
    this.#isDirty = true;
  }
  render() {
    this.#element.mount();
    // This isn't going to do anything if the `cssText` hasn't changed.
    this.#sheet.replaceSync(this.cssText);
  }
  unmount() {
    this.#element.unmount();
  }
  setAttribute(name: string, value: string) {
    this.#element.setAttribute(name, value);
  }
  getAttribute(name: string) {
    return this.#element.getAttribute(name);
  }
  get cssText() {
    if (this.#isDirty === false) {
      return this.#cssText;
    }
    this.#isDirty = false;
    const css: Array<string> = [];

    css.push(...this.#fontFaceRules.map((rule) => rule.cssText));
    for (const plaintextRule of this.#plainRules.values()) {
      css.push(plaintextRule.cssText);
    }

    const sortedMediaRules = Array.from(this.#mediaRules.values()).sort(
      (ruleA, ruleB) => compareMedia(ruleA.options, ruleB.options)
    );
    for (const mediaRule of sortedMediaRules) {
      const { cssText } = mediaRule;
      if (cssText !== "") {
        css.push(cssText);
      }
    }
    this.#cssText = css.join("\n");
    return this.#cssText;
  }

  #onChangeRule = () => {
    this.#isDirty = true;
  };
}
