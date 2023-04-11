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
  selectedInstanceUnitSizesStore,
} from "~/shared/nano-states";
import htmlTags, { type htmlTags as HtmlTags } from "html-tags";
import { getAllElementsBoundingBox } from "~/shared/dom-utils";
import { subscribeScrollState } from "~/canvas/shared/scroll-state";
import { selectedInstanceOutlineStore } from "~/shared/nano-states";

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

const calculateUnitSizes = (element: HTMLElement) => {
  // Based on this https://stackoverflow.com/questions/1248081/how-to-get-the-browser-viewport-dimensions/8876069#8876069
  // this is crossbrowser way to get viewport sizes vw vh in px
  const vw =
    Math.max(document.documentElement.clientWidth, window.innerWidth) / 100;
  const vh =
    Math.max(document.documentElement.clientHeight, window.innerHeight) / 100;

  // em is equal to current computed style for font size
  const em = Number.parseFloat(getComputedStyle(element).fontSize);

  // rem is equal to root computed style for font size
  const rem = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize
  );

  // we create a node with 1ch width, measure it and remove it
  const node = document.createElement("div");
  node.style.width = "1ch";
  node.style.position = "absolute";
  element.appendChild(node);
  const ch = Number.parseFloat(getComputedStyle(node).width);
  element.removeChild(node);

  return {
    ch,
    vw,
    vh,
    em,
    rem,
    px: 1,
  };
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

    const unitSizes = calculateUnitSizes(element);
    selectedInstanceUnitSizesStore.set(unitSizes);

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
