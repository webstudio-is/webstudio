import type { Style, StyleProperty } from "../schema";
import { StylePropertyMap, StyleRule } from "./rules";
import type { TransformValue } from "./to-value";
import hash from "@emotion/hash";
import { StyleSheet, type CssRule } from "./style-sheet";

const defaultMediaRuleId = "__default-media-rule__";

export class StyleSheetAtomic extends StyleSheet {
  addStyleRule(
    { style, breakpoint }: CssRule,
    selectorSuffix: string = "",
    transformValue?: TransformValue
  ) {
    const mediaRule = this.addMediaRule(breakpoint || defaultMediaRuleId);
    const styleRules = [];
    const classes = [];

    let property: StyleProperty;
    for (property in style) {
      const stylePropertyMap = new StylePropertyMap(
        { [property]: style[property] } as Style,
        transformValue
      );
      // "c" makes sure hash always starts with a letter.
      const className = `c${hash(
        stylePropertyMap + selectorSuffix + breakpoint
      )}`;
      classes.push(className);
      const newStyleRule = new StyleRule(
        `.${className}${selectorSuffix}`,
        stylePropertyMap,
        transformValue,
        this.#onChangeRule
      );
      styleRules.push(newStyleRule);

      if (mediaRule.rules.has(newStyleRule.selectorText) === false) {
        mediaRule.insertRule(newStyleRule);
        this.markAsDirty();
      }
    }

    return { styleRules, classes };
  }

  #onChangeRule = () => {
    this.markAsDirty();
  };
}
