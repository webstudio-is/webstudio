import { idAttribute } from "@webstudio-is/react-sdk";
import {
  $blockChildOutline,
  $hoveredInstanceSelector,
  $instances,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
  findBlockChildSelector,
} from "~/shared/nano-states";
import { $hoveredInstanceOutline } from "~/shared/nano-states";
import {
  getAllElementsBoundingBox,
  getVisibleElementsByInstanceSelector,
  getInstanceSelectorFromElement,
} from "~/shared/dom-utils";
import { subscribeScrollState } from "./shared/scroll-state";
import { isDescendantOrSelf, type InstanceSelector } from "~/shared/tree-utils";

type TimeoutId = undefined | ReturnType<typeof setTimeout>;

export const subscribeInstanceHovering = ({
  signal,
}: {
  signal: AbortSignal;
}) => {
  let hoveredElement: undefined | Element = undefined;
  let updateOnMouseMove = false;
  let isScrolling = false;

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

  const updateEditableOutline = () => {
    // We want the hover outline to appear only if a mouse or trackpad action caused it, not from keyboard navigation.
    // Otherwise, when we leave the Lexical editor using the keyboard,
    // the mouseover event triggers on elements created after Lexical loses focus.
    // This causes an outline to appear on the element under the now-invisible mouse pointer
    // (as the browser hides the pointer on blur), creating some visual distraction.
    if (hoveredElement !== undefined) {
      const instanceSelector = getInstanceSelectorFromElement(hoveredElement);
      if (instanceSelector) {
        if (updateOnMouseMove) {
          $hoveredInstanceSelector.set(instanceSelector);
          updateEditableChildOutline(instanceSelector);
        } else {
          const textSelector = $textEditingInstanceSelector.get()?.selector;

          // We need to update the editable child's outline even if the mouseover event is not triggered.
          // This can happen if the user enters text editing mode, presses any key, and then moves the mouse.
          // In this case, the mouseover event does not occur, but we still need to show the editable child's outline.
          if (
            textSelector &&
            isDescendantOrSelf(instanceSelector, textSelector) && // optimisation
            $blockChildOutline.get() === undefined
          ) {
            updateEditableChildOutline(instanceSelector);
          }
        }
      }
    }
    updateOnMouseMove = false;
  };

  window.addEventListener(
    "click",
    () => {
      // Fixes the bug if initial editable instance is empty and has collapsed paddings
      setTimeout(updateEditableOutline, 0);
    },
    eventOptions
  );

  window.addEventListener("mousemove", updateEditableOutline, eventOptions);

  window.addEventListener(
    "mouseout",
    () => {
      updateOnMouseMove = false;
      hoveredElement = undefined;

      mouseOutTimeoutId = setTimeout(() => {
        $blockChildOutline.set(undefined);
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

  const updateEditableChildOutline = (instanceSelector: InstanceSelector) => {
    if (isScrolling) {
      return;
    }

    if (instanceSelector.length === 0) {
      return;
    }

    const blockChildSelector = findBlockChildSelector(instanceSelector);

    if (blockChildSelector === undefined) {
      $blockChildOutline.set(undefined);
      return;
    }

    const blockChildElements =
      getVisibleElementsByInstanceSelector(blockChildSelector);
    const blockChildRect = getAllElementsBoundingBox(blockChildElements);

    if (blockChildRect === undefined) {
      $blockChildOutline.set(undefined);
      return;
    }

    $blockChildOutline.set({
      selector: blockChildSelector,
      rect: blockChildRect,
    });
  };

  const updateHoveredRect = (instanceSelector: Readonly<InstanceSelector>) => {
    if (isScrolling) {
      return;
    }

    if (instanceSelector.length === 0) {
      return;
    }

    const elements = getVisibleElementsByInstanceSelector(instanceSelector);

    if (elements.length === 0) {
      return;
    }

    const [instanceId] = instanceSelector;
    const instances = $instances.get();
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }

    $hoveredInstanceOutline.set({
      instanceId: instance.id,
      rect: getAllElementsBoundingBox(elements),
    });
  };

  // remove hover outline when scroll starts
  // and show it with new rect when scroll ends
  const unsubscribeScrollState = subscribeScrollState({
    onScrollStart() {
      isScrolling = true;
      $hoveredInstanceOutline.set(undefined);
      $blockChildOutline.set(undefined);
    },
    onScrollEnd() {
      isScrolling = false;
      if (hoveredElement !== undefined) {
        const instanceSelector = getInstanceSelectorFromElement(hoveredElement);

        if (instanceSelector === undefined) {
          return;
        }

        updateHoveredRect(instanceSelector);
      }
    },
  });

  // update rect whenever hovered instance is changed
  const unsubscribeHoveredInstanceId = $hoveredInstanceSelector.subscribe(
    (instanceSelector) => {
      if (instanceSelector) {
        updateHoveredRect(instanceSelector);
      } else {
        $hoveredInstanceOutline.set(undefined);
      }
    }
  );

  // selected instance selection can change hovered instance outlines (example Block/Template/Child)
  const usubscribeSelectedInstanceSelector =
    $selectedInstanceSelector.subscribe(() => {
      const instanceSelector = $hoveredInstanceSelector.get();
      if (instanceSelector) {
        updateHoveredRect(instanceSelector);
      } else {
        $hoveredInstanceOutline.set(undefined);
      }
    });

  signal.addEventListener("abort", () => {
    unsubscribeScrollState();
    clearTimeout(mouseOutTimeoutId);
    unsubscribeHoveredInstanceId();
    usubscribeSelectedInstanceSelector();
  });
};
