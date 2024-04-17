import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import type { htmlTags as HtmlTags } from "html-tags";
import type {
  Style,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-engine";
import { compareMedia } from "@webstudio-is/css-engine";
import { html, properties } from "@webstudio-is/css-data";
import type {
  StyleSourceSelections,
  Breakpoints,
  Instance,
  Instances,
  StyleDecl,
  StyleSource as StyleSourceType,
  Breakpoint,
} from "@webstudio-is/sdk";
import {
  type StyleSourceSelector,
  $instances,
  $selectedInstanceSelector,
  $selectedInstanceIntanceToTag,
  $stylesIndex,
  $selectedOrLastStyleSourceSelector,
  $breakpoints,
  $styleSourceSelections,
  $registeredComponentMetas,
  $selectedInstanceStates,
} from "~/shared/nano-states";
import { $selectedBreakpoint } from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";

type CascadedValueInfo = {
  breakpointId: string;
  value: StyleValue;
};

type CascadedProperties = {
  [property in StyleProperty]?: CascadedValueInfo;
};

type InheritedValueInfo = {
  instanceId: string;
  styleSourceId?: StyleSourceType["id"];
  value: StyleValue;
};

type InheritedProperties = {
  [property in StyleProperty]?: InheritedValueInfo;
};

type SourceValueInfo = {
  styleSourceId: string;
  value: StyleValue;
};

type SourceProperties = {
  [property in StyleProperty]?: SourceValueInfo;
};

/*
 * For some cases we are encouraging to use custom defaults, than
 * `initial` values provided by browsers. This helps in controlling the behaviour
 * of such properties
 *
 * @todo override in generated properties
 */
const CUSTOM_DEFAULT_VALUES: Partial<Record<StyleProperty, StyleValue>> = {
  outlineWidth: { value: 0, type: "unit", unit: "px" },
};

type StatefulValue = { state: string; value: StyleValue };

export type StyleValueInfo = {
  value: StyleValue;
  // either stateful and local exist or stateless and local or just local
  // @todo improve with more clear structure
  stateful?: StatefulValue;
  local?: StyleValue;
  stateless?: StyleValue;
  previousSource?: SourceValueInfo;
  nextSource?: SourceValueInfo;
  cascaded?: CascadedValueInfo;
  inherited?: InheritedValueInfo;
  preset?: StyleValue;
  htmlValue?: StyleValue;
};

export type StyleInfo = {
  [property in Exclude<StyleProperty, "color">]?: StyleValueInfo;
} & {
  /**
   * In order to maintain code efficiency and reduce clutter, we should only expose the currentColor value for the color property.
   * We can consider it an edge case when it is necessary to display the actual currentColor value in the Color Picker.
   */
  color?: StyleValueInfo & {
    /**
     * Only color property can have currentColor
     * Now we take it from the computed style, @todo: calculate when we are going to remove computed.
     **/
    currentColor?: StyleValue | undefined;
  };
};

export type StyleSource =
  | "local"
  | "overwritten"
  | "remote"
  | "preset"
  | "default";

export const getStyleSource = (
  ...styleValueInfos: (undefined | StyleValueInfo)[]
): StyleSource => {
  // show source to use if at least one of control properties matches
  // so user could see if something is set or something is inherited
  for (const info of styleValueInfos) {
    if (info?.nextSource && (info.local || info.stateful)) {
      return "overwritten";
    }
  }
  for (const info of styleValueInfos) {
    if (info?.stateful && info.local) {
      return "overwritten";
    }
  }
  for (const info of styleValueInfos) {
    if (info?.local) {
      return "local";
    }
  }
  for (const info of styleValueInfos) {
    if (info?.stateless || info?.stateful) {
      return "remote";
    }
  }
  for (const info of styleValueInfos) {
    if (info?.previousSource || info?.nextSource || info?.cascaded) {
      return "remote";
    }
  }
  for (const info of styleValueInfos) {
    if (info?.preset) {
      return "preset";
    }
  }
  for (const info of styleValueInfos) {
    if (info?.htmlValue) {
      return "default";
    }
  }
  for (const info of styleValueInfos) {
    if (info?.inherited) {
      return "remote";
    }
  }
  return "default";
};

const propertyNames = Object.keys(properties) as StyleProperty[];

const inheritableProperties = new Set<string>();
for (const [property, value] of Object.entries(properties)) {
  if (value.inherited) {
    inheritableProperties.add(property);
  }
}

const getLocalStyles = (
  stylesByStyleSourceId: Map<StyleSourceType["id"], StyleDecl[]>,
  breakpointId: string,
  styleSourceSelector: StyleSourceSelector,
  activeStates: Set<string>
) => {
  const statelessStyles = new Map<StyleProperty, StyleValue>();
  const localStyles = new Map<StyleProperty, StyleValue>();
  const statefulStyles = new Map<StyleProperty, StatefulValue>();
  const instanceStyles = stylesByStyleSourceId.get(
    styleSourceSelector.styleSourceId
  );
  if (instanceStyles === undefined) {
    return { statelessStyles, localStyles, statefulStyles };
  }
  for (const styleDecl of instanceStyles) {
    if (styleDecl.breakpointId !== breakpointId) {
      continue;
    }
    if (styleDecl.state === undefined) {
      if (styleSourceSelector.state === undefined) {
        localStyles.set(styleDecl.property, styleDecl.value);
      } else {
        statelessStyles.set(styleDecl.property, styleDecl.value);
      }
    }
    if (styleDecl.state && activeStates.has(styleDecl.state)) {
      if (styleDecl.state === styleSourceSelector.state) {
        localStyles.set(styleDecl.property, styleDecl.value);
      } else {
        statefulStyles.set(styleDecl.property, {
          state: styleDecl.state,
          value: styleDecl.value,
        });
      }
    }
  }
  return { statelessStyles, localStyles, statefulStyles };
};

/**
 * find all breakpoints which may affect current view
 */
export const getCascadedBreakpointIds = (
  breakpoints: Breakpoints,
  selectedBreakpointId?: string
) => {
  const sortedBreakpoints = Array.from(breakpoints.values()).sort(compareMedia);
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
  stylesByInstanceId: Map<Instance["id"], StyleDecl[]>,
  instanceId: string,
  cascadedBreakpointIds: string[],
  activeStates: Set<string>
) => {
  const cascadedStyle: CascadedProperties = {};
  const instanceStyles = stylesByInstanceId.get(instanceId);
  if (instanceStyles === undefined) {
    return cascadedStyle;
  }
  for (const breakpointId of cascadedBreakpointIds) {
    for (const styleDecl of instanceStyles) {
      if (
        styleDecl.breakpointId === breakpointId &&
        styleDecl.state === undefined
      ) {
        cascadedStyle[styleDecl.property] = {
          breakpointId,
          value: styleDecl.value,
        };
      }
    }
    for (const styleDecl of instanceStyles) {
      if (
        styleDecl.breakpointId === breakpointId &&
        styleDecl.state &&
        activeStates.has(styleDecl.state)
      ) {
        cascadedStyle[styleDecl.property] = {
          breakpointId,
          value: styleDecl.value,
        };
      }
    }
  }
  return cascadedStyle;
};

export const getInstanceComponent = (
  instances: Instances,
  instanceId: undefined | Instance["id"]
) => {
  if (instanceId === undefined) {
    return;
  }
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return;
  }
  return instance.component;
};

