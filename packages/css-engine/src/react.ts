import {
  CssRule,
  toVarNamespace,
  validStaticValueTypes,
  type Breakpoint,
  type Style,
  type StyleProperty,
  type ValidStaticStyleValue,
} from "@webstudio-is/react-sdk";
import { useEffect, useLayoutEffect, useRef } from "react";
import { createCssEngine } from "./core";
import type { StyleRule } from "./core/rules";

const cssEngine = createCssEngine();

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// Wrapps a normal StyleValue into a VarStyleValue that uses the previous style value as a fallback and allows
// to quickly pass the values over CSS variable witout rerendering the components tree.
// Results in values like this: `var(--namespace, staticValue)`
const toVarStyleWithFallback = (instanceId: string, style: Style): Style => {
  const dynamicStyle: Style = {};
  let property: StyleProperty;
  for (property in style) {
    const value = style[property];
    if (value === undefined) {
      continue;
    }
    if (value.type === "var") {
      dynamicStyle[property] = value;
      continue;
    }
    if (
      validStaticValueTypes.includes(
        value.type as typeof validStaticValueTypes[number]
      )
    ) {
      dynamicStyle[property] = {
        type: "var",
        value: toVarNamespace(instanceId, property),
        fallbacks: [value as ValidStaticStyleValue],
      };
    }
  }
  return dynamicStyle;
};

export const addMediaRules = (breakpoints: Array<Breakpoint>) => {
  for (const breakpoint of breakpoints) {
    cssEngine.addMediaRule(breakpoint);
  }
};

export const useCssRules = ({
  id,
  cssRules,
}: {
  id: string;
  cssRules: Array<CssRule>;
}) => {
  const ruleMap = useRef<Map<string, StyleRule>>(new Map());

  useIsomorphicLayoutEffect(() => {
    for (const cssRule of cssRules) {
      const key = id + cssRule.breakpoint;

      let rule = ruleMap.current.get(key);
      if (rule === undefined) {
        const selectorText = `[data-ws-id="${id}"]`;
        rule = cssEngine.addStyleRule(selectorText, {
          ...cssRule,
          style: toVarStyleWithFallback(id, cssRule.style),
        });
        ruleMap.current.set(key, rule);
        continue;
      }
      const dynamicStyle = toVarStyleWithFallback(id, cssRule.style);
      let property: StyleProperty;
      for (property in dynamicStyle) {
        rule.styleMap.set(property, dynamicStyle[property]);
      }
    }
    cssEngine.render();
  }, [id, cssRules]);
};
