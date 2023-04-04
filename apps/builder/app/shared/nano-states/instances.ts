import { atom } from "nanostores";
import { getComponentMeta } from "@webstudio-is/react-sdk";

import type { InstanceSelector } from "../tree-utils";
import {
  selectedInstanceSelectorStore,
  selectedInstanceStore,
} from "./nano-states";
import { getElementByInstanceSelector } from "../dom-utils";

export const textEditingInstanceSelectorStore = atom<
  undefined | InstanceSelector
>();

export const enterEditingMode = (event?: KeyboardEvent) => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  const selectedInstance = selectedInstanceStore.get();
  if (
    selectedInstance === undefined ||
    selectedInstanceSelector === undefined
  ) {
    return;
  }

  const meta = getComponentMeta(selectedInstance.component);
  if (meta?.type !== "rich-text") {
    return;
  }

  const element = getElementByInstanceSelector(selectedInstanceSelector);

  if (element === undefined) {
    return;
  }

  // When an event is triggered from the Builder,
  // the canvas element may be unfocused, so it's important to focus the element on the canvas.
  element.focus();

  // Prevents inserting a newline when entering text-editing mode
  event?.preventDefault();
  textEditingInstanceSelectorStore.set(selectedInstanceSelector);
};

export const escapeSelection = () => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  const textEditingInstanceSelector = textEditingInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  // exit text editing mode first without unselecting instance
  if (textEditingInstanceSelector) {
    textEditingInstanceSelectorStore.set(undefined);
    return;
  }
  selectedInstanceSelectorStore.set(undefined);
};

export const synchronizedInstancesStores = [
  ["textEditingInstanceSelector", textEditingInstanceSelectorStore],
] as const;
