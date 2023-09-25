import { useContext, useEffect, useMemo } from "react";
import { useIsomorphicLayoutEffect } from "react-use";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import type { Assets, Instance, StyleDecl } from "@webstudio-is/sdk";
import {
  collapsedAttribute,
  idAttribute,
  addGlobalRules,
  createImageValueTransformer,
  getPresetStyleRules,
  type Params,
  ReactSdkContext,
} from "@webstudio-is/react-sdk";
import {
  type StyleValue,
  type StyleProperty,
  isValidStaticStyleValue,
} from "@webstudio-is/css-engine";
import {
  assetsStore,
  breakpointsStore,
  $isPreviewMode,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
} from "~/shared/nano-states";
import {
  type StyleRule,
  type PlaintextRule,
  createCssEngine,
  toValue,
  compareMedia,
} from "@webstudio-is/css-engine";
import { useSubscribe } from "~/shared/pubsub";

const userCssEngine = createCssEngine({ name: "user-styles" });
const helpersCssEngine = createCssEngine({ name: "helpers" });
const fontsAndDefaultsCssEngine = createCssEngine({
  name: "fonts-and-defaults",
});
const presetStylesEngine = createCssEngine({ name: "preset-styles" });

// Helper styles on for canvas in design mode
// - Only instances that would collapse without helper should receive helper
// - Helper is removed when any CSS property is changed on that instance that would prevent collapsing, so that helper is not needed
// - Helper doesn't show on the preview or publish
// - Helper goes away if an instance inserted as a child
// - There is no need to set padding-right or padding-bottom if you just need a small div with a defined or layout-based size, as soon as div is not collapsing, helper should not apply
// - Padding will be only added on the side that would collapse otherwise
//
// For example when I add a div, it is a block element, it grows automatically full width but has 0 height, in this case spacing helper with padidng-top: 50px should apply, so that it doesn't collapse.
// If user sets `height: 100px` or does anything that would give it a height - we remove the helper padding right away, so user can actually see the height they set
//
// In other words we prevent elements from collapsing when they have 0 height or width by making them non-zero on canvas, but then we remove those paddings as soon as element doesn't collapse.
const helperStyles = [
  // When double clicking into an element to edit text, it should not select the word.
  `[${idAttribute}] {
    user-select: none;
  }`,
  // Using :where allows to prevent increasing specificity, so that helper is overwritten by user styles.
  `[${idAttribute}]:where([${collapsedAttribute}]:not(body)) {
    outline: 1px dashed rgba(0,0,0,0.7);
    outline-offset: -1px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
  }`,
  // Has no width, will collapse
  // Ensure the TextEditor element doesn't uncollapse unintentionally:
  // 1. Some TextEditor elements might appear empty for a few cycles after creation. (depends on existance of initial child)
  // 2. If detected as empty, the collapsing algorithm could wrongly uncollapse them.
  // 3. We prevent this by excluding elements with `data-lexical-editor`.
  // 4. This rule is used here and not in collapsing detection because `data-lexical-editor` might not be set instantly.
  //    Mistakes in collapsing will be corrected in the next cycle.
  `[${idAttribute}]:where(:not(body):not([data-lexical-editor])[${collapsedAttribute}="w"]) {
    padding-right: 50px;
  }`,
  // Has no height, will collapse
  `[${idAttribute}]:where(:not(body):not([data-lexical-editor])[${collapsedAttribute}="h"]) {
    padding-top: 50px;
  }`,
  // Has no width or height, will collapse
  `[${idAttribute}]:where(:not(body):not([data-lexical-editor])[${collapsedAttribute}="wh"]) {
    padding-right: 50px;
    padding-top: 50px;
  }`,
  `[${idAttribute}][contenteditable], [${idAttribute}]:focus {
    outline: 0;
  }`,
  `[${idAttribute}][contenteditable] {
    box-shadow: 0 0 0 4px rgb(36 150 255 / 20%)
  }`,
];

