import type { Style } from "../schema";
import {
  FontFaceRule,
  MediaRule,
  PlaintextRule,
  type FontFaceOptions,
  type MediaRuleOptions,
} from "./rules";
import { compareMedia } from "./compare-media";
import { StyleElement } from "./style-element";

export type CssRule = {
  style: Style;
  breakpoint?: string;
};

export class StyleSheet {
  #cssText = "";
  #mediaRules: Map<string, MediaRule> = new Map();
  #plainRules: Map<string, PlaintextRule> = new Map();
  #fontFaceRules: Array<FontFaceRule> = [];
  #isDirty = false;
  #element: StyleElement;
  constructor(element: StyleElement) {
    this.#element = element;
  }
  addMediaRule(id: string, options?: MediaRuleOptions) {
    let mediaRule = this.#mediaRules.get(id);
    if (mediaRule === undefined) {
      mediaRule = new MediaRule(options);
      this.#mediaRules.set(id, mediaRule);
      this.#isDirty = true;
      return mediaRule;
    }

    if (options) {
      mediaRule.options = options;
      this.#isDirty = true;
    }

    if (mediaRule === undefined) {
      // Should be impossible to reach.
      throw new Error("No media rule found");
    }

    return mediaRule;
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
  markAsDirty() {
    this.#isDirty = true;
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
  clear() {
    this.#mediaRules.clear();
    this.#plainRules.clear();
    this.#fontFaceRules = [];
    this.#isDirty = true;
  }
  render() {
    this.#element.mount();
    this.#element.render(this.cssText);
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
}
