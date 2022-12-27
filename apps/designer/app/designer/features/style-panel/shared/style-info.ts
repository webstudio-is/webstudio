import type {
  Breakpoint,
  CssRule,
  Style,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-data";
import { properties } from "@webstudio-is/css-data";
import { utils } from "@webstudio-is/project";
import { Instance } from "@webstudio-is/react-sdk";
import { useMemo } from "react";
import {
  useSelectedBreakpoint,
  useSelectedInstanceData,
} from "~/designer/shared/nano-states";
import { useBreakpoints, useRootInstance } from "~/shared/nano-states";

type Cascaded = {
  breakpointId: string;
  value: StyleValue;
};

type CascadedInfo = {
  [property in StyleProperty]?: Cascaded;
};

type Inherited = {
  instanceId: string;
  value: StyleValue;
};

type InheritedInfo = {
  [property in StyleProperty]?: Inherited;
};

export type StyleValueInfo = {
  value: StyleValue;
  local?: StyleValue;
  cascaded?: Cascaded;
  inherited?: Inherited;
};

export type StyleInfo = {
  [property in StyleProperty]?: StyleValueInfo;
};

export type StyleSource = "local" | "preset";

export const getStyleSource = (
  ...styleValueInfos: (undefined | StyleValueInfo)[]
): StyleSource => {
  for (const info of styleValueInfos) {
    if (info?.local) {
      return "local";
    }
  }
  return "preset";
};

const styleProperties = Object.keys(properties) as StyleProperty[];
const inheritableProperties = new Set<string>();
for (const [property, value] of Object.entries(properties)) {
  if (value.inherited) {
    inheritableProperties.add(property);
  }
}

/**
 * find all breakpoints which may affect current view
 */
export const getCascadedBreakpointIds = (
  breakpoints: Breakpoint[],
  selectedBreakpointId?: string
) => {
  const sortedBreakpoints = breakpoints
    .slice()
    .sort((a, b) => a.minWidth - b.minWidth);
  const cascadedBreakpointIds: string[] = [];
  for (const breakpoint of sortedBreakpoints) {
    if (breakpoint.id === selectedBreakpointId) {
      break;
    }
    cascadedBreakpointIds.push(breakpoint.id);
  }
  return cascadedBreakpointIds;
};

/**
 * extract all styles from breakpoints
 * affecting current view
 */
export const getCascadedInfo = (
  cssRules: CssRule[],
  cascadedBreakpointIds: string[]
) => {
  const styles = new Map<string, Style>();
  for (const rule of cssRules) {
    if (rule.breakpoint !== undefined) {
      styles.set(rule.breakpoint, rule.style);
    }
  }
  const cascadedStyle: CascadedInfo = {};
  for (const breakpointId of cascadedBreakpointIds) {
    const style = styles.get(breakpointId);
    if (style !== undefined) {
      for (const [property, value] of Object.entries(style)) {
        cascadedStyle[property as StyleProperty] = {
          breakpointId,
          value,
        };
      }
    }
  }
  return cascadedStyle;
};

/**
 * extract all inheritable styles from ancestor instances
 * including active breakpoints
 */
export const getInheritedInfo = (
  rootInstance: Instance,
  instanceId: string,
  cascadedAndSelectedBreakpoints: string[]
) => {
  const inheritedStyle: InheritedInfo = {};
  const parents = utils.tree.getInstancePath(rootInstance, instanceId);
  for (const parentInstance of parents) {
    // skip current element
    if (parentInstance.id === instanceId) {
      continue;
    }
    const cascadedStyle = getCascadedInfo(
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

/**
 * combine all local, cascaded, inherited and browser styles
 */
export const useStyleInfo = ({
  localStyle,
  browserStyle,
}: {
  localStyle: Style;
  browserStyle?: Style;
}) => {
  const [breakpoints] = useBreakpoints();
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const selectedBreakpointId = selectedBreakpoint?.id;
  const [selectedInstanceData] = useSelectedInstanceData();
  const selectedInstanceId = selectedInstanceData?.id;
  const selectedInstanceCssRules = selectedInstanceData?.cssRules;
  const [rootInstance] = useRootInstance();

  const cascadedBreakpointIds = useMemo(
    () => getCascadedBreakpointIds(breakpoints, selectedBreakpointId),
    [breakpoints, selectedBreakpointId]
  );

  const inheritedInfo = useMemo(() => {
    if (
      rootInstance === undefined ||
      selectedBreakpointId === undefined ||
      selectedInstanceId === undefined
    ) {
      return {};
    }
    return getInheritedInfo(rootInstance, selectedInstanceId, [
      ...cascadedBreakpointIds,
      selectedBreakpointId,
    ]);
  }, [
    rootInstance,
    cascadedBreakpointIds,
    selectedBreakpointId,
    selectedInstanceId,
  ]);

  const cascadedInfo = useMemo(() => {
    if (selectedInstanceCssRules === undefined) {
      return {};
    }
    return getCascadedInfo(selectedInstanceCssRules, cascadedBreakpointIds);
  }, [selectedInstanceCssRules, cascadedBreakpointIds]);

  const styleInfoData = useMemo(() => {
    const styleInfoData: StyleInfo = {};
    for (const property of styleProperties) {
      // temporary solution until we start computing all styles from data
      const computed = browserStyle?.[property];
      const inherited = inheritedInfo[property];
      const cascaded = cascadedInfo[property];
      const local = localStyle[property];
      const value = local ?? cascaded?.value ?? inherited?.value ?? computed;
      if (value) {
        styleInfoData[property] = {
          value,
          local,
          cascaded,
          inherited,
        };
      }
    }
    return styleInfoData;
  }, [browserStyle, inheritedInfo, cascadedInfo, localStyle]);

  return styleInfoData;
};
