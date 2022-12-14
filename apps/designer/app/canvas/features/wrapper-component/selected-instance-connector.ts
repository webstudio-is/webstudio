import { type ComponentRef, useCallback, useEffect } from "react";
import type { Instance } from "@webstudio-is/react-sdk";
import { getComponent, useUserProps } from "@webstudio-is/react-sdk";
import { publish, subscribeAll } from "~/shared/pubsub";
import { useScrollState } from "~/shared/dom-hooks";

type ComponentRefValue = ComponentRef<ReturnType<typeof getComponent>>;

const publishSelectedRect = (element: HTMLElement) => {
  publish({
    type: "selectedInstanceRect",
    payload: element.getBoundingClientRect(),
  });
};

export const SelectedInstanceConnector = ({
  instanceElementRef,
  instanceProps,
}: {
  instanceElementRef: { current: undefined | ComponentRefValue };
  instance: Instance;
  instanceProps: ReturnType<typeof useUserProps>;
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

    return () => {
      resizeObserver.disconnect();
      unsubscribeTreeChange?.();
    };

    // instance props may change dom element
  }, [instanceElementRef, instanceProps]);

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
