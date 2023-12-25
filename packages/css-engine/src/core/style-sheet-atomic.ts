import type { Style, StyleProperty } from "../schema";
import { StyleRule } from "./rules";
import type { TransformValue } from "./to-value";
import hash from "@emotion/hash";
import { StyleSheetBase, type CssRule } from "./style-sheet-base";

const defaultMediaRuleId = "__default-media-rule__";

export class StyleSheetAtomic extends StyleSheetBase {
  addStyleRule(rule: CssRule, transformValue?: TransformValue) {
    const mediaRule = this.addMediaRule(rule.breakpoint || defaultMediaRuleId);
    if (mediaRule === undefined) {
      // Should be impossible to reach since we have a default media rule.
      throw new Error("No media rule found");
    }
    let styleRules = [];
    let property: StyleProperty;
    for (property in rule.style) {
      const value = rule.style[property];
      let addRule = mediaRule.rules.length === 0;

      // We need to create the new rule to be able to compare the selectorText aka hash.
      const newStyleRule = new StyleRule(
        "",
        { [property]: value } as Style,
        transformValue
      );
      newStyleRule.selectorText = `.${hash(newStyleRule.cssText)}`;

      for (const styleRule of mediaRule.rules) {
        // This property-value combination has already been added.
        if (
          styleRule instanceof StyleRule &&
          newStyleRule.selectorText === styleRule.selectorText
        ) {
          break;
        }
        addRule = true;
        break;
      }
      if (addRule) {
        styleRules.push(newStyleRule);
        newStyleRule.onChange = this.#onChangeRule;
        mediaRule.insertRule(newStyleRule);
        this.markAsDirty();
      }
    }

    return styleRules;
  }

  #onChangeRule = () => {
    this.markAsDirty();
  };
}
