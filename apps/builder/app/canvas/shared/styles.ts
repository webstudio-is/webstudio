import { useLayoutEffect } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Instance,
  ROOT_INSTANCE_ID,
  getStyleDeclKey,
  descendantComponent,
  rootComponent,
  type Breakpoint,
  type StyleDecl,
  type StyleSourceSelection,
  createImageValueTransformer,
  addFontRules,
} from "@webstudio-is/sdk";
import { collapsedAttribute, idAttribute } from "@webstudio-is/react-sdk";
import { isPseudoElement } from "@webstudio-is/css-data";
import {
  StyleValue,
  type StyleSheetRegular,
  type TransformValue,
  type VarValue,
  createRegularStyleSheet,
  hyphenateProperty,
  toValue,
  toVarFallback,
} from "@webstudio-is/css-engine";
import {
  $assets,
  $breakpoints,
  $instances,
  $props,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedStyleState,
  $styleSourceSelections,
  $styles,
  assetBaseUrl,
} from "~/shared/nano-states";
import { setDifference } from "~/shared/shim";
import { $ephemeralStyles } from "../stores";
import { canvasApi } from "~/shared/canvas-api";
import { $selectedInstance, $selectedPage } from "~/shared/awareness";
import { findAllEditableInstanceSelector } from "~/shared/instance-utils";
import type { InstanceSelector } from "~/shared/tree-utils";
import { getAllElementsByInstanceSelector } from "~/shared/dom-utils";
import { createComputedStyleDeclStore } from "~/builder/features/style-panel/shared/model";

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

export const editablePlaceholderAttribute = "data-ws-editable-placeholder";
// @todo replace with modern typed attr() when supported in all browsers
// see the second edge case
// https://developer.mozilla.org/en-US/docs/Web/CSS/attr#backwards_compatibility
export const editingPlaceholderVariable = "--ws-editing-placeholder";

// Minimum size to prevent elements from collapsing to zero dimensions on canvas
// This value provides enough visual space to see and interact with empty elements
const collapsePadding = "50px";

const hasExpressionChildren = (instance: Instance) =>
  instance.children.some((child) => child.type === "expression");

