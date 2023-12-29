import { StyleRule } from "./rules";
import type { TransformValue } from "./to-value";
import { StyleSheet, type CssRule } from "./style-sheet";

const defaultMediaRuleId = "__default-media-rule__";

export class StyleSheetRegular extends StyleSheet {
  addStyleRule(
    rule: CssRule,
    selectorText: string,
    transformValue?: TransformValue
  ) {
    const mediaRule = this.addMediaRule(rule.breakpoint || defaultMediaRuleId);
    if (mediaRule === undefined) {
      // Should be impossible to reach.
      throw new Error("No media rule found");
    }
    this.markAsDirty();
    const styleRule = new StyleRule(
      selectorText,
      rule.style,
      transformValue,
      this.#onChangeRule
    );
    mediaRule.insertRule(styleRule);
    return styleRule;
  }

  #onChangeRule = () => {
    this.markAsDirty();
  };
}