export const getPresetStyleRule = (
  meta: undefined | WsComponentMeta,
  tagName: HtmlTags,
  activeStates: Set<string>
) => {
  const presetStyles = meta?.presetStyle?.[tagName];
  if (presetStyles === undefined) {
    return;
  }
  const presetStyle: Style = {};
  for (const styleDecl of presetStyles) {
    if (styleDecl.state === undefined) {
      presetStyle[styleDecl.property] = styleDecl.value;
    }
  }
  for (const styleDecl of presetStyles) {
    if (styleDecl.state && activeStates.has(styleDecl.state)) {
      presetStyle[styleDecl.property] = styleDecl.value;
    }
  }
  return presetStyle;
};

/**
 * extract all inheritable styles from ancestor instances
 * including active breakpoints
 */
export const getInheritedInfo = (
  instances: Instances,
  metas: Map<string, WsComponentMeta>,
  stylesByInstanceId: Map<Instance["id"], StyleDecl[]>,
  instanceSelector: InstanceSelector,
  selectedInstanceIntanceToTag: Map<Instance["id"], HtmlTags>,
  cascadedBreakpointIds: string[],
  selectedBreakpointId: string,
  activeStates: Set<string>
) => {
  const inheritedStyle: InheritedProperties = {};
  // skip current instance and start with root til parent
  for (const instanceId of instanceSelector.slice(1).reverse()) {
    const ancestorInstance = instances.get(instanceId);
    if (ancestorInstance === undefined) {
      continue;
    }
    const cascadedAndSelectedBreakpointIds = [
      ...cascadedBreakpointIds,
      selectedBreakpointId,
    ];

    const tagName = selectedInstanceIntanceToTag.get(instanceId);
    const component = getInstanceComponent(instances, instanceId);
    const presetStyle =
      tagName !== undefined && component !== undefined
        ? metas.get(component)?.presetStyle?.[tagName]
        : undefined;
    if (presetStyle) {
      for (const styleDecl of presetStyle) {
        if (
          styleDecl.state === undefined &&
          inheritableProperties.has(styleDecl.property)
        ) {
          inheritedStyle[styleDecl.property] = {
            instanceId: ancestorInstance.id,
            value: styleDecl.value,
          };
        }
      }
    }

    const ancestorInstanceStyles = stylesByInstanceId.get(ancestorInstance.id);
    if (ancestorInstanceStyles === undefined) {
      continue;
    }

    // extract styles from all active breakpoints
    for (const breakpointId of cascadedAndSelectedBreakpointIds) {
      for (const styleDecl of ancestorInstanceStyles) {
        if (
          styleDecl.breakpointId === breakpointId &&
          inheritableProperties.has(styleDecl.property) &&
          styleDecl.state === undefined
        ) {
          inheritedStyle[styleDecl.property] = {
            instanceId: ancestorInstance.id,
            styleSourceId: styleDecl.styleSourceId,
            value: styleDecl.value,
          };
        }
      }
      for (const styleDecl of ancestorInstanceStyles) {
        if (
          styleDecl.breakpointId === breakpointId &&
          inheritableProperties.has(styleDecl.property) &&
          styleDecl.state &&
          activeStates.has(styleDecl.state)
        ) {
          inheritedStyle[styleDecl.property] = {
            instanceId: ancestorInstance.id,
            styleSourceId: styleDecl.styleSourceId,
            value: styleDecl.value,
          };
        }
      }
    }
  }
  return inheritedStyle;
};

