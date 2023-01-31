import { useEffect } from "react";
import debounce from "lodash.debounce";
import { idAttribute } from "@webstudio-is/react-sdk";
import {
  hoveredInstanceIdStore,
  hoveredInstanceOutlineStore,
} from "~/shared/nano-states";
import { subscribeScrollState } from "~/shared/dom-hooks";

type TimeoutId = undefined | ReturnType<typeof setTimeout>;

const startHoveredInstanceConnection = () => {
  let hoveredElement: undefined | Element = undefined;

  const updateHoveredInstance = (element: Element) => {
    const id = element.getAttribute(idAttribute) ?? undefined;
    if (id === undefined) {
      return;
    }
    hoveredInstanceIdStore.set(id);
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
      hoveredInstanceIdStore.set(undefined);
    }, 100);
  };

  const eventOptions = { passive: true };
  window.addEventListener("mouseover", handleMouseOver, eventOptions);
  window.addEventListener("mouseout", handleMouseOut, eventOptions);

  // debounce is used to avoid laggy hover because of iframe message delay
  const updateHoveredRect = debounce((element: Element) => {
    const component = element.getAttribute("data-ws-component") ?? undefined;
    if (component === undefined) {
      return;
    }
    hoveredInstanceOutlineStore.set({
      // store component in outline to show correct label when hover over elements fast
      component: component,
      rect: element.getBoundingClientRect(),
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
  const unsubscribeHoveredInstanceId = hoveredInstanceIdStore.subscribe(
    (id) => {
      const element =
        document.querySelector(`[${idAttribute}="${id}"]`) ?? undefined;
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

export const useHoveredInstanceConnector = () => {
  useEffect(() => {
    const disconnect = startHoveredInstanceConnection();
    return disconnect;
  }, []);
};
