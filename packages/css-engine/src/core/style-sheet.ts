import hash from "@emotion/hash";
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
import { toValue, type TransformValue } from "./to-value";

export type CssRule = {
  style: Style;
  breakpoint?: string;
};

export class StyleSheet {
  #cssText = "";
  #mediaRules: Map<string, MediaRule> = new Map();
  #plainRules: Map<string, PlaintextRule> = new Map();
  #mixinRules: Map<string, MixinRule> = new Map();
  #nestingRules: Map<string, NestingRule> = new Map();
  #fontFaceRules: Array<FontFaceRule> = [];
  #transformValue?: TransformValue;
  #isDirty = false;
  #element: StyleElement;
  constructor(element: StyleElement) {
    this.#element = element;
  }
  setTransformer(transformValue: TransformValue) {
    this.#transformValue = transformValue;
    this.#isDirty = true;
  }
  addMediaRule(id: string, options?: MediaRuleOptions) {
    let mediaRule = this.#mediaRules.get(id);
    if (mediaRule === undefined) {
      mediaRule = new MediaRule(id, options);
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
  addMixinRule(name: string) {
    let rule = this.#mixinRules.get(name);
    if (rule === undefined) {
      rule = new MixinRule();
      this.#mixinRules.set(name, rule);
      this.#isDirty = true;
    }
    return rule;
  }
  addNestingRule(selector: string) {
    let rule = this.#nestingRules.get(selector);
    if (rule === undefined) {
      rule = new NestingRule(selector, this.#mixinRules);
      this.#nestingRules.set(selector, rule);
      this.#isDirty = true;
    }
    return rule;
  }
  addFontFaceRule(options: FontFaceOptions) {
    this.#isDirty = true;
    return this.#fontFaceRules.push(new FontFaceRule(options));
  }
  markAsDirty() {
    this.#isDirty = true;
  }
  #generateWith(nestingRules: NestingRule[]) {
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
      const cssText = mediaRule.generateRule({
        nestingRules,
        transformValue: this.#transformValue,
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
  generateAtomic(options: { getKey: (rule: NestingRule) => string }) {
    const atomicRules = new Map<string, NestingRule>();
    const classesMap = new Map<string, string[]>();
    for (const rule of this.#nestingRules.values()) {
      const groupKey = options.getKey(rule);
      const classList: string[] = [];
      // convert each declaration into separate rule
      for (const declaration of rule.getDeclarations()) {
        const atomicHash = hash(
          declaration.breakpoint +
            declaration.selector +
            declaration.property +
            toValue(declaration.value, this.#transformValue)
        );
        // "c" makes sure hash always starts with a letter.
        const className = `c${atomicHash}`;
        // reuse atomic rules
        let atomicRule = atomicRules.get(atomicHash);
        if (atomicRule === undefined) {
          atomicRule = new NestingRule(`.${className}`, this.#mixinRules);
          atomicRule.setDeclaration(declaration);
          atomicRules.set(atomicHash, atomicRule);
        }
        classList.push(className);
      }
      classesMap.set(groupKey, classList);
    }
    const cssText = this.#generateWith(Array.from(atomicRules.values()));
    return { cssText, classesMap };
  }
  get cssText() {
    return this.#generateWith(Array.from(this.#nestingRules.values()));
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