const subscribePreviewMode = () => {
  let isRendered = false;

  const unsubscribe = $isPreviewMode.subscribe((isPreviewMode) => {
    helpersCssEngine.setAttribute("media", isPreviewMode ? "not all" : "all");
    if (isRendered === false) {
      for (const style of helperStyles) {
        helpersCssEngine.addPlaintextRule(style);
      }
      helpersCssEngine.render();
      isRendered = true;
    }
  });

  return () => {
    helpersCssEngine.clear();
    helpersCssEngine.render();
    unsubscribe();
    isRendered = false;
  };
};

export const useManageDesignModeStyles = (params: Params) => {
  useUpdateStyle(params);
  usePreviewStyle(params);
  useEffect(subscribePreviewMode, []);
};

export const GlobalStyles = ({ params }: { params: Params }) => {
  const breakpoints = useStore(breakpointsStore);
  const assets = useStore(assetsStore);
  const metas = useStore(registeredComponentMetasStore);

  useIsomorphicLayoutEffect(() => {
    const sortedBreakpoints = Array.from(breakpoints.values()).sort(
      compareMedia
    );
    for (const breakpoint of sortedBreakpoints) {
      userCssEngine.addMediaRule(breakpoint.id, breakpoint);
    }
    userCssEngine.render();
  }, [breakpoints]);

  useIsomorphicLayoutEffect(() => {
    fontsAndDefaultsCssEngine.clear();
    addGlobalRules(fontsAndDefaultsCssEngine, {
      assets,
      assetBaseUrl: params.assetBaseUrl,
    });
    fontsAndDefaultsCssEngine.render();
  }, [assets]);

  useIsomorphicLayoutEffect(() => {
    presetStylesEngine.clear();
    for (const [component, meta] of metas) {
      const presetStyle = meta.presetStyle;
      if (presetStyle === undefined) {
        continue;
      }
      const rules = getPresetStyleRules(component, presetStyle);
      for (const [selector, style] of rules) {
        presetStylesEngine.addStyleRule(selector, { style });
      }
    }
    presetStylesEngine.render();
  }, [metas]);

  return null;
};

// Wrapps a normal StyleValue into a VarStyleValue that uses the previous style value as a fallback and allows
// to quickly pass the values over CSS variable witout rerendering the components tree.
// Results in values like this: `var(--namespace, staticValue)`
const toVarValue = (
  instanceId: Instance["id"],
  styleProperty: StyleProperty,
  styleValue: StyleValue
): undefined | StyleValue => {
  if (styleValue.type === "var") {
    return styleValue;
  }
  // Values like InvalidValue, UnsetValue, VarValue don't need to be wrapped
  if (isValidStaticStyleValue(styleValue)) {
    return {
      type: "var",
      value: toVarNamespace(instanceId, styleProperty),
      fallbacks: [styleValue],
    };
  }
};

const wrappedRulesMap = new Map<string, StyleRule | PlaintextRule>();

const getOrCreateRule = ({
  instanceId,
  breakpointId,
  state = "",
  assets,
  params,
}: {
  instanceId: string;
  breakpointId: string;
  state: undefined | string;
  assets: Assets;
  params: Params;
}) => {
  const key = `${instanceId}:${breakpointId}:${state}`;
  let rule = wrappedRulesMap.get(key);
  if (rule === undefined) {
    rule = userCssEngine.addStyleRule(
      `[${idAttribute}="${instanceId}"]${state}`,
      {
        breakpoint: breakpointId,
        style: {},
      }
    );
    wrappedRulesMap.set(key, rule);
  }
  rule.styleMap.setTransformer(
    createImageValueTransformer(assets, { assetBaseUrl: params.assetBaseUrl })
  );
  return rule;
};

const useSelectedState = (instanceId: Instance["id"]) => {
  const selectedStateStore = useMemo(() => {
    return computed(
      [selectedInstanceSelectorStore, selectedStyleSourceSelectorStore],
      (selectedInstanceSelector, selectedStyleSourceSelector) => {
        if (selectedInstanceSelector?.[0] !== instanceId) {
          return;
        }
        return selectedStyleSourceSelector?.state;
      }
    );
  }, [instanceId]);
  const selectedState = useStore(selectedStateStore);
  return selectedState;
};

