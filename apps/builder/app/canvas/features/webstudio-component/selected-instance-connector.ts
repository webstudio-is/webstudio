import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import type { Instance, Prop, StyleDecl } from "@webstudio-is/project-build";
import { getBrowserStyle, idAttribute } from "@webstudio-is/react-sdk";
import { subscribe } from "~/shared/pubsub";
import { subscribeWindowResize } from "~/shared/dom-hooks";
import {
  rootInstanceContainer,
  selectedInstanceBrowserStyleStore,
  selectedInstanceIntanceToTagStore,
} from "~/shared/nano-states";
import htmlTags, { type htmlTags as HtmlTags } from "html-tags";
import { getAllElementsBoundingBox } from "~/shared/dom-utils";
import { subscribeScrollState } from "~/canvas/shared/scroll-state";
import { selectedInstanceOutlineStore } from "~/shared/nano-states/canvas";

const isHtmlTag = (tag: string): tag is HtmlTags =>
  htmlTags.includes(tag as HtmlTags);

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

    // Map self and ancestor instance ids to tag names
    const instanceToTag = new Map<Instance["id"], HtmlTags>();
    for (
      let ancestorOrSelf: HTMLElement | null = element;
      ancestorOrSelf !== null;
      ancestorOrSelf = ancestorOrSelf.parentElement
    ) {
      const tagName = ancestorOrSelf.tagName.toLowerCase();
      const instanceId = ancestorOrSelf.getAttribute(idAttribute);

      if (isHtmlTag(tagName) && instanceId !== null) {
        instanceToTag.set(instanceId, tagName);
      }
    }

    selectedInstanceIntanceToTagStore.set(instanceToTag);

    return () => {
      hideOutline();
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
