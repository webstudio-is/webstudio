import type { Style, StyleProperty } from "../schema";
import { StyleRule } from "./rules";
import type { TransformValue } from "./to-value";
import hash from "@emotion/hash";
import { StyleSheet, type CssRule } from "./style-sheet";

const defaultMediaRuleId = "__default-media-rule__";

export class StyleSheetAtomic extends StyleSheet {
  addStyleRule(
    rule: CssRule,
    selectorSuffix: string = "",
    transformValue?: TransformValue
  ) {
    const mediaRule = this.addMediaRule(rule.breakpoint || defaultMediaRuleId);
    const styleRules = [];
    const classes = [];

    let property: StyleProperty;
    for (property in rule.style) {
      const value = rule.style[property];

      // We need to create the new rule to be able to compare the selectorText aka hash.
      const newStyleRule = new StyleRule(
        "",
        { [property]: value } as Style,
        transformValue,
        this.#onChangeRule
      );
      styleRules.push(newStyleRule);
      // "c" makes sure hash always starts with a letter.
      const className = `c${hash(
        newStyleRule.cssText + selectorSuffix + rule.breakpoint
      )}`;
      classes.push(className);
      newStyleRule.selectorText = `.${className}${selectorSuffix}`;

      const ruleExists = mediaRule.rules.some((styleRule) => {
        return (
          "selectorText" in styleRule &&
          // This property-value combination has already been added.
          newStyleRule.selectorText === styleRule.selectorText
        );
      });

      if (ruleExists === false) {
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
