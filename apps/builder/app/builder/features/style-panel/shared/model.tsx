import { useMemo, useRef } from "react";
import { computed, type ReadableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import { properties } from "@webstudio-is/css-data";
import {
  compareMedia,
  toVarFallback,
  type StyleProperty,
  type StyleValue,
  type VarValue,
} from "@webstudio-is/css-engine";
import {
  Instances,
  ROOT_INSTANCE_ID,
  Styles,
  StyleSourceSelections,
  type Breakpoint,
  type Instance,
  type StyleDecl,
} from "@webstudio-is/sdk";
import { rootComponent, WsComponentMeta } from "@webstudio-is/react-sdk";
import {
  $breakpoints,
  $instances,
  $registeredComponentMetas,
  $selectedBreakpoint,
  $selectedInstanceIntanceToTag,
  $selectedInstanceStates,
  $selectedOrLastStyleSourceSelector,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import {
  getComputedStyleDecl,
  getPresetStyleDeclKey,
  type ComputedStyleDecl,
  type StyleObjectModel,
} from "~/shared/style-object-model";
import type { InstanceSelector } from "~/shared/tree-utils";
import { $selectedInstancePath } from "~/shared/awareness";

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

const $instanceComponents = computed($selectedInstancePath, (instancePath) => {
  const instanceComponents = new Map<Instance["id"], Instance["component"]>([
    [ROOT_INSTANCE_ID, rootComponent],
  ]);
  if (instancePath === undefined) {
    return instanceComponents;
  }
  // store only component for selected instance and ancestors
  // to avoid iterating over all instances in the project
  for (const { instance } of instancePath) {
    instanceComponents.set(instance.id, instance.component);
  }
  return instanceComponents;
});

export const $matchingBreakpoints = computed(
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

export const getDefinedStyles = ({
  instanceSelector,
  instances,
  metas,
  matchingBreakpoints: matchingBreakpointsArray,
  styleSourceSelections,
  styles,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
  metas: Map<string, WsComponentMeta>;
  matchingBreakpoints: Breakpoint["id"][];
  styleSourceSelections: StyleSourceSelections;
  styles: Styles;
}) => {
  const definedStyles = new Set<{
    property: StyleProperty;
    listed?: boolean;
  }>();
  const inheritedStyleSources = new Set();
  const instanceStyleSources = new Set();
  const matchingBreakpoints = new Set(matchingBreakpointsArray);
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    const meta = instance?.component
      ? metas.get(instance.component)
      : undefined;
    for (const presetStyles of Object.values(meta?.presetStyle ?? {})) {
      for (const styleDecl of presetStyles) {
        definedStyles.add(styleDecl);
      }
    }
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
      definedStyles.add(styleDecl);
    }
    const inherited =
      properties[styleDecl.property as keyof typeof properties]?.inherited ??
      // custom properties are always inherited
      true;
    if (
      matchingBreakpoints.has(styleDecl.breakpointId) &&
      inheritedStyleSources.has(styleDecl.styleSourceId) &&
      inherited
    ) {
      definedStyles.add(styleDecl);
    }
  }
  return definedStyles;
};

const $instanceAndRootSelector = computed(
  $selectedInstancePath,
  (instancePath) => {
    if (instancePath === undefined) {
      return;
    }
    const [selectedItem] = instancePath;
    if (selectedItem.instance.id === ROOT_INSTANCE_ID) {
      return selectedItem.instanceSelector;
    }
    return [...selectedItem.instanceSelector, ROOT_INSTANCE_ID];
  }
);

export const $definedStyles = computed(
  [
    $instanceAndRootSelector,
    $instances,
    $registeredComponentMetas,
    $styleSourceSelections,
    $matchingBreakpoints,
    $styles,
  ],
  (
    instanceSelector,
    instances,
    metas,
    styleSourceSelections,
    matchingBreakpoints,
    styles
  ) => {
    if (instanceSelector === undefined) {
      return new Set<StyleDecl>();
    }
    return getDefinedStyles({
      instanceSelector,
      instances,
      metas,
      matchingBreakpoints,
      styleSourceSelections,
      styles,
    });
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

export const $definedComputedStyles = computed(
  [
    $definedStyles,
    $model,
    $instanceAndRootSelector,
    $selectedOrLastStyleSourceSelector,
  ],
  (definedStyles, model, instanceSelector, styleSourceSelector) => {
    const computedStyles = new Map<string, ComputedStyleDecl>();
    for (const { property } of definedStyles) {
      // deduplicate by property name
      if (computedStyles.has(property)) {
        continue;
      }
      const computedStyleDecl = getComputedStyleDecl({
        model,
        instanceSelector,
        styleSourceId: styleSourceSelector?.styleSourceId,
        state: styleSourceSelector?.state,
        property,
      });
      computedStyles.set(property, computedStyleDecl);
    }
    return Array.from(computedStyles.values());
  }
);

export const $availableVariables = computed(
  $definedComputedStyles,
  (computedStyles) => {
    const availableVariables: VarValue[] = [];
    for (const styleDecl of computedStyles) {
      if (styleDecl.property.startsWith("--")) {
        availableVariables.push({
          type: "var",
          value: styleDecl.property.slice(2),
          fallback: toVarFallback(styleDecl.computedValue),
        });
      }
    }
    return availableVariables;
  }
);

export const $availableUnitVariables = computed(
  $availableVariables,
  (availableVariables) =>
    availableVariables.filter((value) => value.fallback?.type !== "rgb")
);

export const $availableColorVariables = computed(
  $availableVariables,
  (availableVariables) =>
    availableVariables.filter((value) => value.fallback?.type !== "unit")
);

export const createComputedStyleDeclStore = (property: StyleProperty) => {
  return computed(
    [$model, $instanceAndRootSelector, $selectedOrLastStyleSourceSelector],
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

const $closestStylableInstanceSelector = computed(
  [$instanceAndRootSelector, $instances, $registeredComponentMetas],
  (instanceSelector, instances, metas) => {
    // ignore unstylable instances which do not affect parent/child relationships
    if (instanceSelector === undefined) {
      return;
    }
    const closestStylableIndex = instanceSelector.findIndex(
      (instanceId, index) => {
        // start with parent
        if (index === 0) {
          return false;
        }
        const component = instances.get(instanceId)?.component;
        if (component) {
          return metas.get(component)?.stylable ?? true;
        }
        // ids without instances are collection items
        // they are not stylable
        return false;
      }
    );
    return instanceSelector.slice(closestStylableIndex);
  }
);

export const useParentComputedStyleDecl = (property: StyleProperty) => {
  const $store = useMemo(
    () =>
      computed(
        [$model, $closestStylableInstanceSelector],
        (model, instanceSelector) => {
          return getComputedStyleDecl({
            model,
            instanceSelector,
            property,
          });
        }
      ),
    [property]
  );
  return useStore($store);
};

export const useComputedStyles = (properties: StyleProperty[]) => {
  // cache each computed style store
  const cachedStores = useRef(
    new Map<StyleProperty, ReadableAtom<ComputedStyleDecl>>()
  );
  const stores: ReadableAtom<ComputedStyleDecl>[] = [];
  for (const property of properties) {
    let store = cachedStores.current.get(property);
    if (store === undefined) {
      store = createComputedStyleDeclStore(property);
      cachedStores.current.set(property, store);
    }
    stores.push(store);
  }
  // combine all styles into single list
  const $styles = useMemo(() => {
    return computed(stores, (...computedStyles) => computedStyles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.join()]);
  return useStore($styles);
};
