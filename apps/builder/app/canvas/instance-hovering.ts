import { idAttribute } from "@webstudio-is/react-sdk";
import { $hoveredInstanceSelector, $instances } from "~/shared/nano-states";
import { $hoveredInstanceOutline } from "~/shared/nano-states";
import {
  getAllElementsBoundingBox,
  getVisibleElementsByInstanceSelector,
  getInstanceSelectorFromElement,
} from "~/shared/dom-utils";
import { subscribeScrollState } from "./shared/scroll-state";
import type { InstanceSelector } from "~/shared/tree-utils";

type TimeoutId = undefined | ReturnType<typeof setTimeout>;

export const subscribeInstanceHovering = ({
  signal,
}: {
  signal: AbortSignal;
}) => {
  let hoveredElement: undefined | Element = undefined;
  let updateOnMouseMove = false;
  let isScrolling = false;

  const updateHoveredInstance = (element: Element) => {
    const instanceSelector = getInstanceSelectorFromElement(element);
    if (instanceSelector) {
      $hoveredInstanceSelector.set(instanceSelector);
    }
  };

  let mouseOutTimeoutId: TimeoutId = undefined;

  const eventOptions = { passive: true, signal };

  window.addEventListener(
    "mouseover",
    (event) => {
      if (event.target instanceof Element) {
        const element = event.target.closest(`[${idAttribute}]`) ?? undefined;
        if (element !== undefined) {
          clearTimeout(mouseOutTimeoutId);
          // store hovered element locally to update outline when scroll ends
          hoveredElement = element;
          updateOnMouseMove = true;
        }
      }
    },
    eventOptions
  );
  window.addEventListener(
    "mousemove",
    () => {
      // We want the hover outline to appear only if a mouse or trackpad action caused it, not from keyboard navigation.
      // Otherwise, when we leave the Lexical editor using the keyboard,
      // the mouseover event triggers on elements created after Lexical loses focus.
      // This causes an outline to appear on the element under the now-invisible mouse pointer
      // (as the browser hides the pointer on blur), creating some visual distraction.
      if (updateOnMouseMove && hoveredElement !== undefined) {
        updateHoveredInstance(hoveredElement);
      }
      updateOnMouseMove = false;
    },
    eventOptions
  );

  window.addEventListener(
    "mouseout",
    () => {
      mouseOutTimeoutId = setTimeout(() => {
        updateOnMouseMove = false;
        hoveredElement = undefined;
        $hoveredInstanceSelector.set(undefined);
        $hoveredInstanceOutline.set(undefined);
      }, 100);

      // Fixes the bug, that new hover occures during timeout
      const unsubscribe = $hoveredInstanceSelector.listen(() => {
        clearTimeout(mouseOutTimeoutId);
        unsubscribe();
      });
    },
    eventOptions
  );

  const updateHoveredRect = (
    elements: Element[],
    instanceSelector: Readonly<InstanceSelector>
  ) => {
    if (elements.length === 0) {
      return;
    }

    if (instanceSelector.length === 0) {
      return;
    }

    const [instanceId] = instanceSelector;
    const instances = $instances.get();
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }

    if (!isScrolling) {
      $hoveredInstanceOutline.set({
        instanceId: instance.id,
        rect: getAllElementsBoundingBox(elements),
      });
    }
  };

  // remove hover outline when scroll starts
  // and show it with new rect when scroll ends
  const unsubscribeScrollState = subscribeScrollState({
    onScrollStart() {
      isScrolling = true;
      $hoveredInstanceOutline.set(undefined);
    },
    onScrollEnd() {
      isScrolling = false;
      if (hoveredElement !== undefined) {
        const instanceSelector = getInstanceSelectorFromElement(hoveredElement);

        if (instanceSelector === undefined) {
          return;
        }

        updateHoveredRect([hoveredElement], instanceSelector);
      }
    },
  });

  // update rect whenever hovered instance is changed
  const unsubscribeHoveredInstanceId = $hoveredInstanceSelector.subscribe(
    (instanceSelector) => {
      if (instanceSelector) {
        const elements = getVisibleElementsByInstanceSelector(instanceSelector);
        updateHoveredRect(elements, instanceSelector);
      } else {
        $hoveredInstanceOutline.set(undefined);
      }
    }
  );

  signal.addEventListener("abort", () => {
    unsubscribeScrollState();
    clearTimeout(mouseOutTimeoutId);
    unsubscribeHoveredInstanceId();
  });
};
