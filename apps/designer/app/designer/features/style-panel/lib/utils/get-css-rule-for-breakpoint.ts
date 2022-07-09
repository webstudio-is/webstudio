import { type CssRule, type Breakpoint } from "@webstudio-is/sdk";

/**
 * Find a instance css rule that is set on the provided breakpoint.
 */
export const getCssRuleForBreakpoint = (
  cssRules: Array<CssRule> = [],
  breakpoint?: Breakpoint
) => {
  if (breakpoint === undefined) return;
  return cssRules.find((cssRule) => cssRule.breakpoint === breakpoint.id);
};
