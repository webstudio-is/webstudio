import { useEffect, useLayoutEffect } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import type { StyleDecl, StyleSourceSelection } from "@webstudio-is/sdk";
import {
  collapsedAttribute,
  idAttribute,
  addGlobalRules,
  createImageValueTransformer,
  getPresetStyleRules,
  type Params,
} from "@webstudio-is/react-sdk";
import {
  type StyleValue,
  type StyleProperty,
  type VarValue,
  isValidStaticStyleValue,
  createRegularStyleSheet,
  toValue,
} from "@webstudio-is/css-engine";
import {
  $assets,
  $breakpoints,
  $isPreviewMode,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedStyleState,
  $styleSourceSelections,
  $styles,
} from "~/shared/nano-states";
import { setDifference } from "~/shared/shim";
import { $ephemeralStyles, $params } from "../stores";
import { resetInert, setInert } from "./inert";

const userSheet = createRegularStyleSheet({ name: "user-styles" });
const stateSheet = createRegularStyleSheet({ name: "state-styles" });
const helpersSheet = createRegularStyleSheet({ name: "helpers" });
const fontsAndDefaultsSheet = createRegularStyleSheet({
  name: "fonts-and-defaults",
});
const presetSheet = createRegularStyleSheet({ name: "preset-styles" });

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
    helpersSheet.setAttribute("media", isPreviewMode ? "not all" : "all");
    if (isRendered === false) {
      for (const style of helperStyles) {
        helpersSheet.addPlaintextRule(style);
      }
      helpersSheet.render();
      isRendered = true;
    }
  });

  return () => {
    helpersSheet.clear();
    helpersSheet.render();
    unsubscribe();
    isRendered = false;
  };
};

// keep stable transformValue in store
// to preserve cache in css engine
const $transformValue = computed([$assets, $params], (assets, params) =>
  createImageValueTransformer(assets, {
    assetBaseUrl: params?.assetBaseUrl ?? "",
  })
);

/**
 * track new or deleted styles and style source selections items
 * and update style sheet accordingly
 */
export const subscribeStyles = () => {
  let animationFrameId: undefined | number;

  const renderUserSheetInTheNextFrame = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(() => {
      userSheet.setTransformer($transformValue.get());
      userSheet.render();
    });
  };

  const unsubscribeBreakpoints = $breakpoints.subscribe((breakpoints) => {
    for (const breakpoint of breakpoints.values()) {
      userSheet.addMediaRule(breakpoint.id, breakpoint);
    }
    renderUserSheetInTheNextFrame();
  });

  // add/delete declarations in mixins
  let prevStylesSet = new Set<StyleDecl>();
  const unsubscribeStyles = $styles.subscribe((styles) => {
    const stylesSet = new Set(styles.values());
    const addedStyles = setDifference(stylesSet, prevStylesSet);
    const deletedStyles = setDifference(prevStylesSet, stylesSet);
    prevStylesSet = stylesSet;
    // delete before adding declaraions by the same key
    for (const styleDecl of deletedStyles) {
      const rule = userSheet.addMixinRule(styleDecl.styleSourceId);
      rule.deleteDeclaration({
        breakpoint: styleDecl.breakpointId,
        selector: styleDecl.state ?? "",
        property: styleDecl.property,
      });
    }
    for (const styleDecl of addedStyles) {
      const { styleSourceId, property, value } = styleDecl;
      const rule = userSheet.addMixinRule(styleSourceId);
      rule.setDeclaration({
        breakpoint: styleDecl.breakpointId,
        selector: styleDecl.state ?? "",
        property,
        value: toVarValue(styleSourceId, property, value) ?? value,
      });
    }
    renderUserSheetInTheNextFrame();
  });

  // apply mixins to nesting rules
  let prevSelectionsSet = new Set<StyleSourceSelection>();
  const unsubscribeStyleSourceSelections = $styleSourceSelections.subscribe(
    (styleSourceSelections) => {
      const selectionsSet = new Set(styleSourceSelections.values());
      const addedSelections = setDifference(selectionsSet, prevSelectionsSet);
      prevSelectionsSet = selectionsSet;
      for (const { instanceId, values } of addedSelections) {
        const selector = `[${idAttribute}="${instanceId}"]`;
        const rule = userSheet.addNestingRule(selector);
        rule.applyMixins(values);
      }
      renderUserSheetInTheNextFrame();
    }
  );

  return () => {
    unsubscribeBreakpoints();
    unsubscribeStyles();
    unsubscribeStyleSourceSelections();
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
};

