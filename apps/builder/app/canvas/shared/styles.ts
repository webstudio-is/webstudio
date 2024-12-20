import { useLayoutEffect } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Instance,
  ROOT_INSTANCE_ID,
  getStyleDeclKey,
  type StyleDecl,
  type StyleSourceSelection,
} from "@webstudio-is/sdk";
import {
  collapsedAttribute,
  idAttribute,
  addGlobalRules,
  createImageValueTransformer,
  descendantComponent,
  rootComponent,
} from "@webstudio-is/react-sdk";
import {
  type TransformValue,
  type VarValue,
  createRegularStyleSheet,
  toValue,
  toVarFallback,
} from "@webstudio-is/css-engine";
import {
  $assets,
  $breakpoints,
  $instances,
  $props,
  $registeredComponentMetas,
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

const helperStylesShared = [
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
  ...helperStylesShared,
];

// Find all editable elements and set cursor text inside
const helperStylesContentEdit = [
  `[${idAttribute}] {
  user-select: none;
}`,
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

      findAllEditableInstanceSelector(
        [rootInstanceId],
        instances,
        $registeredComponentMetas.get(),
        editableInstanceSelectors
      );

      // Group IDs into chunks of 20 since :is() allows for more efficient grouping
      const chunkSize = 20;
      for (let i = 0; i < editableInstanceSelectors.length; i += chunkSize) {
        const chunk = editableInstanceSelectors
          .slice(i, i + chunkSize)
          .filter((selector) => {
            const instance = instances.get(selector[0]);
            if (instance === undefined) {
              return false;
            }

            const hasExpressionChildren = instance.children.some(
              (child) => child.type === "expression"
            );

            if (hasExpressionChildren) {
              return false;
            }

            return true;
          });

        const selectors = chunk.map(
          (selector) => `[${idAttribute}="${selector[0]}"]`
        );

        helpersSheet.addPlaintextRule(
          `:is(${selectors.join(", ")}), :is(${selectors.join(", ")}) a { cursor: text; }`
        );
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

const getEphemeralProperty = (styleDecl: StyleDecl) => {
  const { styleSourceId, state = "", property } = styleDecl;
  return `--${styleSourceId}-${state}-${property}`;
};

// wrap normal style value with var(--namespace, value) to support ephemeral styles updates
// between all token usages
const toVarValue = (
  styleDecl: StyleDecl,
  transformValue: TransformValue
): undefined | VarValue => {
  return {
    type: "var",
    // var style value is relying on name without leading "--"
    // escape complex selectors in state like ":hover"
    // setProperty and removeProperty escape automatically
    value: CSS.escape(getEphemeralProperty(styleDecl).slice(2)),
    fallback: toVarFallback(styleDecl.value, transformValue),
  };
};

const $descendantSelectors = computed(
  [$instances, $props],
  (instances, props) => {
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
        descendantSelectorByInstanceId.set(prop.instanceId, prop.value);
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
    // invalidate styles cache when assets are changed
    if (prevTransformValue !== transformValue) {
      prevTransformValue = transformValue;
      prevStylesSet = new Set();
    }
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
        value: toVarValue(styleDecl, transformValue) ?? styleDecl.value,
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
        const selector =
          instanceId === ROOT_INSTANCE_ID
            ? ":root"
            : `[${idAttribute}="${instanceId}"]`;
        const rule = userSheet.addNestingRule(selector);
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
    addGlobalRules(fontsAndDefaultsSheet, {
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
        const selector =
          component === rootComponent
            ? ":root"
            : `${tag}:where([data-ws-component="${component}"])`;
        const rule = presetSheet.addNestingRule(selector);
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
  ) => {
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
        value: toVarValue(styleDecl, $transformValue.get()) ?? styleDecl.value,
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
    const instance = $selectedInstance.get();
    if (instance === undefined) {
      return;
    }

    // reset ephemeral styles
    if (ephemeralStyles.length === 0) {
      canvasApi.resetInert();
      for (const styleDecl of appliedEphemeralDeclarations.values()) {
        // prematurely apply last known ephemeral update to user stylesheet
        // to avoid lag because of delay between deleting ephemeral style
        // and sending style patch (and rendering)
        const mixinRule = userSheet.addMixinRule(styleDecl.styleSourceId);
        mixinRule.setDeclaration({
          breakpoint: styleDecl.breakpointId,
          selector: styleDecl.state ?? "",
          property: styleDecl.property,
          value:
            toVarValue(styleDecl, $transformValue.get()) ?? styleDecl.value,
        });
        document.documentElement.style.removeProperty(
          getEphemeralProperty(styleDecl)
        );
      }
      userSheet.setTransformer($transformValue.get());
      userSheet.render();
      appliedEphemeralDeclarations.clear();
    }

    // add ephemeral styles
    if (ephemeralStyles.length > 0) {
      canvasApi.setInert();
      const selector = `[${idAttribute}="${instance.id}"]`;
      const rule = userSheet.addNestingRule(selector);
      let ephemetalSheetUpdated = false;
      for (const styleDecl of ephemeralStyles) {
        // update custom property
        document.documentElement.style.setProperty(
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
            value:
              toVarValue(styleDecl, $transformValue.get()) ?? styleDecl.value,
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
              value:
                toVarValue(styleDecl, $transformValue.get()) ?? styleDecl.value,
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
