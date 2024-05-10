import type { Style } from "../schema";
import {
  FontFaceRule,
  MediaRule,
  MixinRule,
  NestingRule,
  PlaintextRule,
  type FontFaceOptions,
  type MediaRuleOptions,
} from "./rules";
import { compareMedia } from "./compare-media";
import { StyleElement } from "./style-element";
import type { TransformValue } from "./to-value";

export type CssRule = {
  style: Style;
  breakpoint?: string;
};

export class StyleSheet {
  #cssText = "";
  #mediaRules: Map<string, MediaRule> = new Map();
  #plainRules: Map<string, PlaintextRule> = new Map();
  #mixinRules: Map<string, MixinRule> = new Map();
  nestingRules: Map<string, NestingRule> = new Map();
  #fontFaceRules: Array<FontFaceRule> = [];
  #transformValue?: TransformValue;
  #element: StyleElement;
  constructor(element: StyleElement) {
    this.#element = element;
  }
  setTransformer(transformValue: TransformValue) {
    this.#transformValue = transformValue;
  }
  addMediaRule(id: string, options?: MediaRuleOptions) {
    let mediaRule = this.#mediaRules.get(id);
    if (mediaRule === undefined) {
      mediaRule = new MediaRule(id, options);
      this.#mediaRules.set(id, mediaRule);
      return mediaRule;
    }

    if (options) {
      mediaRule.options = options;
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
    return this.#plainRules.set(cssText, new PlaintextRule(cssText));
  }
  addMixinRule(name: string) {
    let rule = this.#mixinRules.get(name);
    if (rule === undefined) {
      rule = new MixinRule();
      this.#mixinRules.set(name, rule);
    }
    return rule;
  }
  addNestingRule(selector: string, descendantSuffix: string = "") {
    const key = selector + descendantSuffix;
    let rule = this.nestingRules.get(key);
    if (rule === undefined) {
      rule = new NestingRule(this.#mixinRules, selector, descendantSuffix);
      this.nestingRules.set(key, rule);
    }
    return rule;
  }
  addFontFaceRule(options: FontFaceOptions) {
    return this.#fontFaceRules.push(new FontFaceRule(options));
  }
  generateWith({
    nestingRules,
    transformValue,
  }: {
    nestingRules: NestingRule[];
    transformValue?: TransformValue;
  }) {
    const css: Array<string> = [];

    css.push(...this.#fontFaceRules.map((rule) => rule.cssText));
    for (const plaintextRule of this.#plainRules.values()) {
      css.push(plaintextRule.cssText);
    }

    const sortedMediaRules = Array.from(this.#mediaRules.values()).sort(
      (ruleA, ruleB) => compareMedia(ruleA.options, ruleB.options)
    );
    for (const mediaRule of sortedMediaRules) {
      const cssText = mediaRule.generateRule({
        nestingRules,
        transformValue,
      });
      if (cssText !== "") {
        css.push(cssText);
      }
    }
    // reset invalidation from mixins after rendering
    for (const rule of this.#mixinRules.values()) {
      rule.clearBreakpoints();
    }
    this.#cssText = css.join("\n");
    return this.#cssText;
  }
  get cssText() {
    return this.generateWith({
      nestingRules: Array.from(this.nestingRules.values()),
      transformValue: this.#transformValue,
    });
  }
  clear() {
    this.#mediaRules.clear();
    this.#mixinRules.clear();
    this.nestingRules.clear();
    this.#plainRules.clear();
    this.#fontFaceRules = [];
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
