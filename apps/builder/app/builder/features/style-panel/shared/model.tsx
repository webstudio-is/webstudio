import { useMemo, useRef } from "react";
import type { HtmlTags } from "html-tags";
import { computed, type ReadableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import { propertiesData } from "@webstudio-is/css-data";
import {
  compareMedia,
  hyphenateProperty,
  matchMedia,
  toVarFallback,
  type CssProperty,
  type StyleValue,
  type VarValue,
} from "@webstudio-is/css-engine";
import {
  ROOT_INSTANCE_ID,
  type Styles,
  type StyleSourceSelections,
  type Breakpoint,
  type Instance,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { rootComponent } from "@webstudio-is/sdk";
import {
  $breakpoints,
  $propsIndex,
  $registeredComponentMetas,
  $selectedBreakpoint,
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
import {
  $selectedInstancePathWithRoot,
  type InstancePath,
} from "~/shared/awareness";
import type { InstanceSelector } from "~/shared/tree-utils";
import { $canvasWidth } from "~/builder/shared/nano-states";

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

export const $instanceTags = computed(
  [$registeredComponentMetas, $selectedInstancePathWithRoot, $propsIndex],
  (metas, instancePath, propsIndex) => {
    const instanceTags = new Map<Instance["id"], HtmlTags>();
    if (instancePath === undefined) {
      return instanceTags;
    }
    for (const { instance } of instancePath) {
      const meta = metas.get(instance.component);
      if (meta === undefined) {
        continue;
      }
      const tags = Object.keys(meta.presetStyle ?? {}) as HtmlTags[];
      if (tags.length > 0) {
        // take first tag from preset
        let currentTag = tags[0];
        // when more than one tag is defined in preset look for specific one in props
        if (tags.length > 1) {
          const props = propsIndex.propsByInstanceId.get(instance.id);
          // @todo rewrite adhoc solution when ws:tag is supported
          const tagProp = props?.find((prop) => prop.name === "tag");
          if (tagProp) {
            currentTag = tagProp.value as HtmlTags;
          }
        }
        instanceTags.set(instance.id, currentTag);
      }
    }
    return instanceTags;
  }
);

const $instanceComponents = computed(
  $selectedInstancePathWithRoot,
  (instancePath) => {
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
  }
);

export const $matchingBreakpoints = computed(
  [$breakpoints, $selectedBreakpoint, $canvasWidth],
  (breakpoints, selectedBreakpoint, canvasWidth) => {
    // zero is not correct, need to use current width for base breakpoint
    // add always add base
    const selectedWidth =
      selectedBreakpoint?.minWidth ??
      selectedBreakpoint?.maxWidth ??
      canvasWidth ??
      0;
    const sortedBreakpoints = Array.from(breakpoints.values())
      .sort(compareMedia)
      .sort((left, right) => {
        // put selected breakpoint always in the end
        // to make style from matching breakpoints remote
        const leftScore = left.id === selectedBreakpoint?.id ? 1 : 0;
        const rightScore = right.id === selectedBreakpoint?.id ? 1 : 0;
        return leftScore - rightScore;
      });
    const matchingBreakpoints: Breakpoint["id"][] = [];
    for (const breakpoint of sortedBreakpoints) {
      if (matchMedia(breakpoint, selectedWidth)) {
        matchingBreakpoints.push(breakpoint.id);
      }
    }
    return matchingBreakpoints;
  }
);

const getDefinedStyles = ({
  instancePath,
  metas,
  matchingBreakpoints: matchingBreakpointsArray,
  styleSourceSelections,
  styles,
}: {
  instancePath: InstancePath;
  metas: Map<string, WsComponentMeta>;
  matchingBreakpoints: Breakpoint["id"][];
  styleSourceSelections: StyleSourceSelections;
  styles: Styles;
}) => {
  type Defined = {
    property: CssProperty;
    listed?: boolean;
  };

  const inheritedStyleSources = new Set();
  const instanceStyleSources = new Set();
  const matchingBreakpoints = new Set(matchingBreakpointsArray);
  const startingInstanceSelector = instancePath[0].instanceSelector;

  const instanceStyles = new Set<Defined>();
  const inheritedStyles = new Set<Defined>();
  const presetStyles = new Set<Defined>();

  for (const { instance } of instancePath) {
    const meta = metas.get(instance.component);
    for (const preset of Object.values(meta?.presetStyle ?? {})) {
      for (const styleDecl of preset) {
        presetStyles.add({ property: styleDecl.property });
      }
    }
    const styleSources = styleSourceSelections.get(instance.id)?.values;
    if (styleSources) {
      for (const styleSourceId of styleSources) {
        if (instance.id === startingInstanceSelector[0]) {
          instanceStyleSources.add(styleSourceId);
        } else {
          inheritedStyleSources.add(styleSourceId);
        }
      }
    }
  }
  for (const styleDecl of styles.values()) {
    const property = hyphenateProperty(styleDecl.property);
    if (
      matchingBreakpoints.has(styleDecl.breakpointId) &&
      instanceStyleSources.has(styleDecl.styleSourceId)
    ) {
      instanceStyles.add({
        property,
        listed: styleDecl.listed,
      });
    }
    // custom properties are always inherited
    const inherited = propertiesData[property]?.inherited ?? true;
    if (
      matchingBreakpoints.has(styleDecl.breakpointId) &&
      inheritedStyleSources.has(styleDecl.styleSourceId) &&
      inherited
    ) {
      inheritedStyles.add({
        property,
        listed: styleDecl.listed,
      });
    }
  }

  // We are sorting by alphabet within each group.
  const sortByProperty = (a: { property: string }, b: { property: string }) => {
    return Intl.Collator().compare(a.property, b.property);
  };

  return [
    ...Array.from(instanceStyles).sort(sortByProperty),
    ...Array.from(inheritedStyles).sort(sortByProperty),
    ...Array.from(presetStyles).sort(sortByProperty),
  ];
};

const $model = computed(
  [
    $styles,
    $styleSourceSelections,
    $presetStyles,
    $instanceTags,
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
      instanceTags,
      instanceComponents,
      matchingBreakpoints,
      matchingStates,
    };
  }
);

export { $model as _$model };

export const $computedStyleDeclarations = computed(
  [
    $model,
    $selectedInstancePathWithRoot,
    $selectedOrLastStyleSourceSelector,
    $registeredComponentMetas,
    $matchingBreakpoints,
    $styleSourceSelections,
    $styles,
  ],
  (
    model,
    instancePath,
    styleSourceSelector,
    metas,
    matchingBreakpoints,
    styleSourceSelections,
    styles
  ) => {
    if (instancePath === undefined) {
      return [];
    }
    const definedStyles = getDefinedStyles({
      instancePath,
      metas,
      matchingBreakpoints,
      styleSourceSelections,
      styles,
    });
    const computedStyles = new Map<string, ComputedStyleDecl>();
    for (const { property, listed } of definedStyles) {
      // deduplicate by property name
      if (computedStyles.has(property)) {
        continue;
      }
      const computedStyleDecl = getComputedStyleDecl({
        model,
        instanceSelector: instancePath?.[0].instanceSelector,
        styleSourceId: styleSourceSelector?.styleSourceId,
        state: styleSourceSelector?.state,
        property,
      });
      // @todo We will delete it once we have added additional filters to advanced panel and
      // don't need to differentiate this any more.
      computedStyleDecl.listed = listed;

      computedStyles.set(property, computedStyleDecl);
    }
    return Array.from(computedStyles.values());
  }
);

export const $availableVariables = computed(
  $computedStyleDeclarations,
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

export const createComputedStyleDeclStore = (property: CssProperty) => {
  return computed(
    [$model, $selectedInstancePathWithRoot, $selectedOrLastStyleSourceSelector],
    (model, instancePath, styleSourceSelector) => {
      return getComputedStyleDecl({
        model,
        instanceSelector: instancePath?.[0].instanceSelector,
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

export const useComputedStyleDecl = (property: CssProperty) => {
  const $store = useMemo(
    () => createComputedStyleDeclStore(property),
    [property]
  );
  return useStore($store);
};

const $closestStylableInstanceSelector = computed(
  [$selectedInstancePathWithRoot, $registeredComponentMetas],
  (instancePath, metas) => {
    // ignore unstylable instances which do not affect parent/child relationships
    if (instancePath === undefined) {
      return;
    }
    const match = instancePath.find(({ instance }, index) => {
      // start with parent
      if (index === 0) {
        return false;
      }
      return metas.get(instance.component)?.presetStyle !== undefined;
    });
    return match?.instanceSelector;
  }
);

export const useParentComputedStyleDecl = (property: CssProperty) => {
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

export const getInstanceStyleDecl = (
  property: CssProperty,
  instanceSelector: InstanceSelector
) => {
  return getComputedStyleDecl({
    model: $model.get(),
    instanceSelector,
    property,
  });
};

export const useComputedStyles = (properties: CssProperty[]) => {
  // cache each computed style store
  const cachedStores = useRef(
    new Map<CssProperty, ReadableAtom<ComputedStyleDecl>>()
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
