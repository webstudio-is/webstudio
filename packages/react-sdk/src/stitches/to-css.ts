import type { CSS } from "./css";
import type { StyleProperty, StyleValue, CssRule, Breakpoint } from "../css";
import { DEFAULT_FONT_FALLBACK, SYSTEM_FONTS } from "@webstudio-is/fonts";

export const toValue = (value: StyleValue): string => {
  if (value.type === "unit") {
    return value.value + (value.unit === "number" ? "" : value.unit);
  }
  if (value.type === "fontFamily") {
    const family = value.value[0];
    if (family in SYSTEM_FONTS) {
      return [...value.value, ...SYSTEM_FONTS[family]].join(", ");
    }
    return [...value.value, DEFAULT_FONT_FALLBACK].join(", ");
  }
  return value.value;
};

/**
 * Convert instance cssRules to a stitches CSS object.
 */
export const toCss = (
  cssRules: Array<CssRule>,
  breakpoints: Array<Breakpoint>
): CSS => {
  const css: CSS = {};

  const breakpointsMap: Record<Breakpoint["id"], number> = {};
  for (const breakpoint of breakpoints) {
    breakpointsMap[breakpoint.id] = breakpoint.minWidth;
  }

  const sortedCssRules = [...cssRules].sort((ruleA, ruleB) => {
    // If a rule references a breakpoint that was not found in breakpoints,
    // we must have removed the breakpoint and now we fall back to 0.
    const maxWidthA = breakpointsMap[ruleA.breakpoint] ?? 0;
    const maxWidthB = breakpointsMap[ruleB.breakpoint] ?? 0;
    return maxWidthA - maxWidthB;
  });

  for (const cssRule of sortedCssRules) {
    const style: CSS = {};
    for (const property in cssRule.style) {
      const value = cssRule.style[property as StyleProperty];
      if (value === undefined) continue;
      style[property] = toValue(value);
    }

    if (cssRule.breakpoint in breakpointsMap) {
      css["@" + cssRule.breakpoint] = style;
      continue;
    }

    Object.assign(css, style);
  }
  return css;
};
