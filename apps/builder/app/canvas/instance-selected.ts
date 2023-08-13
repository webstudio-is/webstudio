import type { Instance } from "@webstudio-is/project-build";
import { idAttribute, selectorIdAttribute } from "@webstudio-is/react-sdk";
import { subscribeWindowResize } from "~/shared/dom-hooks";
import {
  isResizingCanvasStore,
  selectedInstanceBrowserStyleStore,
  selectedInstanceIntanceToTagStore,
  selectedInstanceUnitSizesStore,
  selectedInstanceRenderStateStore,
  stylesIndexStore,
  instancesStore,
  propsStore,
  dataSourceValuesStore,
  selectedInstanceSelectorStore,
  dataSourceVariablesStore,
} from "~/shared/nano-states";
import htmlTags, { type htmlTags as HtmlTags } from "html-tags";
import {
  getAllElementsBoundingBox,
  getElementsByInstanceSelector,
} from "~/shared/dom-utils";
import { subscribeScrollState } from "~/canvas/shared/scroll-state";
import { selectedInstanceOutlineStore } from "~/shared/nano-states";
import type { UnitSizes } from "~/builder/features/style-panel/shared/css-value-input/convert-units";
import { setDataCollapsed } from "~/canvas/collapsed";
import { getBrowserStyle } from "./features/webstudio-component/get-browser-style";
import type { InstanceSelector } from "~/shared/tree-utils";

const isHtmlTag = (tag: string): tag is HtmlTags =>
  htmlTags.includes(tag as HtmlTags);

const setOutline = (instanceId: Instance["id"], elements: HTMLElement[]) => {
  selectedInstanceOutlineStore.set({
    instanceId,
    rect: getAllElementsBoundingBox(elements),
  });
};

