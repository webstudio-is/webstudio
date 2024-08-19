import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { compareMedia, type StyleValue } from "@webstudio-is/css-engine";
import type { Instance } from "@webstudio-is/sdk";
import {
  $breakpoints,
  $instances,
  $registeredComponentMetas,
  $selectedInstanceIntanceToTag,
  $selectedInstanceSelector,
  $selectedInstanceStates,
  $selectedOrLastStyleSourceSelector,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import {
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

const $matchingBreakpoints = computed($breakpoints, (breakpoints) => {
  return Array.from(breakpoints.values())
    .sort(compareMedia)
    .map((breakpoint) => breakpoint.id);
});

const $matchingStates = computed(
  [$selectedInstanceStates, $selectedOrLastStyleSourceSelector],
  (instanceStates, styleSourceSelector) => {
    const matchingStates = new Set(instanceStates);
    if (styleSourceSelector?.state) {
      matchingStates.add(styleSourceSelector.state);
    }
    return matchingStates;
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
    $matchingStates,
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

export const useStyleObjectModel = () => {
  return useStore($model);
};