export const getPreviousSourceInfo = (
  styleSourceSelections: StyleSourceSelections,
  stylesByInstanceId: Map<Instance["id"], StyleDecl[]>,
  selectedInstanceSelector: InstanceSelector,
  selectedStyleSourceSelector: StyleSourceSelector,
  breakpointId: Breakpoint["id"],
  activeStates: Set<string>
) => {
  const previousSourceStyle: SourceProperties = {};
  const [selectedInstanceId] = selectedInstanceSelector;
  const { styleSourceId } = selectedStyleSourceSelector;
  const styleSourceSelection = styleSourceSelections.get(selectedInstanceId);
  const instanceStyles = stylesByInstanceId.get(selectedInstanceId);
  if (styleSourceSelection === undefined || instanceStyles === undefined) {
    return previousSourceStyle;
  }
  const previousSourceIds = styleSourceSelection.values.slice(
    0,
    styleSourceSelection.values.indexOf(styleSourceId)
  );
  // expect instance styles to be ordered
  for (const styleDecl of instanceStyles) {
    if (
      styleDecl.breakpointId === breakpointId &&
      previousSourceIds.includes(styleDecl.styleSourceId) &&
      styleDecl.state === undefined
    ) {
      previousSourceStyle[styleDecl.property] = {
        styleSourceId: styleDecl.styleSourceId,
        value: styleDecl.value,
      };
    }
  }
  for (const styleDecl of instanceStyles) {
    if (
      styleDecl.breakpointId === breakpointId &&
      previousSourceIds.includes(styleDecl.styleSourceId) &&
      styleDecl.state &&
      activeStates.has(styleDecl.state)
    ) {
      previousSourceStyle[styleDecl.property] = {
        styleSourceId: styleDecl.styleSourceId,
        value: styleDecl.value,
      };
    }
  }
  return previousSourceStyle;
};