const helperStylesShared = [
  // Display a placeholder text for elements that are editable but currently empty
  `:is([${editablePlaceholderAttribute}]):empty::before {
    content: attr(${editablePlaceholderAttribute});
    opacity: 0.3;
  }
  `,

  // Display a placeholder text for elements that are editing but empty (Lexical adds p>br children)
  `:is([${editablePlaceholderAttribute}])[contenteditable] > p:only-child:has(br:only-child) {
    position: relative;
    display: block;
    &:after {
      content: var(${editingPlaceholderVariable});
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      /* Ensures placeholder text is visible even in narrow containers */
      min-width: 100px;
      opacity: 0.3;
    }
  }
  `,

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
    padding-right: ${collapsePadding};
  }`,
  // Has no height, will collapse
  `[${idAttribute}]:where(:not(body):not([data-lexical-editor])[${collapsedAttribute}="h"]) {
    padding-top: ${collapsePadding};
  }`,
  // Has no width or height, will collapse
  `[${idAttribute}]:where(:not(body):not([data-lexical-editor])[${collapsedAttribute}="wh"]) {
    padding-right: ${collapsePadding};
    padding-top: ${collapsePadding};
  }`,
  `[${idAttribute}][contenteditable], [${idAttribute}]:focus {
    outline: 0;
  }`,
  `[${idAttribute}][contenteditable] {
    box-shadow: 0 0 0 4px rgb(36 150 255 / 20%)
  }`,
];

// Common user-select and cursor rules for canvas modes
const helperStylesUserSelect = [
  // When double clicking into an element to edit text, it should not select the word.
  `[${idAttribute}] {
    user-select: none;
    /* Safari */
    -webkit-user-select: none;
    cursor: default;
  }`,
  `[${idAttribute}][contenteditable] {
    /* Safari */
    cursor: initial;
  }`,
];

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
const helperStyles = [...helperStylesUserSelect, ...helperStylesShared];

// Find all editable elements and set cursor text inside
const helperStylesContentEdit = [
  ...helperStylesUserSelect,
  ...helperStylesShared,
];

const subscribeDesignModeHelperStyles = () => {
  helpersSheet.setAttribute("media", "all");

  for (const style of helperStyles) {
    helpersSheet.addPlaintextRule(style);
  }
  helpersSheet.render();

  return () => {
    helpersSheet.clear();
    helpersSheet.render();
  };
};

/**
 * Compute CSS rules for editable elements in content edit mode.
 * Groups selectors into chunks to avoid overly long :is() selectors.
 */
const computeEditableCursorRules = (
  editableInstanceSelectors: InstanceSelector[],
  instances: Map<Instance["id"], Instance>
) => {
  const rules: string[] = [];
  // 20 is arbitrary but keeps selector length reasonable
  const chunkSize = 20;
  for (let i = 0; i < editableInstanceSelectors.length; i += chunkSize) {
    const chunk = editableInstanceSelectors
      .slice(i, i + chunkSize)
      .filter((selector) => {
        const instance = instances.get(selector[0]);
        if (instance === undefined) {
          return false;
        }
        // Instances with expression children are not directly editable
        return hasExpressionChildren(instance) === false;
      });
    if (chunk.length === 0) {
      continue;
    }
    const selectors = chunk.map(
      (selector) => `[${idAttribute}="${selector[0]}"]`
    );
    rules.push(
      `:is(${selectors.join(", ")}), :is(${selectors.join(", ")}) a { cursor: text; }`
    );
  }
  return rules;
};

const subscribeContentEditModeHelperStyles = () => {
  const renderHelperStyles = () => {
    helpersSheet.clear();
    helpersSheet.setAttribute("media", "all");

    for (const style of helperStylesContentEdit) {
      helpersSheet.addPlaintextRule(style);
    }

    // Show text cursor on all editable elements (including links and buttons)
    // to indicate they are editable in the content editor mode
    //
    // @todo Consider setting cursor: pointer on non-editable elements by default
    // to better distinguish clickable vs editable elements, needs more investigation
    const rootInstanceId = $selectedPage.get()?.rootInstanceId;
    if (rootInstanceId !== undefined) {
      const editableInstanceSelectors: InstanceSelector[] = [];
      const instances = $instances.get();

      findAllEditableInstanceSelector({
        instanceSelector: [rootInstanceId],
        instances,
        props: $props.get(),
        metas: $registeredComponentMetas.get(),
        results: editableInstanceSelectors,
      });

      for (const rule of computeEditableCursorRules(
        editableInstanceSelectors,
        instances
      )) {
        helpersSheet.addPlaintextRule(rule);
      }
    }

    helpersSheet.render();
  };

  renderHelperStyles();

  const requestIdleCallbackFn =
    globalThis.requestIdleCallback ?? requestAnimationFrame;
  const cancelIdleCallbackFn =
    globalThis.cancelIdleCallback ?? cancelAnimationFrame;

  let idleId: number;
  const renderHelperStylesIdle = () => {
    cancelIdleCallbackFn(idleId);
    idleId = requestIdleCallbackFn(renderHelperStyles);
  };

  const unsubscribeInstances = $instances.listen(renderHelperStylesIdle);
  const unsubscribeSelectedPage = $selectedPage.listen(renderHelperStylesIdle);

  return () => {
    unsubscribeInstances();
    unsubscribeSelectedPage();
    helpersSheet.clear();
    helpersSheet.render();
  };
};

// keep stable transformValue in store
// to preserve cache in css engine
const $transformValue = computed($assets, (assets) =>
  createImageValueTransformer(assets, {
    assetBaseUrl,
  })
);

const getEphemeralProperty = (
  styleDecl: Pick<StyleDecl, "styleSourceId" | "state" | "property">
) => {
  const { styleSourceId, state = "", property } = styleDecl;
  return `--${styleSourceId}-${state}-${property}`;
};

// wrap normal style value with var(--namespace, value) to support ephemeral styles updates
// between all token usages
const toVarValue = (
  styleDecl: StyleDecl,
  transformValue: TransformValue,
  fallback?: StyleValue
): VarValue => {
  return {
    type: "var",
    // var style value is relying on name without leading "--"
    // escape complex selectors in state like ":hover"
    // setProperty and removeProperty escape automatically
    value: CSS.escape(getEphemeralProperty(styleDecl).slice(2)),
    fallback: fallback
      ? toVarFallback(fallback, transformValue)
      : toVarFallback(styleDecl.value, transformValue),
  };
};

const computeDescendantSelectors = <
  P extends { instanceId: string; name: string; type: string; value?: unknown },
>(
  instances: Map<Instance["id"], Instance>,
  props: Map<string, P>
) => {
  const parentIdByInstanceId = new Map<Instance["id"], Instance["id"]>();
  const descendantInstanceIds: Instance["id"][] = [];
  for (const instance of instances.values()) {
    if (instance.component === descendantComponent) {
      descendantInstanceIds.push(instance.id);
    }
    for (const child of instance.children) {
      if (child.type === "id") {
        parentIdByInstanceId.set(child.value, instance.id);
      }
    }
  }
  const descendantSelectorByInstanceId = new Map<Instance["id"], string>();
  for (const prop of props.values()) {
    if (prop.name === "selector" && prop.type === "string") {
      descendantSelectorByInstanceId.set(prop.instanceId, prop.value as string);
    }
  }
  const descendantSelectors = new Map<Instance["id"], string>();
  for (const instanceId of descendantInstanceIds) {
    const parentId = parentIdByInstanceId.get(instanceId);
    const selector = descendantSelectorByInstanceId.get(instanceId);
    if (parentId && selector) {
      descendantSelectors.set(
        instanceId,
        `[${idAttribute}="${parentId}"]${selector}`
      );
    }
  }
  return descendantSelectors;
};

/**
 * Convert StyleDecl to declaration params for sheet operations.
 */
const toDeclarationParams = (styleDecl: StyleDecl) => ({
  breakpoint: styleDecl.breakpointId,
  selector: styleDecl.state ?? "",
  property: styleDecl.property,
});

/**
 * Compute added and deleted styles by comparing current styles with previous.
 * Returns new prevStylesSet to track for next diff.
 */
const computeStylesDiff = ({
  styles,
  transformValue,
  prevStylesSet,
  prevTransformValue,
}: {
  styles: Map<string, StyleDecl>;
  transformValue: TransformValue;
  prevStylesSet: Set<StyleDecl>;
  prevTransformValue: TransformValue | undefined;
}) => {
  // invalidate styles cache when assets are changed
  let effectivePrevStyles = prevStylesSet;
  if (prevTransformValue !== transformValue) {
    effectivePrevStyles = new Set();
  }
  const stylesSet = new Set(styles.values());
  const addedStyles = setDifference(stylesSet, effectivePrevStyles);
  const deletedStyles = setDifference(effectivePrevStyles, stylesSet);
  return { addedStyles, deletedStyles, nextPrevStylesSet: stylesSet };
};

/**
 * Convert instance ID to CSS selector.
 * ROOT_INSTANCE_ID maps to ":root", others to attribute selector.
 */
const getInstanceSelector = (instanceId: string) =>
  instanceId === ROOT_INSTANCE_ID
    ? ":root"
    : `[${idAttribute}="${instanceId}"]`;

/**
 * Convert component and tag to preset CSS selector.
 * rootComponent maps to ":root", others use :where() for low specificity.
 */
const getPresetStyleSelector = (component: string, tag: string) =>
  component === rootComponent
    ? ":root"
    : `${tag}:where([data-ws-component="${component}"])`;

const $descendantSelectors = computed(
  [$instances, $props],
  computeDescendantSelectors
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

  const unsubscribeTransformValue = $transformValue.subscribe(() => {
    renderUserSheetInTheNextFrame();
  });

  // add/delete declarations in mixins
  let prevStylesSet = new Set<StyleDecl>();
  let prevTransformValue: undefined | TransformValue;
  // track value transformer to properly serialize var() fallback as unparsed
  // before it was managed css engine but here toValue is invoked by styles renderer directly
  const unsubscribeStyles = computed(
    [$styles, $transformValue],
    (styles, transformValue) => [styles, transformValue] as const
  ).subscribe(([styles, transformValue]) => {
    const { addedStyles, deletedStyles, nextPrevStylesSet } = computeStylesDiff(
      {
        styles,
        transformValue,
        prevStylesSet,
        prevTransformValue,
      }
    );
    prevTransformValue = transformValue;
    prevStylesSet = nextPrevStylesSet;
    // delete before adding declarations by the same key
    for (const styleDecl of deletedStyles) {
      const rule = userSheet.addMixinRule(styleDecl.styleSourceId);
      rule.deleteDeclaration(toDeclarationParams(styleDecl));
    }
    for (const styleDecl of addedStyles) {
      const rule = userSheet.addMixinRule(styleDecl.styleSourceId);
      rule.setDeclaration({
        ...toDeclarationParams(styleDecl),
        value: toVarValue(styleDecl, transformValue),
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
        const rule = userSheet.addNestingRule(getInstanceSelector(instanceId));
        rule.applyMixins(values);
      }
      renderUserSheetInTheNextFrame();
    }
  );

  const unsubscribeDescendantSelectors = $descendantSelectors.subscribe(
    (descendantSelectors) => {
      let selectorsUpdated = false;
      for (const [instanceId, descendantSelector] of descendantSelectors) {
        // access descendant component rule
        // and change its selector to parent id + selector prop
        const key = `[${idAttribute}="${instanceId}"]`;
        const rule = userSheet.addNestingRule(key);
        // invalidate only when necessary
        if (rule.getSelector() !== descendantSelector) {
          selectorsUpdated = true;
          rule.setSelector(descendantSelector);
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
    unsubscribeDescendantSelectors();
    unsubscribeTransformValue();
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
};

export const manageContentEditModeStyles = ({
  signal,
}: {
  signal: AbortSignal;
}) => {
  const unsubscribePreviewMode = subscribeContentEditModeHelperStyles();
  signal.addEventListener("abort", () => {
    unsubscribePreviewMode();
  });
};

export const manageDesignModeStyles = ({ signal }: { signal: AbortSignal }) => {
  const unsubscribeStateStyles = subscribeStateStyles();
  const unsubscribeEphemeralStyle = subscribeEphemeralStyle();
  const unsubscribePreviewMode = subscribeDesignModeHelperStyles();
  signal.addEventListener("abort", () => {
    unsubscribeStateStyles();
    unsubscribeEphemeralStyle();
    unsubscribePreviewMode();
  });
};

export const GlobalStyles = () => {
  const assets = useStore($assets);
  const metas = useStore($registeredComponentMetas);

  useLayoutEffect(() => {
    fontsAndDefaultsSheet.clear();
    addFontRules({
      sheet: fontsAndDefaultsSheet,
      assets,
      assetBaseUrl,
    });
    fontsAndDefaultsSheet.render();
  }, [assets]);

  useLayoutEffect(() => {
    presetSheet.clear();
    presetSheet.addMediaRule("presets");
    for (const [component, meta] of metas) {
      for (const [tag, styles] of Object.entries(meta.presetStyle ?? {})) {
        const rule = presetSheet.addNestingRule(
          getPresetStyleSelector(component, tag)
        );
        for (const declaration of styles) {
          rule.setDeclaration({
            breakpoint: "presets",
            selector: declaration.state ?? "",
            property: declaration.property,
            value: declaration.value,
          });
        }
      }
    }
    presetSheet.render();
  }, [metas]);

  return null;
};

const computeInstanceStyles = ({
  selectedInstance,
  selectedStyleState,
  breakpoints,
  styleSourceSelections,
  styles,
}: {
  selectedInstance: Instance | undefined;
  selectedStyleState: string | undefined;
  breakpoints: Map<string, Breakpoint>;
  styleSourceSelections: Map<string, { values: string[] }>;
  styles: Map<string, StyleDecl>;
}) => {
  if (selectedInstance === undefined || selectedStyleState === undefined) {
    return;
  }
  const styleSources = new Set(
    styleSourceSelections.get(selectedInstance.id)?.values
  );
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
    instanceId: selectedInstance.id,
    selectedState: selectedStyleState,
    breakpoints: Array.from(breakpoints.values()),
    styles: instanceStyles,
  };
};

const $instanceStyles = computed(
  [
    $selectedInstance,
    $selectedStyleState,
    $breakpoints,
    $styleSourceSelections,
    $styles,
  ],
  (
    selectedInstance,
    selectedStyleState,
    breakpoints,
    styleSourceSelections,
    styles
  ) =>
    computeInstanceStyles({
      selectedInstance,
      selectedStyleState,
      breakpoints,
      styleSourceSelections,
      styles,
    })
);

/**
 * Render state styles to a stylesheet.
 *
 * For pseudo-classes like :hover, render without state so users can preview
 * the styles without triggering the state.
 * For pseudo-elements like ::before, keep the selector so styles apply
 * to the pseudo-element, not the parent.
 */
const renderStateStyles = ({
  instanceStyles,
  sheet,
  transformValue,
  toStyleValue,
}: {
  instanceStyles: ReturnType<typeof $instanceStyles.get>;
  sheet: StyleSheetRegular;
  transformValue: TransformValue;
  toStyleValue: (
    styleDecl: StyleDecl,
    transformValue: TransformValue
  ) => StyleValue;
}) => {
  sheet.clear();
  if (instanceStyles === undefined) {
    sheet.render();
    return;
  }
  const { instanceId, selectedState, breakpoints, styles } = instanceStyles;
  for (const breakpoint of breakpoints) {
    sheet.addMediaRule(breakpoint.id, breakpoint);
  }
  const selector = `[${idAttribute}="${instanceId}"]`;
  const rule = sheet.addNestingRule(selector);
  const stateSelector = isPseudoElement(selectedState) ? selectedState : "";
  for (const styleDecl of styles) {
    rule.setDeclaration({
      breakpoint: styleDecl.breakpointId,
      selector: stateSelector,
      property: styleDecl.property,
      value: toStyleValue(styleDecl, transformValue),
    });
  }
  sheet.setTransformer(transformValue);
  sheet.render();
};

/**
 * render currently selected state styles as stateless
 * in separate sheet and clear when state is not selected
 */
const subscribeStateStyles = () => {
  return $instanceStyles.subscribe((instanceStyles) => {
    renderStateStyles({
      instanceStyles,
      sheet: stateSheet,
      transformValue: $transformValue.get(),
      toStyleValue: (styleDecl, transformValue) =>
        toVarValue(styleDecl, transformValue),
    });
  });
};

const subscribeEphemeralStyle = () => {
  // track custom properties added on previous ephemeral update
  const appliedEphemeralDeclarations = new Map<
    string,
    [StyleDecl, HTMLElement[]]
  >();

  return $ephemeralStyles.subscribe((ephemeralStyles) => {
    const instance = $selectedInstance.get();
    const instanceSelector = $selectedInstanceSelector.get();

    if (instance === undefined || instanceSelector === undefined) {
      return;
    }

    // reset ephemeral styles
    if (ephemeralStyles.length === 0) {
      canvasApi.resetInert();

      for (const [
        styleDecl,
        elements,
      ] of appliedEphemeralDeclarations.values()) {
        document.documentElement.style.removeProperty(
          getEphemeralProperty(styleDecl)
        );

        for (const element of elements) {
          element.style.removeProperty(getEphemeralProperty(styleDecl));
        }
      }
      userSheet.setTransformer($transformValue.get());
      userSheet.render();
      appliedEphemeralDeclarations.clear();
    }

    // add ephemeral styles
    if (ephemeralStyles.length > 0) {
      canvasApi.setInert();
      const selector = getInstanceSelector(instance.id);
      const rule = userSheet.addNestingRule(selector);
      let ephemeralSheetUpdated = false;
      for (const styleDecl of ephemeralStyles) {
        // update custom property
        document.documentElement.style.setProperty(
          getEphemeralProperty(styleDecl),
          toValue(styleDecl.value, $transformValue.get())
        );

        // We need to apply the custom property to the selected element as well.
        // Otherwise, variables defined on it will not be visible on documentElement.
        const elements = getAllElementsByInstanceSelector(instanceSelector);
        for (const element of elements) {
          element.style.setProperty(
            getEphemeralProperty(styleDecl),
            toValue(styleDecl.value, $transformValue.get())
          );
        }

        // Lazily add a rule to the user stylesheet (it might not be created yet if no styles have been added to the instance property).
        const styleDeclKey = getStyleDeclKey(styleDecl);
        if (appliedEphemeralDeclarations.has(styleDeclKey) === false) {
          ephemeralSheetUpdated = true;

          const mixinRule = userSheet.addMixinRule(styleDecl.styleSourceId);

          // Use the actual style value as a fallback (non-ephemeral); see the "Lazy" comment above.
          const computedStyleDecl = createComputedStyleDeclStore(
            hyphenateProperty(styleDecl.property)
          ).get();

          const value = toVarValue(
            styleDecl,
            $transformValue.get(),
            computedStyleDecl.cascadedValue
          );

          mixinRule.setDeclaration({
            ...toDeclarationParams(styleDecl),
            value,
          });

          rule.addMixin(styleDecl.styleSourceId);

          // When editing state styles (e.g., :hover), also render var() in stateSheet
          // so ephemeral updates are visible in the state preview
          if (styleDecl.state !== undefined) {
            const stateRule = stateSheet.addNestingRule(selector);
            // For pseudo-elements (::before, ::after), keep the selector so styles
            // apply to the pseudo-element. For pseudo-classes (:hover, :focus),
            // render without state so users can preview without triggering the state.
            const stateSelector = isPseudoElement(styleDecl.state)
              ? styleDecl.state
              : "";
            stateRule.setDeclaration({
              breakpoint: styleDecl.breakpointId,
              selector: stateSelector,
              property: styleDecl.property,
              value,
            });
          }
        }
        appliedEphemeralDeclarations.set(styleDeclKey, [styleDecl, elements]);
      }
      // avoid stylesheet rerendering on every ephemeral update
      if (ephemeralSheetUpdated) {
        userSheet.render();
        stateSheet.render();
      }
    }
  });
};

export const __testing__ = {
  getEphemeralProperty,
  getInstanceSelector,
  getPresetStyleSelector,
  computeDescendantSelectors,
  computeInstanceStyles,
  computeEditableCursorRules,
  computeStylesDiff,
  toDeclarationParams,
  renderStateStyles,
};
