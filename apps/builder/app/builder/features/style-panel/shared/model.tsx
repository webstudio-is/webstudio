import { useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { properties } from "@webstudio-is/css-data";
import {
  compareMedia,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import type { Breakpoint, Instance } from "@webstudio-is/sdk";
import {
  $breakpoints,
  $instances,
  $registeredComponentMetas,
  $selectedBreakpoint,
  $selectedInstanceIntanceToTag,
  $selectedInstanceSelector,
  $selectedInstanceStates,
  $selectedOrLastStyleSourceSelector,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import {
  getComputedStyleDecl,
  getPresetStyleDeclKey,
  type StyleObjectModel,
} from "~/shared/style-object-model";

const $presetStyles = computed($registeredComponentMetas, (metas) => {
  const presetStyles = new Map<string, StyleValue>();
  for (const [component, meta] of metas) {
    for (const [tag, styles] of Object.entries(meta.presetStyle ?? {})) {
      for (const styleDecl of styles) {
        const key = getPresetStyleDeclKey({
          component,
          tag,
          state: styleDecl.state,
          property: styleDecl.property,
        });
        presetStyles.set(key, styleDecl.value);
      }
    }
  }
  return presetStyles;
});

const $instanceComponents = computed(
  [$selectedInstanceSelector, $instances],
  (instanceSelector, instances) => {
    const instanceComponents = new Map<Instance["id"], Instance["component"]>();
    if (instanceSelector === undefined) {
      return instanceComponents;
    }
    // store only component for selected instance and ancestors
    // to avoid iterating over all instances in the project
    for (const instanceId of instanceSelector) {
      const instance = instances.get(instanceId);
      if (instance) {
        instanceComponents.set(instance.id, instance.component);
      }
    }
    return instanceComponents;
  }
);

const $matchingBreakpoints = computed(
  [$breakpoints, $selectedBreakpoint],
  (breakpoints, selectedBreakpoint) => {
    const sortedBreakpoints = Array.from(breakpoints.values()).sort(
      compareMedia
    );
    const matchingBreakpoints: Breakpoint["id"][] = [];
    for (const breakpoint of sortedBreakpoints) {
      matchingBreakpoints.push(breakpoint.id);
      if (breakpoint.id === selectedBreakpoint?.id) {
        break;
      }
    }
    return matchingBreakpoints;
  }
);

export const $definedProperties = computed(
  [
    $selectedInstanceSelector,
    $styleSourceSelections,
    $matchingBreakpoints,
    $styles,
  ],
  (
    instanceSelector,
    styleSourceSelections,
    matchingBreakpointsArray,
    styles
  ) => {
    const definedProperties = new Set<StyleProperty>();
    if (instanceSelector === undefined) {
      return definedProperties;
    }
    const inheritedStyleSources = new Set();
    const instanceStyleSources = new Set();
    const matchingBreakpoints = new Set(matchingBreakpointsArray);
    for (const instanceId of instanceSelector) {
      const styleSources = styleSourceSelections.get(instanceId)?.values;
      if (styleSources) {
        for (const styleSourceId of styleSources) {
          if (instanceId === instanceSelector[0]) {
            instanceStyleSources.add(styleSourceId);
          } else {
            inheritedStyleSources.add(styleSourceId);
          }
        }
      }
    }
    for (const styleDecl of styles.values()) {
      if (
        matchingBreakpoints.has(styleDecl.breakpointId) &&
        instanceStyleSources.has(styleDecl.styleSourceId)
      ) {
        definedProperties.add(styleDecl.property);
      }
      if (
        matchingBreakpoints.has(styleDecl.breakpointId) &&
        inheritedStyleSources.has(styleDecl.styleSourceId) &&
        properties[styleDecl.property as keyof typeof properties].inherited
      ) {
        definedProperties.add(styleDecl.property);
      }
    }
    return definedProperties;
  }
);

const $model = computed(
  [
    $styles,
    $styleSourceSelections,
    $presetStyles,
    $selectedInstanceIntanceToTag,
    $instanceComponents,
    $matchingBreakpoints,
    $selectedInstanceStates,
  ],
  (
    styles,
    styleSourceSelections,
    presetStyles,
    instanceTags,
    instanceComponents,
    matchingBreakpoints,
    matchingStates
  ): StyleObjectModel => {
    return {
      styles,
      styleSourceSelections,
      presetStyles,
      instanceTags: instanceTags ?? new Map(),
      instanceComponents,
      matchingBreakpoints,
      matchingStates,
    };
  }
);

export const createComputedStyleDeclStore = (property: StyleProperty) => {
  return computed(
    [$model, $selectedInstanceSelector, $selectedOrLastStyleSourceSelector],
    (model, instanceSelector, styleSourceSelector) => {
      return getComputedStyleDecl({
        model,
        instanceSelector,
        styleSourceId: styleSourceSelector?.styleSourceId,
        state: styleSourceSelector?.state,
        property,
      });
    }
  );
};

export const useStyleObjectModel = () => {
  return useStore($model);
};

export const useComputedStyleDecl = (property: StyleProperty) => {
  const $store = useMemo(
    () => createComputedStyleDeclStore(property),
    [property]
  );
  return useStore($store);
};

export const useComputedStyles = (properties: StyleProperty[]) => {
  const $styles = useMemo(() => {
    return computed(
      properties.map(createComputedStyleDeclStore),
      (...computedStyles) => computedStyles
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, properties);
  return useStore($styles);
};