export const getNextSourceInfo = (
  styleSourceSelections: StyleSourceSelections,
  stylesByInstanceId: Map<Instance["id"], StyleDecl[]>,
  selectedInstanceSelector: InstanceSelector,
  selectedStyleSourceSelector: StyleSourceSelector,
  breakpointId: Breakpoint["id"],
  activeStates: Set<string>
) => {
  const nextSourceStyle: SourceProperties = {};
  const [selectedInstanceId] = selectedInstanceSelector;
  const { styleSourceId } = selectedStyleSourceSelector;
  const styleSourceSelection = styleSourceSelections.get(selectedInstanceId);
  const instanceStyles = stylesByInstanceId.get(selectedInstanceId);
  if (styleSourceSelection === undefined || instanceStyles === undefined) {
    return nextSourceStyle;
  }
  const nextSourceIds = styleSourceSelection.values.slice(
    // exclude current style source
    styleSourceSelection.values.indexOf(styleSourceId) + 1
  );
  // expect instance styles to be ordered
  for (const styleDecl of instanceStyles) {
    if (
      styleDecl.breakpointId === breakpointId &&
      nextSourceIds.includes(styleDecl.styleSourceId) &&
      styleDecl.state === undefined
    ) {
      nextSourceStyle[styleDecl.property] = {
        styleSourceId: styleDecl.styleSourceId,
        value: styleDecl.value,
      };
    }
  }
  for (const styleDecl of instanceStyles) {
    if (
      styleDecl.breakpointId === breakpointId &&
      nextSourceIds.includes(styleDecl.styleSourceId) &&
      styleDecl.state &&
      activeStates.has(styleDecl.state)
    ) {
      nextSourceStyle[styleDecl.property] = {
        styleSourceId: styleDecl.styleSourceId,
        value: styleDecl.value,
      };
    }
  }
  return nextSourceStyle;
};

/**
 * combine all local, cascaded, inherited and browser styles
 */
