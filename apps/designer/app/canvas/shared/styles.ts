import store from "immerhin";
import { useSubscribe } from "~/shared/pubsub";
import { addGlobalRules, utils } from "@webstudio-is/project";
import { useSelectedInstance } from "./nano-states";
import {
  designTokensContainer,
  rootInstanceContainer,
  useDesignTokens,
} from "~/shared/nano-states";
import { idAttribute } from "@webstudio-is/react-sdk";
import {
  validStaticValueTypes,
  type Breakpoint,
  type ValidStaticStyleValue,
  type StyleValue,
  type CssRule,
  type StyleProperty,
  type Style,
} from "@webstudio-is/css-data";
import { useEffect } from "react";
import {
  createCssEngine,
  toValue,
  type StyleRule,
  type PlaintextRule,
} from "@webstudio-is/css-engine";
import { useIsomorphicLayoutEffect } from "react-use";
import type { Asset } from "@webstudio-is/asset-uploader";
import {
  deleteTokenMutable,
  tokensToStyle,
  updateTokenMutable,
} from "~/designer/shared/design-tokens-manager";

const cssEngine = createCssEngine();

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
    outline-offset: -1;
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
  useUpdateToken();
  useCreateToken();
  useDeleteToken();
  useUpdateStyle();
  usePreviewStyle();
  useRemoveSsrStyles();
};

const helpersCssEngine = createCssEngine();
const fontsAndDefaultsCssEngine = createCssEngine();
const tokensCssEngine = createCssEngine();

export const GlobalStyles = ({ assets }: { assets: Array<Asset> }) => {
  useIsomorphicLayoutEffect(() => {
    for (const style of helperStyles) {
      helpersCssEngine.addPlaintextRule(style);
    }
    if (typeof document !== "undefined") {
      helpersCssEngine.render();
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    fontsAndDefaultsCssEngine.clear();
    addGlobalRules(fontsAndDefaultsCssEngine, { assets });
    if (typeof document !== "undefined") {
      fontsAndDefaultsCssEngine.render();
    }
  }, [assets]);

  const [tokens] = useDesignTokens();

  useIsomorphicLayoutEffect(() => {
    tokensCssEngine.clear();
    if (tokens.length !== 0) {
      const style = tokensToStyle(tokens);
      tokensCssEngine.addStyleRule(`:root`, { style });
    }

    if (typeof document !== "undefined") {
      tokensCssEngine.render();
    }
  }, [tokens]);

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

export const addMediaRules = (breakpoints: Array<Breakpoint>) => {
  for (const breakpoint of breakpoints) {
    cssEngine.addMediaRule(breakpoint.id, breakpoint);
  }
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
  id,
  cssRules,
}: {
  id: string;
  cssRules: Array<CssRule>;
}) => {
  useIsomorphicLayoutEffect(() => {
    for (const cssRule of cssRules) {
      const rule = getRule(id, cssRule.breakpoint);
      // It's the first time the rule is being used
      if (rule === undefined) {
        addRule(id, cssRule);
        continue;
      }
      // It's an update to an existing rule
      const dynamicStyle = toVarStyleWithFallback(id, cssRule.style);
      let property: StyleProperty;
      for (property in dynamicStyle) {
        rule.styleMap.set(property, dynamicStyle[property]);
      }
    }
    cssEngine.render();
  }, [id, cssRules]);
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
  const [selectedInstance] = useSelectedInstance();
  useSubscribe("updateStyle", ({ id, updates, breakpoint }) => {
    // Only update styles if they match the selected instance
    // It can potentially happen that we selected a difference instance right after we changed the style in style panel.
    if (id !== selectedInstance?.id) return;

    for (const update of updates) {
      setCssVar(id, update.property, undefined);
    }

    store.createTransaction([rootInstanceContainer], (rootInstance) => {
      if (rootInstance === undefined) {
        return;
      }
      utils.tree.setInstanceStyleMutable(rootInstance, id, updates, breakpoint);
    });
  });
};

const useUpdateToken = () => {
  useSubscribe("updateToken", (update) => {
    store.createTransaction([designTokensContainer], (tokens) => {
      updateTokenMutable(tokens, update.token, update.name);
    });
  });
};

const useCreateToken = () => {
  useSubscribe("createToken", (token) => {
    store.createTransaction([designTokensContainer], (tokens) => {
      tokens.push(token);
    });
  });
};

const useDeleteToken = () => {
  useSubscribe("deleteToken", (name) => {
    store.createTransaction([designTokensContainer], (tokens) => {
      deleteTokenMutable(tokens, name);
    });
  });
};

const usePreviewStyle = () => {
  useSubscribe("previewStyle", ({ id, updates, breakpoint }) => {
    let rule = getRule(id, breakpoint.id);

    if (rule === undefined) {
      rule = addRule(id, { breakpoint: breakpoint.id, style: {} });
    }

    for (const update of updates) {
      // This is possible on newly created instances, properties are not yet defined in the style.
      if (rule.styleMap.has(update.property) === false) {
        const dynamicStyle = toVarStyleWithFallback(id, {
          [update.property]: update.value,
        });

        rule.styleMap.set(update.property, dynamicStyle[update.property]);
      }

      setCssVar(id, update.property, update.value);
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
