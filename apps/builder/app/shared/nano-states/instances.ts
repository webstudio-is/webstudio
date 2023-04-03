import { atom } from "nanostores";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import type { InstanceSelector } from "../tree-utils";
import {
  selectedInstanceSelectorStore,
  selectedInstanceStore,
} from "./nano-states";

export const textEditingInstanceSelectorStore = atom<
  undefined | InstanceSelector
>();

export const enterEditingMode = (event: KeyboardEvent) => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  const selectedInstance = selectedInstanceStore.get();
  if (
    selectedInstance === undefined ||
    selectedInstanceSelector === undefined
  ) {
    return;
  }
  const meta = getComponentMeta(selectedInstance.component);
  if (meta?.type === "rich-text") {
    // Prevents inserting a newline when entering text-editing mode
    event.preventDefault();
    textEditingInstanceSelectorStore.set(selectedInstanceSelector);
  }
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