const hideOutline = () => {
  selectedInstanceOutlineStore.set(undefined);
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

const subscribeSelectedInstance = (
  selectedInstanceSelector: Readonly<InstanceSelector>,
  queueTask: (task: () => void) => void
) => {
  if (selectedInstanceSelector.length === 0) {
    return;
  }

  const instanceId = selectedInstanceSelector[0];
  // setDataCollapsed

  let elements = getElementsByInstanceSelector(selectedInstanceSelector);

  elements[0]?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });

  const updateElements = () => {
    elements = getElementsByInstanceSelector(selectedInstanceSelector);
  };

  const updateDataCollapsed = () => {
    if (elements.length === 0) {
      return;
    }

    for (const element of elements) {
      const selectorId = element.getAttribute(selectorIdAttribute);
      if (selectorId === null) {
        continue;
      }

      const instanceSelector = selectorId.split(",");
      if (instanceSelector.length === 0) {
        continue;
      }

      setDataCollapsed(instanceSelector[0], false);
    }

    // Synchronously execute setDataCollapsed to calculate right outline
    // This fixes an issue, when new element outline was calulated before collapsed elements calculations
    setDataCollapsed(instanceId, true);
  };

  updateDataCollapsed();

  const showOutline = () => {
    if (isResizingCanvasStore.get()) {
      return;
    }
    setOutline(instanceId, elements);
  };
  // effect close to rendered element also catches dnd remounts
  // so actual state is always provided here
  showOutline();

  const updateStores = () => {
    if (elements.length === 0) {
      return;
    }

    const element = elements[0];
    // trigger style recomputing every time instance styles are changed
    selectedInstanceBrowserStyleStore.set(getBrowserStyle(element));

    // Map self and ancestor instance ids to tag names
    const instanceToTag = new Map<Instance["id"], HtmlTags>();
    for (
      let ancestorOrSelf: HTMLElement | null = element;
      ancestorOrSelf !== null;
      ancestorOrSelf = ancestorOrSelf.parentElement
    ) {
      const tagName = ancestorOrSelf.tagName.toLowerCase();
      const instanceId = ancestorOrSelf.getAttribute(idAttribute);

      if (isHtmlTag(tagName) && instanceId !== null) {
        instanceToTag.set(instanceId, tagName);
      }
    }

    selectedInstanceIntanceToTagStore.set(instanceToTag);

    const unitSizes = calculateUnitSizes(element);
    selectedInstanceUnitSizesStore.set(unitSizes);
  };

  let updateStoreTimeouHandle: undefined | ReturnType<typeof setTimeout>;

  const updateStoresDebounced = () => {
    clearTimeout(updateStoreTimeouHandle);
    updateStoreTimeouHandle = setTimeout(updateStores, 100);
  };

  const update = () => {
    queueTask(() => {
      updateElements();
      // Having hover etc, element can have no size because of that
      // Newly created element can have 0 size
      updateDataCollapsed();
      // contentRect has wrong x/y values for absolutely positioned element.
      // getBoundingClientRect is used instead.
      showOutline();

      // Cause serious performance issues, use debounced version
      // The result of stores is not needed immediately
      updateStoresDebounced();

      // Having that elements can be changed (i.e. div => address tag change, observe again)
      updateObservers();
    });
  };

  // Lightweight update
  const updateOutline = () => {
    showOutline();
  };

  const resizeObserver = new ResizeObserver(update);

  // detect movement of the element within same parent
  // React prevent remount when key stays the same
  // `attributes: true` fixes issues with popups after trigger text editing
  // that cause radix to incorrectly set content in a wrong position at first render
  const mutationObserver = new MutationObserver(update);

  const updateObservers = () => {
    for (const element of elements) {
      resizeObserver.observe(element);

      const parent = element?.parentElement;
      if (parent) {
        mutationObserver.observe(parent, {
          childList: true,
          attributes: true,
          attributeFilter: ["style", "class"],
        });
      }
    }
  };

  const bodyStyleMutationObserver = new MutationObserver(updateOutline);
  // previewStyle variables
  bodyStyleMutationObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  updateObservers();

  const unsubscribeStylesIndexStore = stylesIndexStore.subscribe(update);
  const unsubscribeInstancesStore = instancesStore.subscribe(update);
  const unsubscribePropsStore = propsStore.subscribe(update);
  const unsubscribeDataSourceValuesStore =
    dataSourceValuesStore.subscribe(update);

  const unsubscribeDataSourceVariablesStore =
    dataSourceVariablesStore.subscribe(update);

  const unsubscribeIsResizingCanvas = isResizingCanvasStore.subscribe(
    (isResizing) => {
      if (isResizing && selectedInstanceOutlineStore.get()) {
        return hideOutline();
      }
      showOutline();
    }
  );

  const unsubscribeScrollState = subscribeScrollState({
    onScrollStart() {
      hideOutline();
    },
    onScrollEnd() {
      showOutline();
    },
  });

  const unsubscribeWindowResize = subscribeWindowResize({
    onResizeStart() {
      hideOutline();
    },
    onResizeEnd() {
      showOutline();
    },
  });

  selectedInstanceRenderStateStore.set("mounted");

  return () => {
    clearTimeout(updateStoreTimeouHandle);
    hideOutline();
    selectedInstanceRenderStateStore.set("pending");
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    bodyStyleMutationObserver.disconnect();
    unsubscribeIsResizingCanvas();
    unsubscribeScrollState();
    unsubscribeWindowResize();
    unsubscribeStylesIndexStore();
    unsubscribeInstancesStore();
    unsubscribePropsStore();
    unsubscribeDataSourceValuesStore();
    unsubscribeDataSourceVariablesStore();
  };
};

export const subscribeSelected = (queueTask: (task: () => void) => void) => {
  let previousSelectedInstance: readonly string[] | undefined = undefined;
  let unsubscribeSelectedInstance = () => {};

  const unsubscribe = selectedInstanceSelectorStore.subscribe(
    (instanceSelector) => {
      if (instanceSelector !== previousSelectedInstance) {
        unsubscribeSelectedInstance();
        unsubscribeSelectedInstance =
          subscribeSelectedInstance(instanceSelector ?? [], queueTask) ??
          (() => {});
        previousSelectedInstance = instanceSelector;
      }
    }
  );

  return () => {
    unsubscribe();
    unsubscribeSelectedInstance();
  };
};
