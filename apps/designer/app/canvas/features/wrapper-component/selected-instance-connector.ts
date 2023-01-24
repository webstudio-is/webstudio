import { useEffect } from "react";
import type { Instance, PropsItem, Styles } from "@webstudio-is/react-sdk";
import { getBrowserStyle } from "@webstudio-is/react-sdk";
import { publish, subscribe, subscribeAll } from "~/shared/pubsub";
import {
  subscribeScrollState,
  subscribeWindowResize,
} from "~/shared/dom-hooks";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    updateSelectedInstanceOutline: {
      visible?: boolean;
      rect?: DOMRect;
    };
  }
}

const updateOutlineRect = (element: HTMLElement) => {
  publish({
    type: "updateSelectedInstanceOutline",
    payload: {
      rect: element.getBoundingClientRect(),
    },
  });
};

const showOutline = (element: HTMLElement) => {
  publish({
    type: "updateSelectedInstanceOutline",
    payload: {
      visible: true,
      rect: element.getBoundingClientRect(),
    },
  });
};

const hideOutline = () => {
  publish({
    type: "updateSelectedInstanceOutline",
    payload: {
      visible: false,
    },
  });
};

export const SelectedInstanceConnector = ({
  instanceElementRef,
  instance,
  instanceStyles,
  instanceProps,
}: {
  instanceElementRef: { current: undefined | HTMLElement };
  instance: Instance;
  instanceStyles: Styles;
  instanceProps: undefined | PropsItem[];
}) => {
  useEffect(() => {
    const element = instanceElementRef.current;
    if (element === undefined) {
      return;
    }

    // effect close to rendered element also catches dnd remounts
    // so actual state is always provided here
    showOutline(element);

    // ResizeObserver does not work for inline elements
    const canObserve = getComputedStyle(element).display !== "inline";

    const resizeObserver = new ResizeObserver(() => {
      // contentRect has wrong x/y values for absolutely positioned element.
      // getBoundingClientRect is used instead.
      updateOutlineRect(element);
    });
    resizeObserver.observe(element);

    // detect movement of the element within same parent
    // React prevent remount when key stays the same
    const mutationObserver = new window.MutationObserver(() => {
      updateOutlineRect(element);
    });
    const parent = element?.parentElement;
    if (parent) {
      mutationObserver.observe(parent, { childList: true });
    }

    let unsubscribeTreeChange: undefined | (() => void);
    if (canObserve === false) {
      // recompute inline elements on tree changes
      unsubscribeTreeChange = subscribeAll((type) => {
        if (
          type === "insertInstance" ||
          type === "deleteInstance" ||
          type === "reparentInstance"
        ) {
          updateOutlineRect(element);
        }
      });
    }

    // hide rect when preview style is send
    // new rect will be send when new styles
    // will be written to instance css rules
    const unsubscribePreviewStyle = subscribe("previewStyle", () => {
      hideOutline();
    });

    const unsubscribeScrollState = subscribeScrollState({
      onScrollStart() {
        hideOutline();
      },
      onScrollEnd() {
        showOutline(element);
      },
    });

    const unsubscribeWindowResize = subscribeWindowResize({
      onResizeStart() {
        hideOutline();
      },
      onResizeEnd() {
        showOutline(element);
      },
    });

    // trigger style recomputing every time instance styles are changed
    publish({
      type: "selectInstance",
      payload: {
        id: instance.id,
        component: instance.component,
        browserStyle: getBrowserStyle(element),
      },
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      unsubscribeTreeChange?.();
      unsubscribePreviewStyle();
      unsubscribeScrollState();
      unsubscribeWindowResize();
    };

    // instance props may change dom element
  }, [instanceElementRef, instance, instanceStyles, instanceProps]);

  return null;
};
