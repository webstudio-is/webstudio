import { idAttribute } from "@webstudio-is/react-sdk";
import { $hoveredInstanceSelector, $instances } from "~/shared/nano-states";
import { $hoveredInstanceOutline } from "~/shared/nano-states";
import {
  getAllElementsBoundingBox,
  getElementsByInstanceSelector,
  getInstanceSelectorFromElement,
} from "~/shared/dom-utils";
import { subscribeScrollState } from "./shared/scroll-state";
import type { InstanceSelector } from "~/shared/tree-utils";

type TimeoutId = undefined | ReturnType<typeof setTimeout>;

export const subscribeInstanceHovering = () => {
  let hoveredElement: undefined | Element = undefined;
  let isScrolling = false;

  const updateHoveredInstance = (element: Element) => {
    const instanceSelector = getInstanceSelectorFromElement(element);
    if (instanceSelector) {
      $hoveredInstanceSelector.set(instanceSelector);
    }
  };

  let mouseOutTimeoutId: TimeoutId = undefined;

  const handleMouseOver = (event: MouseEvent) => {
    if (event.target instanceof Element) {
      const element = event.target.closest(`[${idAttribute}]`) ?? undefined;
      if (element !== undefined) {
        clearTimeout(mouseOutTimeoutId);
        // store hovered element locally to update outline when scroll ends
        hoveredElement = element;
        updateHoveredInstance(element);
      }
    }
  };

  const handleMouseOut = () => {
    mouseOutTimeoutId = setTimeout(() => {
      hoveredElement = undefined;
      $hoveredInstanceSelector.set(undefined);
      $hoveredInstanceOutline.set(undefined);
    }, 100);

    // Fixes the bug, that new hover occures during timeout
    const unsubscribe = $hoveredInstanceSelector.listen(() => {
      clearTimeout(mouseOutTimeoutId);
      unsubscribe();
    });
  };

  const eventOptions = { passive: true };
  window.addEventListener("mouseover", handleMouseOver, eventOptions);
  window.addEventListener("mouseout", handleMouseOut, eventOptions);

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
        const elements = getElementsByInstanceSelector(instanceSelector);
        updateHoveredRect(elements, instanceSelector);
      } else {
        $hoveredInstanceOutline.set(undefined);
      }
    }
  );

  return () => {
    window.removeEventListener("mouseover", handleMouseOver);
    window.removeEventListener("mouseout", handleMouseOut);
    unsubscribeScrollState();
    clearTimeout(mouseOutTimeoutId);
    unsubscribeHoveredInstanceId();
  };
};
