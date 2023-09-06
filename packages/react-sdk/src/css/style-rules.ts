import type { Style } from "@webstudio-is/css-engine";
import type {
  Breakpoint,
  StyleDecl,
  Styles,
  StyleSource,
  StyleSourceSelections,
} from "@webstudio-is/sdk";
import type { PresetStyle } from "../components/component-meta";
import { componentAttribute } from "../tree";

type StyleRule = {
  instanceId: string;
  breakpointId: string;
  state: undefined | string;
  style: Style;
};

/**
 * Merge styles from different style sources
 * and group by instance and breakpoint
 */
export const getStyleRules = (
  styles: Styles,
  styleSourceSelections: StyleSourceSelections
) => {
  if (styles === undefined || styleSourceSelections === undefined) {
    return [];
  }
  const stylesByStyleSourceId = new Map<StyleSource["id"], StyleDecl[]>();
  for (const styleDecl of styles.values()) {
    const { styleSourceId } = styleDecl;
    let styleSourceStyles = stylesByStyleSourceId.get(styleSourceId);
    // instance can be undefined when style is from other tree
    if (styleSourceStyles === undefined) {
      styleSourceStyles = [];
      stylesByStyleSourceId.set(styleSourceId, styleSourceStyles);
    }
    styleSourceStyles.push(styleDecl);
  }

  const styleRules: StyleRule[] = [];
  for (const { instanceId, values } of styleSourceSelections.values()) {
    const styleRuleByBreakpointId = new Map<
      `${Breakpoint["id"]}:${string}`,
      StyleRule
    >();

    for (const styleSourceId of values) {
      const styleSourceStyles = stylesByStyleSourceId.get(styleSourceId);
      // instance can be undefined when style is from other tree
      if (styleSourceStyles === undefined) {
        continue;
      }
      for (const {
        breakpointId,
        state,
        property,
        value,
      } of styleSourceStyles) {
        const key = `${breakpointId}:${state ?? ""}` as const;
        let styleRule = styleRuleByBreakpointId.get(key);
        if (styleRule === undefined) {
          styleRule = {
            instanceId,
            breakpointId,
            state,
            style: {},
          };
          styleRuleByBreakpointId.set(key, styleRule);
        }
        styleRule.style[property] = value;
      }
    }
    styleRules.push(...styleRuleByBreakpointId.values());
  }

  return styleRules;
};

export const getPresetStyleRules = (
  component: string,
  presetStyle: PresetStyle
) => {
  // group style declarations by selector to render as separate rules
  const presetStyleRules = new Map<string, Style>();
  for (const [tag, styles] of Object.entries(presetStyle)) {
    for (const styleDecl of styles) {
      const selector = `${tag}:where([${componentAttribute}="${component}"])${
        styleDecl.state ?? ""
      }`;
      let rule = presetStyleRules.get(selector);
      if (rule === undefined) {
        rule = {};
        presetStyleRules.set(selector, rule);
      }
      rule[styleDecl.property] = styleDecl.value;
    }
  }
  return presetStyleRules;
};
