import { useEffect, useLayoutEffect } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Instance,
  getStyleDeclKey,
  type StyleDecl,
  type StyleSourceSelection,
} from "@webstudio-is/sdk";
import {
  collapsedAttribute,
  idAttribute,
  addGlobalRules,
  createImageValueTransformer,
  getPresetStyleRules,
  descendentComponent,
  type Params,
} from "@webstudio-is/react-sdk";
import {
  type VarValue,
  createRegularStyleSheet,
  isValidStaticStyleValue,
  toValue,
} from "@webstudio-is/css-engine";
import {
  $assets,
  $breakpoints,
  $instances,
  $isPreviewMode,
  $props,
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

/**
 * maintain order of rendered stylesheets
 * should be invoked before any subscription
 */
export const mountStyles = () => {
  fontsAndDefaultsSheet.render();
  presetSheet.render();
  userSheet.render();
  stateSheet.render();
  helpersSheet.render();
};

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

const getEphemeralProperty = (styleDecl: StyleDecl) => {
  const { styleSourceId, state = "", property } = styleDecl;
  return `--${styleSourceId}-${state}-${property}`;
};

// wrap normal style value with var(--namespace, value) to support ephemeral styles updates
// between all token usages
const toVarValue = (styleDecl: StyleDecl): undefined | VarValue => {
  const { value } = styleDecl;
  if (value.type === "var") {
    return value;
  }
  // Values like InvalidValue, UnsetValue, VarValue don't need to be wrapped
  if (isValidStaticStyleValue(value)) {
    return {
      type: "var",
      // var style value is relying on name without leading "--"
      // escape complex selectors in state like ":hover"
      // setProperty and removeProperty escape automatically
      value: CSS.escape(getEphemeralProperty(styleDecl).slice(2)),
      fallbacks: [value],
    };
  }
};

const $descendentSelectors = computed(
  [$instances, $props],
  (instances, props) => {
    const parentIdByInstanceId = new Map<Instance["id"], Instance["id"]>();
    const descendentInstanceIds: Instance["id"][] = [];
    for (const instance of instances.values()) {
      if (instance.component === descendentComponent) {
        descendentInstanceIds.push(instance.id);
      }
      for (const child of instance.children) {
        if (child.type === "id") {
          parentIdByInstanceId.set(child.value, instance.id);
        }
      }
    }
    const descendentSelectorByInstanceId = new Map<Instance["id"], string>();
    for (const prop of props.values()) {
      if (prop.name === "selector" && prop.type === "string") {
        descendentSelectorByInstanceId.set(prop.instanceId, prop.value);
      }
    }
    const descendentSelectors = new Map<Instance["id"], string>();
    for (const instanceId of descendentInstanceIds) {
      const parentId = parentIdByInstanceId.get(instanceId);
      const selector = descendentSelectorByInstanceId.get(instanceId);
      if (parentId && selector) {
        descendentSelectors.set(
          instanceId,
          `[${idAttribute}="${parentId}"]${selector}`
        );
      }
    }
    return descendentSelectors;
  }
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
      const rule = userSheet.addMixinRule(styleDecl.styleSourceId);
      rule.setDeclaration({
        breakpoint: styleDecl.breakpointId,
        selector: styleDecl.state ?? "",
        property: styleDecl.property,
        value: toVarValue(styleDecl) ?? styleDecl.value,
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

  const unsubscribeDescendentSelectors = $descendentSelectors.subscribe(
    (descendentSelectors) => {
      let selectorsUpdated = false;
      for (const [instanceId, descendentSelector] of descendentSelectors) {
        // access descendent component rule
        // and change its selector to parent id + selector prop
        const key = `[${idAttribute}="${instanceId}"]`;
        const rule = userSheet.addNestingRule(key);
        // invalidate only when necessary
        if (rule.getSelector() !== descendentSelector) {
          selectorsUpdated = true;
          rule.setSelector(descendentSelector);
        }
      }
      if (selectorsUpdated) {
        renderUserSheetInTheNextFrame();
      }
    }
  );

  return () => {
    unsubscribeBreakpoints();
    unsubscribeStyles();
    unsubscribeStyleSourceSelections();
    unsubscribeDescendentSelectors();
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
};

export const useManageDesignModeStyles = () => {
  useEffect(subscribeStateStyles, []);
  useEffect(subscribeEphemeralStyle, []);
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
    const styleSources = new Set(styleSourceSelections.get(instanceId)?.values);
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
      styles: instanceStyles,
    };
  }
);

/**
 * render currently selected state styles as stateless
 * in separate sheet and clear when state is not selected
 */
const subscribeStateStyles = () => {
  return $instanceStyles.subscribe((instanceStyles) => {
    if (instanceStyles === undefined) {
      stateSheet.clear();
      stateSheet.render();
      return;
    }
    // reset state sheet on every update to avoid stale styles
    stateSheet.clear();
    const { instanceId, breakpoints, styles } = instanceStyles;
    for (const breakpoint of breakpoints.values()) {
      stateSheet.addMediaRule(breakpoint.id, breakpoint);
    }
    const selector = `[${idAttribute}="${instanceId}"]`;
    const rule = stateSheet.addNestingRule(selector);
    for (const styleDecl of styles) {
      rule.setDeclaration({
        breakpoint: styleDecl.breakpointId,
        // render without state
        selector: "",
        property: styleDecl.property,
        value: toVarValue(styleDecl) ?? styleDecl.value,
      });
    }
    stateSheet.setTransformer($transformValue.get());
    stateSheet.render();
  });
};

const subscribeEphemeralStyle = () => {
  // track custom properties added on previous ephemeral update
  const appliedEphemeralDeclarations = new Map<string, StyleDecl>();

  return $ephemeralStyles.subscribe((ephemeralStyles) => {
    const instanceSelector = $selectedInstanceSelector.get();
    if (instanceSelector === undefined) {
      return;
    }
    const [instanceId] = instanceSelector;

    // reset ephemeral styles
    if (ephemeralStyles.length === 0) {
      resetInert();
      for (const styleDecl of appliedEphemeralDeclarations.values()) {
        // prematurely apply last known ephemeral update to user stylesheet
        // to avoid lag because of delay between deleting ephemeral style
        // and sending style patch (and rendering)
        const mixinRule = userSheet.addMixinRule(styleDecl.styleSourceId);
        mixinRule.setDeclaration({
          breakpoint: styleDecl.breakpointId,
          selector: styleDecl.state ?? "",
          property: styleDecl.property,
          value: toVarValue(styleDecl) ?? styleDecl.value,
        });
        document.body.style.removeProperty(getEphemeralProperty(styleDecl));
      }
      userSheet.setTransformer($transformValue.get());
      userSheet.render();
      appliedEphemeralDeclarations.clear();
    }

    // add ephemeral styles
    if (ephemeralStyles.length > 0) {
      setInert();
      const selector = `[${idAttribute}="${instanceId}"]`;
      const rule = userSheet.addNestingRule(selector);
      let ephemetalSheetUpdated = false;
      for (const styleDecl of ephemeralStyles) {
        // update custom property
        document.body.style.setProperty(
          getEphemeralProperty(styleDecl),
          toValue(styleDecl.value, $transformValue.get())
        );
        // render temporary rule for instance with var()
        // rendered with "all" breakpoint and without state
        // to reflect changes in canvas without user interaction
        const styleDeclKey = getStyleDeclKey(styleDecl);
        if (appliedEphemeralDeclarations.has(styleDeclKey) === false) {
          ephemetalSheetUpdated = true;
          const mixinRule = userSheet.addMixinRule(styleDecl.styleSourceId);
          mixinRule.setDeclaration({
            breakpoint: styleDecl.breakpointId,
            selector: styleDecl.state ?? "",
            property: styleDecl.property,
            value: toVarValue(styleDecl) ?? styleDecl.value,
          });
          // add local style source when missing to support
          // ephemeral styles on newly created instances
          rule.addMixin(styleDecl.styleSourceId);

          // temporary render var() in state sheet as well
          if (styleDecl.state !== undefined) {
            const stateRule = stateSheet.addNestingRule(selector);
            stateRule.setDeclaration({
              breakpoint: styleDecl.breakpointId,
              // render without state
              selector: "",
              property: styleDecl.property,
              value: toVarValue(styleDecl) ?? styleDecl.value,
            });
          }
        }
        appliedEphemeralDeclarations.set(styleDeclKey, styleDecl);
      }
      // avoid stylesheet rerendering on every ephemeral update
      if (ephemetalSheetUpdated) {
        userSheet.render();
        stateSheet.render();
      }
    }
  });
};
