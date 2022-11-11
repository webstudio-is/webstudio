import type { CSS } from "./stitches";
import type { StyleProperty, StyleValue, CssRule, Breakpoint } from "../css";
import { DEFAULT_FONT_FALLBACK, SYSTEM_FONTS } from "@webstudio-is/fonts";
import { Instance } from "..";

type Options = {
  withFallback: boolean;
};

const defaultOptions = {
  withFallback: true,
};

export const toValue = (
  value?: StyleValue,
  { withFallback }: Options = defaultOptions
): string => {
  if (value === undefined) return "";
  if (value.type === "unit") {
    return value.value + (value.unit === "number" ? "" : value.unit);
  }
  if (value.type === "fontFamily") {
    if (withFallback === false) {
      return value.value[0];
    }
    const family = value.value[0];
    const fallbacks = SYSTEM_FONTS.get(family);
    if (Array.isArray(fallbacks)) {
      return [...value.value, ...fallbacks].join(", ");
    }
    return [...value.value, DEFAULT_FONT_FALLBACK].join(", ");
  }
  return value.value;
};

export const toVarNamespace = (id: string, property: string) => {
  return `${property}-${id}`;
};

const toVarValue = (
  namespace: string,
  value?: StyleValue,
  options: Options = defaultOptions
): string => {
  const cssValue = toValue(value, options);
  return `var(--${namespace}, ${cssValue})`;
};

/**
 * Convert instance cssRules to a stitches CSS object.
 */
export const toCss = (
  instance: Instance,
  breakpoints: Array<Breakpoint>,
  options: Options = defaultOptions
): CSS => {
  const css: CSS = {};
  const { cssRules, id } = instance;
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
      const namespace = toVarNamespace(instance.id, property);
      style[property] = toVarValue(namespace, value, options);
    }

    if (cssRule.breakpoint in breakpointsMap) {
      css["@" + cssRule.breakpoint] = style;
      continue;
    }

    Object.assign(css, style);
  }
  return css;
};
