import { getComponentMeta, idAttribute } from "@webstudio-is/react-sdk";
import {
  instancesStore,
  selectedInstanceSelectorStore,
  textEditingInstanceIdStore,
} from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";
import {
  type InstanceSelector,
  getAncestorInstanceSelector,
} from "~/shared/tree-utils";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    clickCanvas: undefined;
  }
}

// traverse dom to the root and find all instances
const getInstanceSelectorFromElement = (element: Element) => {
  const instanceSelector: InstanceSelector = [];
  let matched: undefined | Element =
    element.closest(`[${idAttribute}]`) ?? undefined;
  while (matched) {
    const instanceId = matched.getAttribute(idAttribute) ?? undefined;
    if (instanceId !== undefined) {
      instanceSelector.push(instanceId);
    }
    matched = matched.parentElement?.closest(`[${idAttribute}]`) ?? undefined;
  }
  if (instanceSelector.length === 0) {
    return;
  }
  return instanceSelector;
};

const findClosestRichTextInstanceSelector = (
  instanceSelector: InstanceSelector
) => {
  const instances = instancesStore.get();
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (
      instance !== undefined &&
      getComponentMeta(instance.component)?.type === "rich-text"
    ) {
      return getAncestorInstanceSelector(instanceSelector, instanceId);
    }
  }
  return;
};

export const subscribeInstanceSelection = () => {
  let mouseDownElement: undefined | Element = undefined;

  const handleMouseDown = (event: MouseEvent) => {
    mouseDownElement = event.target as Element;
  };

  const handleMouseUp = (event: MouseEvent) => {
    const element = event.target as Element;

    // when user is selecting text inside content editable and mouse goes up
    // on a different instance - we don't want to select a different instance
    // because that would cancel the text selection.
    if (mouseDownElement === undefined || mouseDownElement !== element) {
      return;
    }
    mouseDownElement = undefined;

    // notify whole app about click on document
    // e.g. to hide the side panel
    publish({ type: "clickCanvas" });

    // prevent selecting instances inside text editor while editing text
    if (element.closest("[contenteditable=true]")) {
      return;
    }

    const instanceSelector = getInstanceSelectorFromElement(element);
    if (instanceSelector === undefined) {
      return;
    }

    // the first click in double click or the only one in regular click
    if (event.detail === 1) {
      selectedInstanceSelectorStore.set(instanceSelector);
      // reset text editor when another instance is selected
      textEditingInstanceIdStore.set(undefined);
    }

    // the second click in a double click.
    if (event.detail === 2) {
      const richTextInstanceSelector =
        findClosestRichTextInstanceSelector(instanceSelector);

      // enable text editor when double click on its instance or one of its descendants
      if (richTextInstanceSelector) {
        selectedInstanceSelectorStore.set(richTextInstanceSelector);
        textEditingInstanceIdStore.set(richTextInstanceSelector[0]);
      }
    }
  };

  addEventListener("mousedown", handleMouseDown, { passive: true });
  addEventListener("mouseup", handleMouseUp, { passive: true });

  return () => {
    removeEventListener("mousedown", handleMouseDown);
    removeEventListener("mouseup", handleMouseUp);
  };
};
