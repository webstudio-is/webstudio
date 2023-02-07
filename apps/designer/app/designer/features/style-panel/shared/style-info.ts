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
import type {
  Instance,
  Styles,
  StyleSource as StyleSourceType,
} from "@webstudio-is/project-build";
import {
  selectedInstanceBrowserStyleStore,
  selectedInstanceIdStore,
  selectedStyleSourceStore,
  stylesIndexStore,
  useBreakpoints,
  useRootInstance,
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

const getSelectedStyle = (
  stylesByStyleSourceId: Map<StyleSourceType["id"], Styles>,
  breakpointId: string,
  styleSourceId: string
) => {
  const style: Style = {};
  const instanceStyles = stylesByStyleSourceId.get(styleSourceId);
  if (instanceStyles === undefined) {
    return style;
  }
  for (const styleItem of instanceStyles) {
    if (styleItem.breakpointId === breakpointId) {
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
  stylesByInstanceId: Map<Instance["id"], Styles>,
  instanceId: string,
  cascadedBreakpointIds: string[]
) => {
  const cascadedStyle: CascadedProperties = {};
  const instanceStyles = stylesByInstanceId.get(instanceId);
  if (instanceStyles === undefined) {
    return cascadedStyle;
  }
  for (const breakpointId of cascadedBreakpointIds) {
    for (const styleItem of instanceStyles) {
      if (styleItem.breakpointId === breakpointId) {
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
  stylesByInstanceId: Map<Instance["id"], Styles>,
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

    const ancestorInstanceStyles = stylesByInstanceId.get(ancestorInstance.id);
    if (ancestorInstanceStyles === undefined) {
      continue;
    }

    // extract styles from all active breakpoints
    for (const breakpointId of cascadedAndSelectedBreakpointIds) {
      for (const styleItem of ancestorInstanceStyles) {
        if (
          styleItem.breakpointId === breakpointId &&
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
  const selectedStyleSource = useStore(selectedStyleSourceStore);
  const selectedStyleSourceId = selectedStyleSource?.id;
  const browserStyle = useStore(selectedInstanceBrowserStyleStore);
  const [rootInstance] = useRootInstance();
  const { stylesByInstanceId, stylesByStyleSourceId } =
    useStore(stylesIndexStore);

  const selectedStyle = useMemo(() => {
    if (
      selectedBreakpointId === undefined ||
      selectedStyleSourceId === undefined
    ) {
      return {};
    }
    return getSelectedStyle(
      stylesByStyleSourceId,
      selectedBreakpointId,
      selectedStyleSourceId
    );
  }, [stylesByStyleSourceId, selectedBreakpointId, selectedStyleSourceId]);

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
      stylesByInstanceId,
      selectedInstanceId,
      cascadedBreakpointIds,
      selectedBreakpointId
    );
  }, [
    rootInstance,
    stylesByInstanceId,
    cascadedBreakpointIds,
    selectedBreakpointId,
    selectedInstanceId,
  ]);

  const cascadedInfo = useMemo(() => {
    if (selectedInstanceId === undefined) {
      return {};
    }
    return getCascadedInfo(
      stylesByInstanceId,
      selectedInstanceId,
      cascadedBreakpointIds
    );
  }, [stylesByInstanceId, selectedInstanceId, cascadedBreakpointIds]);

  const styleInfoData = useMemo(() => {
    const styleInfoData: StyleInfo = {};
    for (const property of styleProperties) {
      // temporary solution until we start computing all styles from data
      const computed = browserStyle?.[property];
      const inherited = inheritedInfo[property];
      const cascaded = cascadedInfo[property];
      const local = selectedStyle?.[property];
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
  }, [browserStyle, inheritedInfo, cascadedInfo, selectedStyle]);

  return styleInfoData;
};
