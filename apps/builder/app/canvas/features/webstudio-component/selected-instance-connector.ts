import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import type { Instance, Prop, StyleDecl } from "@webstudio-is/project-build";
import { getBrowserStyle } from "@webstudio-is/react-sdk";
import { subscribe } from "~/shared/pubsub";
import { subscribeWindowResize } from "~/shared/dom-hooks";
import {
  rootInstanceContainer,
  selectedInstanceBrowserStyleStore,
} from "~/shared/nano-states";
import { getAllElementsBoundingBox } from "~/shared/dom-utils";
import { subscribeScrollState } from "~/canvas/shared/scroll-state";
import { selectedInstanceOutlineStore } from "~/shared/nano-states/canvas";

const setOutline = (instanceId: Instance["id"], element: HTMLElement) => {
  selectedInstanceOutlineStore.set({
    instanceId,
    rect: getAllElementsBoundingBox(element),
  });
};

const hideOutline = () => {
  selectedInstanceOutlineStore.set(undefined);
};

export const SelectedInstanceConnector = ({
  instanceElementRef,
  instance,
  instanceStyles,
  instanceProps,
}: {
  instanceElementRef: { current: undefined | HTMLElement };
  instance: Instance;
  instanceStyles: StyleDecl[];
  instanceProps: undefined | Prop[];
}) => {
  const rootInstance = useStore(rootInstanceContainer);
  useEffect(() => {
    const element = instanceElementRef.current;
    if (element === undefined) {
      return;
    }

    // effect close to rendered element also catches dnd remounts
    // so actual state is always provided here
    setOutline(instance.id, element);

    const resizeObserver = new ResizeObserver(() => {
      // contentRect has wrong x/y values for absolutely positioned element.
      // getBoundingClientRect is used instead.
      setOutline(instance.id, element);
    });
    resizeObserver.observe(element);

    // detect movement of the element within same parent
    // React prevent remount when key stays the same
    const mutationObserver = new window.MutationObserver(() => {
      setOutline(instance.id, element);
    });
    const parent = element?.parentElement;
    if (parent) {
      mutationObserver.observe(parent, { childList: true });
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
        setOutline(instance.id, element);
      },
    });

    const unsubscribeWindowResize = subscribeWindowResize({
      onResizeStart() {
        hideOutline();
      },
      onResizeEnd() {
        setOutline(instance.id, element);
      },
    });

    // trigger style recomputing every time instance styles are changed
    selectedInstanceBrowserStyleStore.set(getBrowserStyle(element));

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      unsubscribePreviewStyle();
      unsubscribeScrollState();
      unsubscribeWindowResize();
    };
  }, [
    instanceElementRef,
    instance,
    instanceStyles,
    // instance props may change dom element
    instanceProps,
    // update on all changes in the tree in case ResizeObserver does ont work
    rootInstance,
  ]);

  return null;
};
