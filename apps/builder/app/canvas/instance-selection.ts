import { getInstanceSelectorFromElement } from "~/shared/dom-utils";
import { findClosestEditableInstanceSelector } from "~/shared/instance-utils";
import {
  instancesStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
} from "~/shared/nano-states";
import { textEditingInstanceSelectorStore } from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    clickCanvas: undefined;
  }
}

export const subscribeInstanceSelection = () => {
  let pointerDownElement: undefined | Element = undefined;
  let lastPointerUpTime = 0;
  let clickCount = 1;

  const handlePointerDown = (event: PointerEvent) => {
    pointerDownElement = event.target as Element;
    // track multiple clicks when pointerdown is fired within 500ms after last pointerup
    const currentTime = performance.now();
    if (currentTime - lastPointerUpTime < 500) {
      clickCount += 1;
    } else {
      clickCount = 1;
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    const element = event.target as Element;

    // when user is selecting text inside content editable and mouse goes up
    // on a different instance - we don't want to select a different instance
    // because that would cancel the text selection.
    if (pointerDownElement === undefined || pointerDownElement !== element) {
      return;
    }
    pointerDownElement = undefined;

    // track double clicks manually because pointer events do not support event.detail
    // for clicks count
    lastPointerUpTime = performance.now();

    if (clickCount === 1) {
      // notify whole app about click on document
      // e.g. to hide the side panel
      publish({ type: "clickCanvas" });
    }

    // prevent selecting instances inside text editor while editing text
    if (element.closest("[contenteditable=true]")) {
      return;
    }

    const instanceSelector = getInstanceSelectorFromElement(element);
    if (instanceSelector === undefined) {
      return;
    }

    // the first click in double click or the only one in regular click
    if (clickCount === 1) {
      selectedInstanceSelectorStore.set(instanceSelector);
      // reset text editor when another instance is selected
      textEditingInstanceSelectorStore.set(undefined);
      selectedStyleSourceSelectorStore.set(undefined);
    }

    // the second click in a double click.
    if (clickCount === 2) {
      const editableInstanceSelector = findClosestEditableInstanceSelector(
        instanceSelector,
        instancesStore.get(),
        registeredComponentMetasStore.get()
      );

      // enable text editor when double click on its instance or one of its descendants
      if (editableInstanceSelector) {
        selectedInstanceSelectorStore.set(editableInstanceSelector);
        textEditingInstanceSelectorStore.set(editableInstanceSelector);
        selectedStyleSourceSelectorStore.set(undefined);
      }
    }
  };

  addEventListener("pointerdown", handlePointerDown, { passive: true });
  addEventListener("pointerup", handlePointerUp, { passive: true });

  return () => {
    removeEventListener("pointerdown", handlePointerDown);
    removeEventListener("pointerup", handlePointerUp);
  };
};
