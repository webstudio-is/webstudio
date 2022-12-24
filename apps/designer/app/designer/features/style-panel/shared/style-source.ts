import type {
  Breakpoint,
  CssRule,
  Style,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-data";
import { properties } from "@webstudio-is/css-data";
import type { Instance } from "@webstudio-is/react-sdk";

export type CascadedStyle = {
  [property in StyleProperty]?: {
    breakpointId: string;
    value: StyleValue;
  };
};

export type InheritedStyle = {
  [property in StyleProperty]?: {
    instanceId: string;
    value: StyleValue;
  };
};

export const getSetStyle = (
  cssRules: CssRule[],
  selectedBreakpointId: string
): Style => {
  for (const rule of cssRules) {
    if (rule.breakpoint === selectedBreakpointId) {
      return rule.style;
    }
  }
  return {};
};

export const getCascadedBreakpoints = (
  breakpoints: Breakpoint[],
  selectedBreakpointId: string
) => {
  //
  const sortedBreakpoints = breakpoints
    .slice()
    .sort((a, b) => a.minWidth - b.minWidth);
  const cascadedBreakpoints: Breakpoint[] = [];
  for (const breakpoint of sortedBreakpoints) {
    if (breakpoint.id === selectedBreakpointId) {
      break;
    }
    cascadedBreakpoints.push(breakpoint);
  }
  return cascadedBreakpoints;
};

export const getCascadedStyle = (
  cssRules: CssRule[],
  cascadedBreakpoints: Breakpoint[]
) => {
  const styles = new Map<string, Style>();
  for (const rule of cssRules) {
    if (rule.breakpoint !== undefined) {
      styles.set(rule.breakpoint, rule.style);
    }
  }
  const cascadedStyle: CascadedStyle = {};
  for (const breakpoint of cascadedBreakpoints) {
    const style = styles.get(breakpoint.id);
    if (style !== undefined) {
      for (const [property, value] of Object.entries(style)) {
        cascadedStyle[property as StyleProperty] = {
          breakpointId: breakpoint.id,
          value,
        };
      }
    }
  }
  return cascadedStyle;
};

const findParents = (parentInstance: Instance, instanceId: Instance["id"]) => {
  const parents: Array<Instance> = [];
  for (const child of parentInstance.children) {
    if (child.type === "instance") {
      if (child.id === instanceId) {
        // I am your father
        parents.push(parentInstance);
        break;
      }
      const foundParents = findParents(child, instanceId);
      // add parent if descendants matched
      if (foundParents.length !== 0) {
        parents.push(parentInstance, ...foundParents);
      }
    }
  }
  return parents;
};

const inheritableProperties = new Set<string>();
for (const [property, value] of Object.entries(properties)) {
  if (value.inherited) {
    inheritableProperties.add(property);
  }
}

export const getInheritedStyle = (
  rootInstance: Instance,
  instanceId: string,
  cascadedAndSelectedBreakpoints: Breakpoint[]
) => {
  const inheritedStyle: InheritedStyle = {};
  const parents = findParents(rootInstance, instanceId).reverse();
  for (const parentInstance of parents) {
    const cascadedStyle = getCascadedStyle(
      parentInstance.cssRules,
      cascadedAndSelectedBreakpoints
    );
    for (const [property, cascaded] of Object.entries(cascadedStyle)) {
      if (cascaded !== undefined && inheritableProperties.has(property)) {
        inheritedStyle[property as StyleProperty] = {
          instanceId: parentInstance.id,
          value: cascaded.value,
        };
      }
    }
  }
  return inheritedStyle;
};
