import debounce from "lodash.debounce";
import { idAttribute } from "@webstudio-is/react-sdk";
import {
  hoveredInstanceSelectorStore,
  instancesStore,
} from "~/shared/nano-states";
import { hoveredInstanceOutlineStore } from "~/shared/nano-states";
import {
  getAllElementsBoundingBox,
  getElementByInstanceSelector,
  getInstanceSelectorFromElement,
} from "~/shared/dom-utils";
import { subscribeScrollState } from "./shared/scroll-state";

type TimeoutId = undefined | ReturnType<typeof setTimeout>;

export const subscribeInstanceHovering = () => {
  let hoveredElement: undefined | Element = undefined;

  const updateHoveredInstance = (element: Element) => {
    const instanceSelector = getInstanceSelectorFromElement(element);
    if (instanceSelector) {
      hoveredInstanceSelectorStore.set(instanceSelector);
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
      hoveredInstanceSelectorStore.set(undefined);
      hoveredInstanceOutlineStore.set(undefined);
    }, 100);
  };

  const eventOptions = { passive: true };
  window.addEventListener("mouseover", handleMouseOver, eventOptions);
  window.addEventListener("mouseout", handleMouseOut, eventOptions);

  // debounce is used to avoid laggy hover because of iframe message delay
  const updateHoveredRect = debounce((element: Element) => {
    const instanceId = element.getAttribute(idAttribute) ?? undefined;
    if (instanceId === undefined) {
      return;
    }
    const instances = instancesStore.get();
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    hoveredInstanceOutlineStore.set({
      instanceId: instance.id,
      rect: getAllElementsBoundingBox(element),
    });
  }, 50);

  // remove hover outline when scroll starts
  // and show it with new rect when scroll ends
  const unsubscribeScrollState = subscribeScrollState({
    onScrollStart() {
      hoveredInstanceOutlineStore.set(undefined);
    },
    onScrollEnd() {
      if (hoveredElement !== undefined) {
        updateHoveredRect(hoveredElement);
      }
    },
  });

  // update rect whenever hovered instance is changed
  const unsubscribeHoveredInstanceId = hoveredInstanceSelectorStore.subscribe(
    (instanceSelector) => {
      if (instanceSelector === undefined) {
        return;
      }
      const element = getElementByInstanceSelector(instanceSelector);
      if (element !== undefined) {
        updateHoveredRect(element);
      }
    }
  );

  return () => {
    updateHoveredRect.cancel();
    window.removeEventListener("mouseover", handleMouseOver);
    window.removeEventListener("mouseout", handleMouseOut);
    unsubscribeScrollState();
    clearTimeout(mouseOutTimeoutId);
    unsubscribeHoveredInstanceId();
  };
};
