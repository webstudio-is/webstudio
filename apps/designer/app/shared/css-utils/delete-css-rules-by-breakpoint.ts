import type { Instance } from "@webstudio-is/react-sdk";
import type { Breakpoint } from "@webstudio-is/css-data";

export const deleteCssRulesByBreakpoint = (
  instance: Instance,
  breakpointId: Breakpoint["id"]
) => {
  const cssRules = [...instance.cssRules];
  cssRules.forEach((cssRule, index) => {
    if (cssRule.breakpoint === breakpointId) {
      instance.cssRules.splice(index, 1);
    }
  });

  for (const child of instance.children) {
    if (typeof child === "string") {
      continue;
    }
    deleteCssRulesByBreakpoint(child, breakpointId);
  }
};