const subscribeEphemeralStyle = () => {
  // track custom properties added on previous ephemeral update
  const appliedEphemeralDeclarations = new Map<string, StyleDecl>();

  return $ephemeralStyles.subscribe((ephemeralStyles) => {
    if (ephemeralStyles.length > 0) {
      setInert();
    } else {
      resetInert();
    }

    // track custom properties not set on this change
    const finishedEphemeralDeclarations = new Map(appliedEphemeralDeclarations);

    const transformValue = $transformValue.get();

    for (const styleDecl of ephemeralStyles) {
      const { styleSourceId, breakpointId, state, property, value } = styleDecl;
      const key = `${styleSourceId}:${breakpointId}:${state ?? ""}:${property}`;
      const customProperty = `--${
        toVarValue(styleSourceId, property, value)?.value ?? "invalid-property"
      }`;

      document.body.style.setProperty(
        customProperty,
        toValue(value, transformValue)
      );
      appliedEphemeralDeclarations.set(key, styleDecl);
      finishedEphemeralDeclarations.delete(key);

      const rule = userSheet.addMixinRule(styleSourceId);
      rule.setDeclaration({
        breakpoint: breakpointId,
        selector: state ?? "",
        property,
        value: toVarValue(styleSourceId, property, value) ?? value,
      });
    }

    for (const styleDecl of finishedEphemeralDeclarations.values()) {
      const { styleSourceId, breakpointId, state, property, value } = styleDecl;
      const key = `${styleSourceId}:${breakpointId}:${state ?? ""}:${property}`;
      appliedEphemeralDeclarations.delete(key);
      document.body.style.removeProperty(property);
      // prematurely apply last known ephemeral update to user stylesheet
      // to avoid lag because of delay between deleting ephemeral style
      // and sending style patch (and rendering)
      const rule = userSheet.addMixinRule(styleSourceId);
      rule.setDeclaration({
        breakpoint: breakpointId,
        selector: state ?? "",
        property,
        value: toVarValue(styleSourceId, property, value) ?? value,
      });
    }

    // avoid rerendering stylesheet on every ephemeral update
    if (finishedEphemeralDeclarations.size !== 0) {
    userSheet.setTransformer($transformValue.get());
      userSheet.render();
    }
  });
};

export const useManageDesignModeStyles = () => {
  useEffect(subscribeEphemeralStyle, []);
  useEffect(subscribeStateStyles, []);
  useEffect(subscribePreviewMode, []);
};

export const GlobalStyles = ({ params }: { params: Params }) => {
  const assets = useStore($assets);
  const metas = useStore($registeredComponentMetas);

  useLayoutEffect(() => {
    fontsAndDefaultsSheet.clear();
    addGlobalRules(fontsAndDefaultsSheet, {
      assets,
      assetBaseUrl: params.assetBaseUrl,
    });
    fontsAndDefaultsSheet.render();
  }, [assets, params.assetBaseUrl]);

  useLayoutEffect(() => {
    presetSheet.clear();
    for (const [component, meta] of metas) {
      const presetStyle = meta.presetStyle;
      if (presetStyle === undefined) {
        continue;
      }
      const rules = getPresetStyleRules(component, presetStyle);
      for (const [selector, style] of rules) {
        presetSheet.addStyleRule({ style }, selector);
      }
    }
    presetSheet.render();
  }, [metas]);

  return null;
};

const $instanceStyles = computed(
  [
    $selectedInstanceSelector,
    $selectedStyleState,
    $breakpoints,
    $styleSourceSelections,
    $styles,
  ],
  (
    selectedInstanceSelector,
    selectedStyleState,
    breakpoints,
    styleSourceSelections,
    styles
  ) => {
    if (
      selectedInstanceSelector === undefined ||
      selectedStyleState === undefined
    ) {
      return;
    }
    const [instanceId] = selectedInstanceSelector;
    const selection = styleSourceSelections.get(instanceId);
    if (selection === undefined) {
      return;
    }
    const styleSources = new Set(selection.values);
    const instanceStyles: StyleDecl[] = [];
    for (const styleDecl of styles.values()) {
      if (
        styleDecl.state === selectedStyleState &&
        styleSources.has(styleDecl.styleSourceId)
      ) {
        instanceStyles.push(styleDecl);
      }
    }
    return {
      instanceId,
      breakpoints: Array.from(breakpoints.values()),
      styleSourceIds: selection.values,
      styles: instanceStyles,
    };
  }
);

/**
 * render currently selected state styles as stateless
 * in separate sheet and clear when state is not selected
 */
export const subscribeStateStyles = () => {
  return $instanceStyles.subscribe((instanceStyles) => {
    stateSheet.setTransformer($transformValue.get());
    if (instanceStyles === undefined) {
      stateSheet.clear();
      stateSheet.render();
      return;
    }
    const { instanceId, breakpoints, styleSourceIds, styles } = instanceStyles;
    for (const breakpoint of breakpoints.values()) {
      stateSheet.addMediaRule(breakpoint.id, breakpoint);
    }
    for (const styleDecl of styles) {
      const { styleSourceId, property, value } = styleDecl;
      const rule = stateSheet.addMixinRule(styleSourceId);
      rule.setDeclaration({
        breakpoint: styleDecl.breakpointId,
        // render without state
        selector: "",
        property,
        value: toVarValue(styleSourceId, property, value) ?? value,
      });
    }
    const selector = `[${idAttribute}="${instanceId}"]`;
    const rule = stateSheet.addNestingRule(selector);
    rule.applyMixins(styleSourceIds);
    stateSheet.render();
  });
};

// Wrapps a normal StyleValue into a VarStyleValue that uses the previous style value as a fallback and allows
// to quickly pass the values over CSS variable witout rerendering the components tree.
// Results in values like this: `var(--namespace, staticValue)`
const toVarValue = (
  styleSourceId: StyleDecl["styleSourceId"],
  styleProperty: StyleProperty,
  styleValue: StyleValue
): undefined | VarValue => {
  if (styleValue.type === "var") {
    return styleValue;
  }
  // Values like InvalidValue, UnsetValue, VarValue don't need to be wrapped
  if (isValidStaticStyleValue(styleValue)) {
    return {
      type: "var",
      value: `${styleProperty}-${styleSourceId}`,
      fallbacks: [styleValue],
    };
  }
};
