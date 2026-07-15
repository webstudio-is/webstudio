import { shallowEqual } from "shallow-equal";
import warnOnce from "warn-once";
import type { Instance } from "@webstudio-is/sdk";
import type { CssProperty, UnitValue } from "@webstudio-is/css-engine";
import { propertiesData } from "@webstudio-is/css-data";
import { selectorIdAttribute } from "@webstudio-is/react-sdk";
import { subscribeWindowResize } from "~/shared/dom-hooks";
import {
  $isResizingCanvas,
  $selectedInstanceSizes,
  $selectedInstanceRenderState,
  $stylesIndex,
  $propValuesByInstanceSelectorWithMemoryProps,
  $selectedInstanceStates,
  $allSelectedInstanceSelectors,
  type UnitSizes,
  type PropertySizes,
} from "~/shared/nano-states";
import { $styleSourceSelections } from "~/shared/sync/data-stores";
import {
  getAllElementsBoundingBox,
  getVisibleElementsByInstanceSelector,
  getAllElementsByInstanceSelector,
  scrollIntoView,
  hasDoNotTrackMutationRecord,
} from "~/shared/dom-utils";
import { subscribeScrollState } from "~/canvas/shared/scroll-state";
import {
  $selectedInstanceOutline,
  $selectedInstanceOutlines,
} from "~/shared/nano-states";
import { $instances, $styles } from "~/shared/sync/data-stores";
import { inflateInstance } from "~/canvas/inflator";
import {
  areInstanceSelectorsEqual,
  type InstanceSelector,
} from "@webstudio-is/project-build/runtime";

const toRect = (rect: DOMRect) => ({
  top: rect.top,
  left: rect.left,
  width: rect.width,
  height: rect.height,
});

const setOutline = (
  selector: InstanceSelector,
  instanceId: Instance["id"],
  elements: HTMLElement[],
  syncSingleOutline: boolean
) => {
  const outline = {
    selector,
    instanceId,
    rect: toRect(
      getAllElementsBoundingBox(elements, {
        fallbackToParent: syncSingleOutline,
      })
    ),
  };
  const outlines = $selectedInstanceOutlines.get();
  const index = outlines.findIndex((item) =>
    areInstanceSelectorsEqual(item.selector, selector)
  );
  if (index === -1) {
    $selectedInstanceOutlines.set([...outlines, outline]);
  } else {
    const nextOutlines = [...outlines];
    nextOutlines[index] = outline;
    $selectedInstanceOutlines.set(nextOutlines);
  }
  if (syncSingleOutline) {
    $selectedInstanceOutline.set(outline);
  }
};

const hideOutline = (
  selector: InstanceSelector,
  syncSingleOutline: boolean
) => {
  $selectedInstanceOutlines.set(
    $selectedInstanceOutlines
      .get()
      .filter(
        (item) => areInstanceSelectorsEqual(item.selector, selector) === false
      )
  );
  if (syncSingleOutline) {
    $selectedInstanceOutline.set(undefined);
  }
};

const calculateUnitSizes = (element: HTMLElement): UnitSizes => {
  // Based on this https://stackoverflow.com/questions/1248081/how-to-get-the-browser-viewport-dimensions/8876069#8876069
  // this is crossbrowser way to get viewport sizes vw vh in px
  const vw =
    Math.max(document.documentElement.clientWidth, window.innerWidth) / 100;
  const vh =
    Math.max(document.documentElement.clientHeight, window.innerHeight) / 100;

  // em in px is equal to current computed style for font size
  const em = Number.parseFloat(getComputedStyle(element).fontSize);

  // rem in px is equal to root computed style for font size
  const rem = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize
  );

  // we create a node with 1ch width, measure it in px and remove it
  const node = document.createElement("div");
  node.style.width = "1ch";
  node.style.position = "absolute";
  element.appendChild(node);
  const ch = Number.parseFloat(getComputedStyle(node).width);
  element.removeChild(node);

  return {
    ch, // 1ch in pixels
    vw, // 1vw in pixels
    vh, // 1vh in pixels
    em, // 1em in pixels
    rem, // 1rem in pixels
    px: 1, // always 1, simplifies conversions and types, i.e valueTo = valueFrom * unitSizes[from] / unitSizes[to]
  };
};

