import { StyleRule } from "./rules";
import { StyleSheet, type CssRule } from "./style-sheet";

const defaultMediaRuleId = "__default-media-rule__";

export class StyleSheetRegular extends StyleSheet {
  addStyleRule(rule: CssRule, selectorText: string) {
    const mediaRule = this.addMediaRule(rule.breakpoint || defaultMediaRuleId);

    const styleRule = new StyleRule(selectorText, rule.style);
    mediaRule.insertRule(styleRule);
    return styleRule;
  }
}
