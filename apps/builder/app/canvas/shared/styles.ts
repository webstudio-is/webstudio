import { useEffect } from "react";
import { useIsomorphicLayoutEffect } from "react-use";
import { useStore } from "@nanostores/react";
import type { Assets } from "@webstudio-is/asset-uploader";
import {
  collapsedAttribute,
  componentAttribute,
  getComponentMeta,
  getComponentNames,
  idAttribute,
  addGlobalRules,
  createImageValueTransformer,
  getParams,
} from "@webstudio-is/react-sdk";
import type { StyleDecl } from "@webstudio-is/project-build";
import {
  validStaticValueTypes,
  type ValidStaticStyleValue,
  type StyleValue,
  type CssRule,
  type StyleProperty,
  type Style,
} from "@webstudio-is/css-data";
import {
  assetsStore,
  breakpointsStore,
  isPreviewModeStore,
  selectedInstanceSelectorStore,
} from "~/shared/nano-states";
import {
  createCssEngine,
  toValue,
  type StyleRule,
  type PlaintextRule,
} from "@webstudio-is/css-engine";
import { useSubscribe } from "~/shared/pubsub";

const cssEngine = createCssEngine({ name: "user-styles" });
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
export const helperStyles = [
  // When double clicking into an element to edit text, it should not select the word.
  `[${idAttribute}] {
    user-select: none;
  }`,
  // Using :where allows to prevent increasing specificity, so that helper is overwritten by user styles.
  `[${idAttribute}]:where([${collapsedAttribute}]:not(body)) {
    outline: 1px dashed #555;
    outline-offset: -0.5px;
  }`,
  // Has no width, will collapse
  `[${idAttribute}]:where(:not(body)[${collapsedAttribute}="w"]) {
    padding-right: 50px;
  }`,
  // Has no height, will collapse
  `[${idAttribute}]:where(:not(body)[${collapsedAttribute}="h"]) {
    padding-top: 50px;
  }`,
  // Has no width or height, will collapse
  `[${idAttribute}]:where(:not(body)[${collapsedAttribute}="wh"]) {
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

  const unsubscribe = isPreviewModeStore.subscribe((isPreviewMode) => {
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

export const useManageDesignModeStyles = () => {
  useUpdateStyle();
  usePreviewStyle();
  useEffect(subscribePreviewMode, []);
};

export const GlobalStyles = () => {
  const breakpoints = useStore(breakpointsStore);
  const assets = useStore(assetsStore);

  useIsomorphicLayoutEffect(() => {
    for (const breakpoint of breakpoints.values()) {
      cssEngine.addMediaRule(breakpoint.id, breakpoint);
    }
  }, [breakpoints]);

  useIsomorphicLayoutEffect(() => {
    fontsAndDefaultsCssEngine.clear();
    const params = getParams();
    addGlobalRules(fontsAndDefaultsCssEngine, {
      assets,
      assetBaseUrl: params.assetBaseUrl,
    });
    fontsAndDefaultsCssEngine.render();
  }, [assets]);

  useIsomorphicLayoutEffect(() => {
    presetStylesEngine.clear();
    for (const component of getComponentNames()) {
      const meta = getComponentMeta(component);
      const presetStyle = meta?.presetStyle;
      if (presetStyle !== undefined) {
        for (const [tag, style] of Object.entries(presetStyle)) {
          presetStylesEngine.addStyleRule(
            `${tag}:where([${componentAttribute}=${component}])`,
            {
              style,
            }
          );
        }
      }
    }
    presetStylesEngine.render();
  }, []);

  return null;
};

// Wrapps a normal StyleValue into a VarStyleValue that uses the previous style value as a fallback and allows
// to quickly pass the values over CSS variable witout rerendering the components tree.
// Results in values like this: `var(--namespace, staticValue)`
const toVarStyleWithFallback = (instanceId: string, style: Style): Style => {
  const dynamicStyle: Style = {};
  let property: StyleProperty;
  for (property in style) {
    const value = style[property];
    if (value === undefined) {
      continue;
    }
    if (value.type === "var") {
      dynamicStyle[property] = value;
      continue;
    }
    if (
      validStaticValueTypes.includes(
        value.type as (typeof validStaticValueTypes)[number]
      )
    ) {
      // We don't want to wrap backgroundClip into a var, because it's not supported by CSS variables
      // It's fine because we don't need to update it dynamically via CSS variables during preview changes
      // we renrender it anyway when CSS update happens
      if (property === "backgroundClip") {
        dynamicStyle[property] = value;
        continue;
      }
      dynamicStyle[property] = {
        type: "var",
        value: toVarNamespace(instanceId, property),
        fallbacks: [value as ValidStaticStyleValue],
      };
    }
  }
  return dynamicStyle;
};

const wrappedRulesMap = new Map<string, StyleRule | PlaintextRule>();

const addRule = (id: string, cssRule: CssRule, assets: Assets) => {
  const key = id + cssRule.breakpoint;
  const selectorText = `[${idAttribute}="${id}"]`;
  const params = getParams();
  const rule = cssEngine.addStyleRule(
    selectorText,
    {
      ...cssRule,
      style: toVarStyleWithFallback(id, cssRule.style),
    },
    createImageValueTransformer(assets, {
      assetBaseUrl: params.assetBaseUrl,
    })
  );
  wrappedRulesMap.set(key, rule);
  return rule;
};

const getRule = (id: string, breakpoint?: string) => {
  const key = id + breakpoint;
  return wrappedRulesMap.get(key);
};

export const useCssRules = ({
  instanceId,
  instanceStyles,
}: {
  instanceId: string;
  instanceStyles: StyleDecl[];
}) => {
  const breakpoints = useStore(breakpointsStore);

  useIsomorphicLayoutEffect(() => {
    const stylePerBreakpoint = new Map<string, Style>();
    // expect assets to be up to date by the time styles are changed
    // to avoid all styles rerendering when assets are changed
    const assets = assetsStore.get();

    for (const item of instanceStyles) {
      let style = stylePerBreakpoint.get(item.breakpointId);
      if (style === undefined) {
        style = {};
        stylePerBreakpoint.set(item.breakpointId, style);
      }
      style[item.property] = item.value;
    }

    for (const breakpointId of breakpoints.keys()) {
      const style = stylePerBreakpoint.get(breakpointId) ?? {};
      const rule = getRule(instanceId, breakpointId);
      // It's the first time the rule is being used
      if (rule === undefined) {
        addRule(instanceId, { breakpoint: breakpointId, style }, assets);
        continue;
      }
      // It's an update to an existing rule
      const dynamicStyle = toVarStyleWithFallback(instanceId, style);
      let property: StyleProperty;
      for (property in dynamicStyle) {
        rule.styleMap.set(property, dynamicStyle[property]);
      }
      // delete previously rendered properties when reset
      for (const property of rule.styleMap.keys()) {
        if (dynamicStyle[property] === undefined) {
          rule.styleMap.delete(property);
        }
      }
    }
    cssEngine.render();
  }, [instanceId, instanceStyles, breakpoints]);
};

const toVarNamespace = (id: string, property: string) => {
  return `${property}-${id}`;
};

const setCssVar = (id: string, property: string, value?: StyleValue) => {
  const customProperty = `--${toVarNamespace(id, property)}`;
  if (value === undefined) {
    document.body.style.removeProperty(customProperty);
    return;
  }
  document.body.style.setProperty(customProperty, toValue(value, undefined));
};

const useUpdateStyle = () => {
  useSubscribe("updateStyle", ({ id, updates }) => {
    const selectedInstanceSelector = selectedInstanceSelectorStore.get();
    const selectedInstanceId = selectedInstanceSelector?.[0];
    // Only update styles if they match the selected instance
    // It can potentially happen that we selected a difference instance right after we changed the style in style panel.
    if (id !== selectedInstanceId) {
      return;
    }

    for (const update of updates) {
      setCssVar(id, update.property, undefined);
    }
  });
};

const usePreviewStyle = () => {
  useSubscribe("previewStyle", ({ id, updates, breakpoint }) => {
    let rule = getRule(id, breakpoint.id);

    if (rule === undefined) {
      const assets = assetsStore.get();
      rule = addRule(id, { breakpoint: breakpoint.id, style: {} }, assets);
    }

    for (const update of updates) {
      if (update.operation === "set") {
        // This is possible on newly created instances, properties are not yet defined in the style.
        if (rule.styleMap.has(update.property) === false) {
          const dynamicStyle = toVarStyleWithFallback(id, {
            [update.property]: update.value,
          });

          rule.styleMap.set(update.property, dynamicStyle[update.property]);
        }

        setCssVar(id, update.property, update.value);
      }

      if (update.operation === "delete") {
        setCssVar(id, update.property, undefined);
      }
    }

    cssEngine.render();
  });
};
