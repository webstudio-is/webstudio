import { useCallback, useEffect } from "react";
import type { Instance, InstanceProps } from "@webstudio-is/react-sdk";
import { getBrowserStyle } from "@webstudio-is/react-sdk";
import { publish, subscribeAll } from "~/shared/pubsub";
import { useScrollState } from "~/shared/dom-hooks";

const publishSelectedRect = (element: HTMLElement) => {
  publish({
    type: "selectedInstanceRect",
    payload: element.getBoundingClientRect(),
  });
};

export const SelectedInstanceConnector = ({
  instanceElementRef,
  instance,
  instanceProps,
}: {
  instanceElementRef: { current: undefined | HTMLElement };
  instance: Instance;
  instanceProps: undefined | InstanceProps;
}) => {
  useEffect(() => {
    const element = instanceElementRef.current;
    if (element === undefined) {
      return;
    }

    // effect close to rendered element also catches dnd remounts
    // so actual state is always provided here
    publishSelectedRect(element);

    // ResizeObserver does not work for inline elements
    const canObserve = getComputedStyle(element).display !== "inline";

    const resizeObserver = new ResizeObserver(() => {
      // contentRect has wrong x/y values for absolutely positioned element.
      // getBoundingClientRect is used instead.
      publishSelectedRect(element);
    });
    resizeObserver.observe(element);

    // detect movement of the element within same parent
    // React prevent remount when key stays the same
    const mutationObserver = new window.MutationObserver(() => {
      publishSelectedRect(element);
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
          type === "updateProps" ||
          type === "deleteProp" ||
          type === "insertInstance" ||
          type === "deleteInstance" ||
          type === "reparentInstance" ||
          type === "updateStyle" ||
          type.startsWith("previewStyle:")
        ) {
          publishSelectedRect(element);
        }
      });
    }

    // trigger style recomputing every time instance styles are changed
    publish({
      type: "selectInstance",
      payload: {
        id: instance.id,
        component: instance.component,
        cssRules: instance.cssRules,
        browserStyle: getBrowserStyle(element),
        props: instanceProps,
      },
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      unsubscribeTreeChange?.();
    };

    // instance props may change dom element
  }, [instanceElementRef, instance, instanceProps]);

  const onScrollEnd = useCallback(() => {
    const element = instanceElementRef.current;
    if (element === undefined) {
      return;
    }
    publishSelectedRect(element);
  }, [instanceElementRef]);

  useScrollState({
    onScrollEnd,
  });

  return null;
};
