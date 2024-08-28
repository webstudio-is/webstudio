import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { compareMedia, type StyleValue } from "@webstudio-is/css-engine";
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
import { useMemo } from "react";

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

export const createComputedStyleDeclStore = (property: string) => {
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

export const useComputedStyleDecl = (property: string) => {
  const $store = useMemo(
    () => createComputedStyleDeclStore(property),
    [property]
  );
  return useStore($store);
};
