import { useEffect } from "react";
import { useSubscribe } from "~/shared/pubsub";
import { addGlobalRules } from "@webstudio-is/project";
import { selectedInstanceIdStore, useBreakpoints } from "~/shared/nano-states";
import type { Styles } from "@webstudio-is/project-build";
import {
  getComponentMeta,
  getComponentNames,
  idAttribute,
} from "@webstudio-is/react-sdk";
import {
  validStaticValueTypes,
  type ValidStaticStyleValue,
  type StyleValue,
  type CssRule,
  type StyleProperty,
  type Style,
} from "@webstudio-is/css-data";
import {
  createCssEngine,
  toValue,
  type StyleRule,
  type PlaintextRule,
} from "@webstudio-is/css-engine";
import { useIsomorphicLayoutEffect } from "react-use";
import type { Asset } from "@webstudio-is/asset-uploader";

const cssEngine = createCssEngine({ name: "user-styles" });

const voidElements =
  "area, base, br, col, embed, hr, img, input, link, meta, source, track, wbr";

// Helper styles on for canvas in design mode
const helperStyles = [
  // When double clicking into an element to edit text, it should not select the word.
  `[${idAttribute}] {
    user-select: none;
  }`,
  `[${idAttribute}]:not(${voidElements}):not(body):empty {
    outline: 1px dashed #555;
    outline-offset: -1px;
    padding-top: 50px;
    padding-right: 50px;
  }`,
  `[${idAttribute}][contenteditable], [${idAttribute}]:focus {
    outline: 0;
  }`,
  `[${idAttribute}][contenteditable] {
    box-shadow: 0 0 0 4px rgb(36 150 255 / 20%)
  }`,
];

export const useManageDesignModeStyles = () => {
  useUpdateStyle();
  usePreviewStyle();
  useRemoveSsrStyles();
};

const helpersCssEngine = createCssEngine({ name: "helpers" });
const fontsAndDefaultsCssEngine = createCssEngine({
  name: "fonts-and-defaults",
});
const presetStylesEngine = createCssEngine({ name: "presetStyles" });

export const GlobalStyles = ({ assets }: { assets: Array<Asset> }) => {
  const [breakpoints] = useBreakpoints();

  useIsomorphicLayoutEffect(() => {
    for (const breakpoint of breakpoints) {
      cssEngine.addMediaRule(breakpoint.id, breakpoint);
    }
  }, [breakpoints]);

  useIsomorphicLayoutEffect(() => {
    for (const style of helperStyles) {
      helpersCssEngine.addPlaintextRule(style);
    }
    helpersCssEngine.render();
  }, []);

  useIsomorphicLayoutEffect(() => {
    fontsAndDefaultsCssEngine.clear();
    addGlobalRules(fontsAndDefaultsCssEngine, { assets });
    fontsAndDefaultsCssEngine.render();
  }, [assets]);

  useIsomorphicLayoutEffect(() => {
    presetStylesEngine.clear();
    for (const component of getComponentNames()) {
      const meta = getComponentMeta(component);
      const presetStyle = meta?.presetStyle;
      if (presetStyle !== undefined) {
        presetStylesEngine.addStyleRule(`[data-ws-component=${component}]`, {
          style: presetStyle,
        });
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
        value.type as typeof validStaticValueTypes[number]
      )
    ) {
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

const addRule = (id: string, cssRule: CssRule) => {
  const key = id + cssRule.breakpoint;
  const selectorText = `[${idAttribute}="${id}"]`;
  const rule = cssEngine.addStyleRule(selectorText, {
    ...cssRule,
    style: toVarStyleWithFallback(id, cssRule.style),
  });
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
  instanceStyles: Styles;
}) => {
  const [breakpoints] = useBreakpoints();

  useIsomorphicLayoutEffect(() => {
    const stylePerBreakpoint = new Map<string, Style>();

    for (const item of instanceStyles) {
      let style = stylePerBreakpoint.get(item.breakpointId);
      if (style === undefined) {
        style = {};
        stylePerBreakpoint.set(item.breakpointId, style);
      }
      style[item.property] = item.value;
    }

    for (const { id: breakpointId } of breakpoints) {
      const style = stylePerBreakpoint.get(breakpointId) ?? {};
      const rule = getRule(instanceId, breakpointId);
      // It's the first time the rule is being used
      if (rule === undefined) {
        addRule(instanceId, { breakpoint: breakpointId, style });
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
  document.body.style.setProperty(customProperty, toValue(value));
};

const useUpdateStyle = () => {
  useSubscribe("updateStyle", ({ id, updates }) => {
    const selectedInstanceId = selectedInstanceIdStore.get();
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
      rule = addRule(id, { breakpoint: breakpoint.id, style: {} });
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

// Once we rendered the tree in editing mode, we have rendered all styles in a <style> tag.
// We keep the SSR styles just for the page on canvas to show up like it does in preview.
const useRemoveSsrStyles = () => {
  useEffect(() => {
    const link = document.head.querySelector('[data-webstudio="ssr"]');
    link?.parentElement?.removeChild(link);
  }, []);
};