const calculatePropertySizes = (element: HTMLElement) => {
  const computedStyle = getComputedStyle(element);
  const propertySizes: PropertySizes = {};
  for (const property in propertiesData) {
    try {
      const propertyValue = computedStyle.getPropertyValue(property);
      const value = CSSStyleValue.parse(property, propertyValue);
      if (value instanceof CSSUnitValue) {
        propertySizes[property as CssProperty] = {
          type: "unit",
          // px | number | percent etc
          unit:
            value.unit === "percent" ? "%" : (value.unit as UnitValue["unit"]),
          value: value.value,
        };
      }
    } catch (error) {
      // failed with unknown property like -moz-osx-font-smoothing
      // also firefox does not support CSSStyleValue
    }
  }
  return propertySizes;
};

const subscribeSelectedInstance = (
  selectedInstanceSelector: Readonly<InstanceSelector>,
  debounceEffect: (callback: () => void) => void,
  syncSingleSelectionStores: boolean
) => {
  if (selectedInstanceSelector.length === 0) {
    return;
  }

  const selector = [...selectedInstanceSelector];
  const instanceId = selectedInstanceSelector[0];

  let visibleElements = getVisibleElementsByInstanceSelector(
    selectedInstanceSelector
  );

  const updateScroll = () => {
    if (syncSingleSelectionStores === false) {
      return;
    }
    const bbox = getAllElementsBoundingBox(visibleElements);
    if (visibleElements.length === 0) {
      return;
    }
    scrollIntoView(visibleElements[0], bbox);
  };

  const updateElements = () => {
    visibleElements = getVisibleElementsByInstanceSelector(
      selectedInstanceSelector
    );
  };

  const updateInflation = () => {
    if (visibleElements.length === 0) {
      return;
    }

    for (const element of visibleElements) {
      const selectorId = element.getAttribute(selectorIdAttribute);
      if (selectorId === null) {
        continue;
      }

      const instanceSelector = selectorId.split(",");
      if (instanceSelector.length === 0) {
        continue;
      }

      inflateInstance(instanceSelector[0], false);
    }

    // Synchronously execute inflateInstance to calculate right outline
    // This fixes an issue, when new element outline was calculated before inflation calculations
    inflateInstance(instanceId, true);
  };

  updateInflation();

  const showOutline = () => {
    if ($isResizingCanvas.get()) {
      return;
    }
    setOutline(
      selector,
      instanceId,
      visibleElements,
      syncSingleSelectionStores
    );
  };
  // effect close to rendered element also catches dnd remounts
  // so actual state is always provided here
  showOutline();

  const updateStores = () => {
    if (syncSingleSelectionStores === false) {
      return;
    }
    const elements = getAllElementsByInstanceSelector(selectedInstanceSelector);

    if (elements.length === 0) {
      return;
    }

    const [element] = elements;
    // trigger style recomputing every time instance styles are changed
    const unitSizes = calculateUnitSizes(element);
    const propertySizes = calculatePropertySizes(element);
    $selectedInstanceSizes.set({ unitSizes, propertySizes });

    const availableStates = new Set<string>();
    const instanceStyleSourceIds = new Set(
      $styleSourceSelections.get().get(instanceId)?.values
    );
    const styles = $styles.get();
    for (const styleDecl of styles.values()) {
      if (
        instanceStyleSourceIds.has(styleDecl.styleSourceId) &&
        styleDecl.state
      ) {
        availableStates.add(styleDecl.state);
      }
    }
    const activeStates = new Set<string>();
    for (const state of availableStates) {
      try {
        // pseudo classes like :open or :current are not supported in .matches method
        if (element.matches(state)) {
          activeStates.add(state);
        }
      } catch {
        warnOnce(true, `state selector "${state}" is invalid`);
      }
    }

    if (
      !shallowEqual(activeStates.keys(), $selectedInstanceStates.get().keys())
    ) {
      $selectedInstanceStates.set(activeStates);
    }
  };

  let updateStoreTimeouHandle: undefined | ReturnType<typeof setTimeout>;

  const update = () => {
    debounceEffect(() => {
      updateElements();
      // Disconnect before inflation so the observer doesn't see
      // the inline style changes inflation makes on the parent element.
      // updateObservers() reconnects after.
      mutationObserver.disconnect();
      // Having hover etc, element can have no size because of that
      // Newly created element can have 0 size
      updateInflation();
      // contentRect has wrong x/y values for absolutely positioned element.
      // getBoundingClientRect is used instead.
      showOutline();

      updateStores();

      // Having that elements can be changed (i.e. div => address tag change, observe again)
      updateObservers();
    });
  };

  // update scroll state
  updateScroll();

  // Lightweight update
  const updateOutline: MutationCallback = (mutationRecords) => {
    if (hasDoNotTrackMutationRecord(mutationRecords)) {
      return;
    }

    showOutline();
  };

  const resizeObserver = new ResizeObserver(update);

  const mutationHandler: MutationCallback = (mutationRecords) => {
    if (hasDoNotTrackMutationRecord(mutationRecords)) {
      return;
    }

    update();
  };

  // detect movement of the element within same parent
  // React prevent remount when key stays the same
  // `attributes: true` fixes issues with popups after trigger text editing
  // that cause radix to incorrectly set content in a wrong position at first render
  const mutationObserver = new MutationObserver(mutationHandler);

  const updateObservers = () => {
    for (const element of visibleElements) {
      resizeObserver.observe(element);

      const parent = element?.parentElement;

      if (parent) {
        mutationObserver.observe(parent, {
          childList: true,
          attributes: true,
          attributeOldValue: true,
          attributeFilter: ["style", "class"],
        });
      }
    }
  };

  const bodyStyleMutationObserver = new MutationObserver(updateOutline);

  // previewStyle variables
  bodyStyleMutationObserver.observe(document.body, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ["style", "class"],
  });

  updateObservers();

  const unsubscribe$stylesIndex = $stylesIndex.subscribe(update);
  const unsubscribe$instances = $instances.subscribe(update);
  const unsubscribePropValuesStore =
    $propValuesByInstanceSelectorWithMemoryProps.subscribe(update);

  const unsubscribeIsResizingCanvas = $isResizingCanvas.subscribe(
    (isResizing) => {
      if (isResizing) {
        return hideOutline(selector, syncSingleSelectionStores);
      }
      showOutline();
    }
  );

  const unsubscribeScrollState = subscribeScrollState({
    onScrollStart() {
      hideOutline(selector, syncSingleSelectionStores);
    },
    onScrollEnd() {
      showOutline();
    },
  });

  const unsubscribeWindowResize = subscribeWindowResize({
    onResizeStart() {
      hideOutline(selector, syncSingleSelectionStores);
    },
    onResizeEnd() {
      showOutline();
    },
  });

  if (syncSingleSelectionStores) {
    $selectedInstanceRenderState.set("mounted");
  }

  return () => {
    clearTimeout(updateStoreTimeouHandle);
    hideOutline(selector, syncSingleSelectionStores);
    if (syncSingleSelectionStores) {
      $selectedInstanceRenderState.set("notMounted");
    }
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    bodyStyleMutationObserver.disconnect();
    unsubscribeIsResizingCanvas();
    unsubscribeScrollState();
    unsubscribeWindowResize();
    unsubscribe$stylesIndex();
    unsubscribe$instances();
    unsubscribePropValuesStore();
  };
};

export const subscribeSelected = (
  debounceEffect: (callback: () => void) => void
) => {
  let previousSelectedInstances: readonly InstanceSelector[] | undefined =
    undefined;
  let unsubscribeSelectedInstances = () => {};

  const unsubscribe = $allSelectedInstanceSelectors.subscribe(
    (instanceSelectors) => {
      if (instanceSelectors !== previousSelectedInstances) {
        unsubscribeSelectedInstances();
        $selectedInstanceOutline.set(undefined);
        $selectedInstanceOutlines.set([]);
        const unsubscribes = instanceSelectors.map((instanceSelector) =>
          subscribeSelectedInstance(
            instanceSelector,
            debounceEffect,
            instanceSelectors.length === 1
          )
        );
        unsubscribeSelectedInstances = () => {
          for (const unsubscribe of unsubscribes) {
            unsubscribe?.();
          }
        };
        previousSelectedInstances = instanceSelectors;
      }
    }
  );

  return () => {
    unsubscribe();
    unsubscribeSelectedInstances();
  };
};
