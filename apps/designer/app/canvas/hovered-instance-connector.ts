import { useEffect } from "react";
import debounce from "lodash.debounce";
import { type Instance, idAttribute } from "@webstudio-is/react-sdk";
import { utils } from "@webstudio-is/project";
import { publish, subscribe } from "~/shared/pubsub";
import { useRootInstance } from "~/shared/nano-states";
import { subscribeScrollState } from "~/shared/dom-hooks";

const startHoveredInstanceConnection = (rootInstance: Instance) => {
  let hoveredElement: undefined | Element = undefined;

  // debounce is used to avoid laggy hover because of iframe message delay
  const publishHover = debounce((element: Element) => {
    const id = element.getAttribute(idAttribute) ?? undefined;
    if (id === undefined) {
      return;
    }
    const instance = utils.tree.findInstanceById(rootInstance, id);
    if (instance === undefined) {
      return;
    }
    publish({
      type: "hoveredInstanceRect",
      payload: element.getBoundingClientRect(),
    });
    publish({
      type: "hoverInstance",
      payload: {
        id: instance.id,
        component: instance.component,
      },
    });
  }, 50);

  let mouseOutTimeoutId: undefined | ReturnType<typeof setTimeout> = undefined;

  const handleMouseOver = (event: MouseEvent) => {
    if (event.target instanceof Element) {
      const element = event.target.closest(`[${idAttribute}]`) ?? undefined;
      if (element !== undefined) {
        clearTimeout(mouseOutTimeoutId);
        // store hovered element locally to update outline when scroll ends
        hoveredElement = element;
        publishHover(element);
      }
    }
  };

  const handleMouseOut = () => {
    mouseOutTimeoutId = setTimeout(() => {
      hoveredElement = undefined;
      publish({
        type: "hoverInstance",
        payload: undefined,
      });
    }, 100);
  };

  const eventOptions = { passive: true };
  window.addEventListener("mouseover", handleMouseOver, eventOptions);
  window.addEventListener("mouseout", handleMouseOut, eventOptions);

  const unsubscribeNavigatorHoveredInstance = subscribe(
    "navigatorHoveredInstance",
    (navigatorHoveredInstance) => {
      if (navigatorHoveredInstance === undefined) {
        return;
      }
      const id = navigatorHoveredInstance.id;
      const element =
        document.querySelector(`[${idAttribute}="${id}"]`) ?? undefined;
      if (element !== undefined) {
        publishHover(element);
      }
    }
  );

  // remove hover outline when scroll starts
  // and show it with new rect when scroll ends
  const unsubscribeScrollState = subscribeScrollState({
    onScrollStart() {
      publish({
        type: "hoverInstance",
        payload: undefined,
      });
    },
    onScrollEnd() {
      if (hoveredElement !== undefined) {
        publishHover(hoveredElement);
      }
    },
  });

  return () => {
    publishHover.cancel();
    window.removeEventListener("mouseover", handleMouseOver);
    window.removeEventListener("mouseout", handleMouseOut);
    unsubscribeNavigatorHoveredInstance();
    unsubscribeScrollState();
    clearTimeout(mouseOutTimeoutId);
  };
};

export const useHoveredInstanceConnector = () => {
  const [rootInstance] = useRootInstance();

  useEffect(() => {
    if (rootInstance === undefined) {
      return;
    }

    const disconnect = startHoveredInstanceConnection(rootInstance);
    return disconnect;
  }, [rootInstance]);
};