export const useCssRules = ({
  instanceId,
  instanceStyles,
}: {
  instanceId: string;
  instanceStyles: StyleDecl[];
}) => {
  const params = useContext(ReactSdkContext);
  const breakpoints = useStore(breakpointsStore);
  const selectedState = useSelectedState(instanceId);

  useIsomorphicLayoutEffect(() => {
    // expect assets to be up to date by the time styles are changed
    // to avoid all styles rerendering when assets are changed
    const assets = assetsStore.get();

    // find all instance rules and collect rendered properties
    const deletedPropertiesByRule = new Map<
      StyleRule | PlaintextRule,
      Set<StyleProperty>
    >();
    for (const [key, rule] of wrappedRulesMap) {
      if (key.startsWith(`${instanceId}:`)) {
        deletedPropertiesByRule.set(rule, new Set(rule.styleMap.keys()));
      }
    }

    // render styles without state first so state styles in preview
    // could override them
    const orderedStyles = instanceStyles.slice().sort((left, right) => {
      const leftDirection = left.state === undefined ? -1 : 1;
      const rightDirection = right.state === undefined ? -1 : 1;
      return leftDirection - rightDirection;
    });

    for (const styleDecl of orderedStyles) {
      const { breakpointId, state, property, value } = styleDecl;

      // create new rule or use cached one
      const rule = getOrCreateRule({
        instanceId,
        breakpointId,
        // render selected state as style without state
        // to show user preview
        state: selectedState === state ? undefined : state,
        assets,
        params,
      });

      // find existing declarations and exclude currently set properties
      // to delete the rest later
      const deletedProperties = deletedPropertiesByRule.get(rule);
      if (deletedProperties) {
        deletedProperties.delete(property);
      }

      // We don't want to wrap backgroundClip into a var, because it's not supported by CSS variables
      // It's fine because we don't need to update it dynamically via CSS variables during preview changes
      // we renrender it anyway when CSS update happens
      if (property === "backgroundClip") {
        rule.styleMap.set(property, value);
      } else {
        const varValue = toVarValue(instanceId, property, value);
        if (varValue) {
          rule.styleMap.set(property, varValue);
        }
      }
    }

    // delete previously rendered properties when reset
    for (const [styleRule, deletedProperties] of deletedPropertiesByRule) {
      for (const property of deletedProperties) {
        styleRule.styleMap.delete(property);
      }
    }

    userCssEngine.render();
  }, [instanceId, selectedState, instanceStyles, breakpoints]);
};

const toVarNamespace = (id: string, property: string) => {
  return `${property}-${id}`;
};

const setCssVar = (
  params: Params,
  id: string,
  property: string,
  value?: StyleValue
) => {
  const customProperty = `--${toVarNamespace(id, property)}`;
  if (value === undefined) {
    document.body.style.removeProperty(customProperty);
    return;
  }

  const assets = assetsStore.get();
  const transformer = createImageValueTransformer(assets, {
    assetBaseUrl: params.assetBaseUrl,
  });

  document.body.style.setProperty(customProperty, toValue(value, transformer));
};

const useUpdateStyle = (params: Params) => {
  useSubscribe("updateStyle", ({ id, updates }) => {
    const selectedInstanceSelector = selectedInstanceSelectorStore.get();
    const selectedInstanceId = selectedInstanceSelector?.[0];
    // Only update styles if they match the selected instance
    // It can potentially happen that we selected a difference instance right after we changed the style in style panel.
    if (id !== selectedInstanceId) {
      return;
    }

    for (const update of updates) {
      setCssVar(params, id, update.property, undefined);
    }
  });
};

const usePreviewStyle = (params: Params) => {
  useSubscribe("previewStyle", ({ id, updates, breakpoint, state }) => {
    const rule = getOrCreateRule({
      instanceId: id,
      breakpointId: breakpoint.id,
      state,
      assets: assetsStore.get(),
      params,
    });

    for (const update of updates) {
      if (update.operation === "set") {
        // This is possible on newly created instances, properties are not yet defined in the style.
        if (rule.styleMap.has(update.property) === false) {
          const varValue = toVarValue(id, update.property, update.value);
          if (varValue) {
            rule.styleMap.set(update.property, varValue);
          }
        }

        setCssVar(params, id, update.property, update.value);
      }

      if (update.operation === "delete") {
        setCssVar(params, id, update.property, undefined);
      }
    }

    userCssEngine.render();
  });
};