const useStyleInfoByInstanceAndStyleSource = (
  instanceSelector: InstanceSelector | undefined,
  styleSourceSelector: StyleSourceSelector | undefined
) => {
  const breakpoints = useStore($breakpoints);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const selectedBreakpointId = selectedBreakpoint?.id;

  // We do not move $selectedInstanceIntanceToTag out of here as it contains ascendants of selected element
  // And we do not gonna iterate over children
  const instanceToTag = useStore($selectedInstanceIntanceToTag);

  const instances = useStore($instances);
  const metas = useStore($registeredComponentMetas);
  const { stylesByInstanceId, stylesByStyleSourceId } = useStore($stylesIndex);
  const styleSourceSelections = useStore($styleSourceSelections);
  const selectedInstanceStates = useStore($selectedInstanceStates);
  const activeStates = useMemo(() => {
    const activeStates = new Set(selectedInstanceStates);
    if (styleSourceSelector?.state !== undefined) {
      activeStates.add(styleSourceSelector.state);
    }
    return activeStates;
  }, [styleSourceSelector, selectedInstanceStates]);

  const selectedStyle = useMemo((): {
    statelessStyles: Map<StyleProperty, StyleValue>;
    localStyles: Map<StyleProperty, StyleValue>;
    statefulStyles: Map<StyleProperty, StatefulValue>;
  } => {
    if (
      selectedBreakpointId === undefined ||
      styleSourceSelector === undefined
    ) {
      return {
        statelessStyles: new Map(),
        localStyles: new Map(),
        statefulStyles: new Map(),
      };
    }
    return getLocalStyles(
      stylesByStyleSourceId,
      selectedBreakpointId,
      styleSourceSelector,
      activeStates
    );
  }, [
    stylesByStyleSourceId,
    selectedBreakpointId,
    activeStates,
    styleSourceSelector,
  ]);

  const cascadedBreakpointIds = useMemo(
    () => getCascadedBreakpointIds(breakpoints, selectedBreakpointId),
    [breakpoints, selectedBreakpointId]
  );

  const inheritedInfo = useMemo(() => {
    if (
      selectedBreakpointId === undefined ||
      instanceSelector === undefined ||
      instanceToTag === undefined
    ) {
      return {};
    }
    return getInheritedInfo(
      instances,
      metas,
      stylesByInstanceId,
      instanceSelector,
      instanceToTag,
      cascadedBreakpointIds,
      selectedBreakpointId,
      activeStates
    );
  }, [
    instances,
    metas,
    stylesByInstanceId,
    cascadedBreakpointIds,
    selectedBreakpointId,
    instanceSelector,
    instanceToTag,
    activeStates,
  ]);

  const cascadedInfo = useMemo(() => {
    if (instanceSelector === undefined) {
      return {};
    }
    return getCascadedInfo(
      stylesByInstanceId,
      instanceSelector[0],
      cascadedBreakpointIds,
      activeStates
    );
  }, [
    stylesByInstanceId,
    instanceSelector,
    cascadedBreakpointIds,
    activeStates,
  ]);

  const previousSourceInfo = useMemo(() => {
    if (
      instanceSelector === undefined ||
      styleSourceSelector === undefined ||
      selectedBreakpointId === undefined
    ) {
      return {};
    }
    return getPreviousSourceInfo(
      styleSourceSelections,
      stylesByInstanceId,
      instanceSelector,
      styleSourceSelector,
      selectedBreakpointId,
      activeStates
    );
  }, [
    styleSourceSelections,
    stylesByInstanceId,
    instanceSelector,
    styleSourceSelector,
    selectedBreakpointId,
    activeStates,
  ]);

  const nextSourceInfo = useMemo(() => {
    if (
      instanceSelector === undefined ||
      styleSourceSelector === undefined ||
      selectedBreakpointId === undefined
    ) {
      return {};
    }
    return getNextSourceInfo(
      styleSourceSelections,
      stylesByInstanceId,
      instanceSelector,
      styleSourceSelector,
      selectedBreakpointId,
      activeStates
    );
  }, [
    styleSourceSelections,
    stylesByInstanceId,
    instanceSelector,
    styleSourceSelector,
    selectedBreakpointId,
    activeStates,
  ]);

  const presetStyle = useMemo(() => {
    const selectedInstanceId = instanceSelector?.[0];
    if (selectedInstanceId === undefined || styleSourceSelector === undefined) {
      return;
    }
    const tagName = instanceToTag?.get(selectedInstanceId);
    const component = getInstanceComponent(instances, selectedInstanceId);
    if (tagName === undefined || component === undefined) {
      return;
    }
    return getPresetStyleRule(metas.get(component), tagName, activeStates);
  }, [
    instances,
    metas,
    instanceSelector,
    instanceToTag,
    activeStates,
    styleSourceSelector,
  ]);

  const htmlStyle = useMemo(() => {
    const instanceId = instanceSelector?.[0];
    if (instanceId === undefined) {
      return;
    }
    const tagName = instanceToTag?.get(instanceId);
    if (tagName === undefined) {
      return;
    }
    const styles = html[tagName];
    if (styles === undefined) {
      return;
    }
    const style: Style = {};
    for (const styleDecl of styles) {
      style[styleDecl.property] = styleDecl.value;
    }
    return style;
  }, [instanceSelector, instanceToTag]);

  const allPropertyNames = useMemo(() => {
    const [selectedInstanceId] = instanceSelector ?? [];
    const all: Set<StyleProperty> = new Set(propertyNames);
    const styles = stylesByInstanceId.get(selectedInstanceId);
    if (styles) {
      for (const styleDecl of styles) {
        if (all.has(styleDecl.property) === false) {
          all.add(styleDecl.property);
        }
      }
    }
    return Array.from(all);
  }, [instanceSelector, stylesByInstanceId]);

  const styleInfoData = useMemo(() => {
    const styleInfoData: StyleInfo = {};
    for (const property of allPropertyNames) {
      // temporary solution until we start computing all styles from data
      const htmlValue = htmlStyle?.[property];
      const defaultValue = CUSTOM_DEFAULT_VALUES[property] ??
        properties[property as keyof typeof properties]?.initial ?? {
          type: "guaranteedInvalid",
        };
      const preset = presetStyle?.[property];
      const inherited = inheritedInfo[property];
      const cascaded = cascadedInfo[property];
      const previousSource = previousSourceInfo[property];
      const nextSource = nextSourceInfo[property];
      const { statelessStyles, localStyles, statefulStyles } = selectedStyle;
      const stateful = statefulStyles.get(property);
      const local = localStyles.get(property);
      const stateless = statelessStyles.get(property);
      const ownValue =
        local ??
        stateful?.value ??
        stateless ??
        nextSource?.value ??
        previousSource?.value ??
        cascaded?.value ??
        preset ??
        htmlValue;
      const inheritedValue = inherited?.value;
      const value = ownValue ?? inheritedValue ?? defaultValue;

      if (value) {
        if (property === "color") {
          const ownColor =
            ownValue?.type === "keyword" &&
            (ownValue.value === "inherit" || ownValue.value === "currentColor")
              ? undefined
              : ownValue;
          const inheritedColor =
            inheritedValue?.type === "keyword" &&
            (inheritedValue.value === "inherit" ||
              inheritedValue.value === "currentColor")
              ? undefined
              : inheritedValue;
          const currentColor = ownColor ?? inheritedColor ?? defaultValue;
          styleInfoData[property] = {
            value,
            stateful,
            local,
            stateless,
            nextSource,
            previousSource,
            cascaded,
            inherited,
            preset,
            htmlValue,
            currentColor,
          };
        } else {
          styleInfoData[property] = {
            value,
            stateful,
            local,
            stateless,
            nextSource,
            previousSource,
            cascaded,
            inherited,
            preset,
            htmlValue,
          };
        }
      }
    }
    return styleInfoData;
  }, [
    htmlStyle,
    presetStyle,
    inheritedInfo,
    cascadedInfo,
    nextSourceInfo,
    previousSourceInfo,
    selectedStyle,
    allPropertyNames,
  ]);

  return styleInfoData;
};

