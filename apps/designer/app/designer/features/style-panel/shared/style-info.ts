import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import type {
  Breakpoint,
  Style,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-data";
import { properties } from "@webstudio-is/css-data";
import { utils } from "@webstudio-is/project";
import type { Instance, Styles } from "@webstudio-is/react-sdk";
import {
  selectedInstanceBrowserStyleStore,
  selectedInstanceIdStore,
  useBreakpoints,
  useRootInstance,
  useStyles,
} from "~/shared/nano-states";
import { useSelectedBreakpoint } from "~/designer/shared/nano-states";

type CascadedValueInfo = {
  breakpointId: string;
  value: StyleValue;
};

type CascadedProperties = {
  [property in StyleProperty]?: CascadedValueInfo;
};

type InheritedValueInfo = {
  instanceId: string;
  value: StyleValue;
};

type InheritedProperties = {
  [property in StyleProperty]?: InheritedValueInfo;
};

export type StyleValueInfo = {
  value: StyleValue;
  local?: StyleValue;
  cascaded?: CascadedValueInfo;
  inherited?: InheritedValueInfo;
};

export type StyleInfo = {
  [property in StyleProperty]?: StyleValueInfo;
};

export type StyleSource = "local" | "remote" | "preset" | "default";

export const getStyleSource = (
  ...styleValueInfos: (undefined | StyleValueInfo)[]
): StyleSource => {
  // show source to use if at least one of control properties matches
  // so user could see if something is set or something is inherited
  for (const info of styleValueInfos) {
    if (info?.local) {
      return "local";
    }
  }
  for (const info of styleValueInfos) {
    if (info?.cascaded !== undefined || info?.inherited !== undefined) {
      return "remote";
    }
  }
  return "default";
};

const styleProperties = Object.keys(properties) as StyleProperty[];
const inheritableProperties = new Set<string>();
for (const [property, value] of Object.entries(properties)) {
  if (value.inherited) {
    inheritableProperties.add(property);
  }
}

export const getLocalStyle = (
  styles: Styles,
  breakpointId: string,
  instanceId: string
) => {
  const style: Style = {};
  for (const styleItem of styles) {
    if (
      styleItem.breakpointId === breakpointId &&
      styleItem.instanceId === instanceId
    ) {
      style[styleItem.property] = styleItem.value;
    }
  }
  return style;
};

/**
 * find all breakpoints which may affect current view
 */
export const getCascadedBreakpointIds = (
  breakpoints: Breakpoint[],
  selectedBreakpointId?: string
) => {
  const sortedBreakpoints = utils.breakpoints.sort(breakpoints);
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
  styles: Styles,
  instanceId: string,
  cascadedBreakpointIds: string[]
) => {
  const cascadedStyle: CascadedProperties = {};
  for (const breakpointId of cascadedBreakpointIds) {
    for (const styleItem of styles) {
      if (
        styleItem.breakpointId === breakpointId &&
        styleItem.instanceId === instanceId
      ) {
        cascadedStyle[styleItem.property] = {
          breakpointId,
          value: styleItem.value,
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
  styles: Styles,
  instanceId: string,
  cascadedBreakpointIds: string[],
  selectedBreakpointId: string
) => {
  const inheritedStyle: InheritedProperties = {};
  const ancestors = utils.tree.getInstancePath(rootInstance, instanceId);
  for (const ancestorInstance of ancestors) {
    // skip current element
    if (ancestorInstance.id === instanceId) {
      continue;
    }
    const cascadedAndSelectedBreakpointIds = [
      ...cascadedBreakpointIds,
      selectedBreakpointId,
    ];

    // extract styles from all active breakpoints
    for (const breakpointId of cascadedAndSelectedBreakpointIds) {
      for (const styleItem of styles) {
        if (
          styleItem.breakpointId === breakpointId &&
          styleItem.instanceId === ancestorInstance.id &&
          inheritableProperties.has(styleItem.property)
        ) {
          inheritedStyle[styleItem.property] = {
            instanceId: ancestorInstance.id,
            value: styleItem.value,
          };
        }
      }
    }
  }
  return inheritedStyle;
};

/**
 * combine all local, cascaded, inherited and browser styles
 */
export const useStyleInfo = () => {
  const [breakpoints] = useBreakpoints();
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const selectedBreakpointId = selectedBreakpoint?.id;
  const selectedInstanceId = useStore(selectedInstanceIdStore);
  const browserStyle = useStore(selectedInstanceBrowserStyleStore);
  const [rootInstance] = useRootInstance();
  const [styles] = useStyles();

  const localStyle = useMemo(() => {
    if (
      selectedBreakpointId === undefined ||
      selectedInstanceId === undefined
    ) {
      return {};
    }
    return getLocalStyle(styles, selectedBreakpointId, selectedInstanceId);
  }, [styles, selectedBreakpointId, selectedInstanceId]);

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
    return getInheritedInfo(
      rootInstance,
      styles,
      selectedInstanceId,
      cascadedBreakpointIds,
      selectedBreakpointId
    );
  }, [
    rootInstance,
    styles,
    cascadedBreakpointIds,
    selectedBreakpointId,
    selectedInstanceId,
  ]);

  const cascadedInfo = useMemo(() => {
    if (selectedInstanceId === undefined) {
      return {};
    }
    return getCascadedInfo(styles, selectedInstanceId, cascadedBreakpointIds);
  }, [styles, selectedInstanceId, cascadedBreakpointIds]);

  const styleInfoData = useMemo(() => {
    const styleInfoData: StyleInfo = {};
    for (const property of styleProperties) {
      // temporary solution until we start computing all styles from data
      const computed = browserStyle?.[property];
      const inherited = inheritedInfo[property];
      const cascaded = cascadedInfo[property];
      const local = localStyle?.[property];
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
