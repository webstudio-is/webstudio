import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import type {
  Instance,
  InstancesItem,
  Prop,
  StyleDecl,
} from "@webstudio-is/project-build";
import { getBrowserStyle, idAttribute } from "@webstudio-is/react-sdk";
import { subscribe } from "~/shared/pubsub";
import { subscribeWindowResize } from "~/shared/dom-hooks";
import {
  isResizingCanvasStore,
  rootInstanceContainer,
  selectedInstanceBrowserStyleStore,
  selectedInstanceIntanceToTagStore,
  selectedInstanceUnitSizesStore,
} from "~/shared/nano-states";
import htmlTags, { type htmlTags as HtmlTags } from "html-tags";
import { getAllElementsBoundingBox } from "~/shared/dom-utils";
import { subscribeScrollState } from "~/canvas/shared/scroll-state";
import { selectedInstanceOutlineStore } from "~/shared/nano-states";
import type { UnitSizes } from "~/builder/features/style-panel/shared/css-value-input/convert-units";

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

const calculateUnitSizes = (element: HTMLElement): UnitSizes => {
  // Based on this https://stackoverflow.com/questions/1248081/how-to-get-the-browser-viewport-dimensions/8876069#8876069
  // this is crossbrowser way to get viewport sizes vw vh in px
  const vw =
    Math.max(document.documentElement.clientWidth, window.innerWidth) / 100;
  const vh =
    Math.max(document.documentElement.clientHeight, window.innerHeight) / 100;

  // em in px is equal to current computed style for font size
  const em = Number.parseFloat(getComputedStyle(element).fontSize);

  // rem in px is equal to root computed style for font size
  const rem = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize
  );

  // we create a node with 1ch width, measure it in px and remove it
  const node = document.createElement("div");
  node.style.width = "1ch";
  node.style.position = "absolute";
  element.appendChild(node);
  const ch = Number.parseFloat(getComputedStyle(node).width);
  element.removeChild(node);

  return {
    ch, // 1ch in pixels
    vw, // 1vw in pixels
    vh, // 1vh in pixels
    em, // 1em in pixels
    rem, // 1rem in pixels
    px: 1, // always 1, simplifies conversions and types, i.e valueTo = valueFrom * unitSizes[from] / unitSizes[to]
  };
};

export const SelectedInstanceConnector = ({
  instanceElementRef,
  instance,
  instanceStyles,
  instanceProps,
}: {
  instanceElementRef: { current: undefined | HTMLElement };
  instance: InstancesItem;
  instanceStyles: StyleDecl[];
  instanceProps: undefined | Prop[];
}) => {
  const rootInstance = useStore(rootInstanceContainer);

  useEffect(() => {
    const element = instanceElementRef.current;
    if (element === undefined) {
      return;
    }
    const showOutline = () => {
      if (isResizingCanvasStore.get()) {
        return;
      }
      setOutline(instance.id, element);
    };
    // effect close to rendered element also catches dnd remounts
    // so actual state is always provided here
    showOutline();

    const resizeObserver = new ResizeObserver(() => {
      // contentRect has wrong x/y values for absolutely positioned element.
      // getBoundingClientRect is used instead.
      showOutline();
    });
    resizeObserver.observe(element);

    // detect movement of the element within same parent
    // React prevent remount when key stays the same
    const mutationObserver = new window.MutationObserver(() => {
      showOutline();
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

    const unsubscribeIsResizingCanvas = isResizingCanvasStore.subscribe(
      (isResizing) => {
        if (isResizing && selectedInstanceOutlineStore.get()) {
          return hideOutline();
        }
        showOutline();
      }
    );

    const unsubscribeScrollState = subscribeScrollState({
      onScrollStart() {
        hideOutline();
      },
      onScrollEnd() {
        showOutline();
      },
    });

    const unsubscribeWindowResize = subscribeWindowResize({
      onResizeStart() {
        hideOutline();
      },
      onResizeEnd() {
        showOutline();
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
      unsubscribeIsResizingCanvas();
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