export const useStyleInfo = () => {
  const instanceSelector = useStore($selectedInstanceSelector);

  const styleSourceSelector = useStore($selectedOrLastStyleSourceSelector);

  return useStyleInfoByInstanceAndStyleSource(
    instanceSelector,
    styleSourceSelector
  );
};

const isAncestorOrSelfOfSelectedInstance = (
  instanceSelector: InstanceSelector
) => {
  const selectedInstanceSelector = $selectedInstanceSelector.get();

  if (selectedInstanceSelector === undefined) {
    return false;
  }

  if (instanceSelector.length > selectedInstanceSelector.length) {
    return false;
  }

  if (instanceSelector.length === 0) {
    return false;
  }

  const deltaLength = selectedInstanceSelector.length - instanceSelector.length;
  return instanceSelector.every(
    (instance, index) =>
      instance === selectedInstanceSelector[index + deltaLength]
  );
};

export const useStyleInfoByInstanceId = (
  instanceSelector: InstanceSelector | undefined
) => {
  const styleSourceSelections = useStore($styleSourceSelections);

  if (
    instanceSelector !== undefined &&
    isAncestorOrSelfOfSelectedInstance(instanceSelector) === false
  ) {
    console.error(
      `The style works correctly only on ancestors of the selected element,
       as our style data only includes information about these ancestors.
       See $selectedInstanceIntanceToTag for details.`
    );
  }

  const [selectedInstanceId] = instanceSelector ?? [];

  const styleSourceIds =
    selectedInstanceId !== undefined
      ? styleSourceSelections.get(selectedInstanceId)?.values ?? []
      : [];

  const lastStyleSourceId = styleSourceIds.at(-1);

  const lastStyleSource: StyleSourceSelector | undefined =
    lastStyleSourceId !== undefined
      ? {
          styleSourceId: lastStyleSourceId,
        }
      : undefined;

  return useStyleInfoByInstanceAndStyleSource(
    instanceSelector,
    lastStyleSource
  );
};

export const getPriorityStyleSource = (
  styleSources: StyleSource[]
): StyleSource => {
  const customOrder: StyleSource[] = [
    "overwritten",
    "local",
    "remote",
    "preset",
    "default",
  ];

  for (const style of customOrder) {
    if (styleSources.includes(style)) {
      return style;
    }
  }

  return "default";
};

/**
 * Has any value defined on that particular instance,
 * excluding preset and inherited values.
 */
export const hasInstanceValue = (
  currentStyle: StyleInfo,
  property: StyleProperty
) => {
  const info = currentStyle[property];
  return Boolean(
    info?.cascaded ??
      info?.local ??
      info?.stateful ??
      info?.stateless ??
      info?.nextSource?.value ??
      info?.previousSource?.value
  );
};
