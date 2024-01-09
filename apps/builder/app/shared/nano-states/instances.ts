import { atom, computed } from "nanostores";
import type { Instances } from "@webstudio-is/sdk";
import type { InstanceSelector } from "../tree-utils";

export const isResizingCanvasStore = atom(false);

export const $selectedInstanceSelector = atom<undefined | InstanceSelector>(
  undefined
);

export const editingItemIdStore = atom<undefined | string>(undefined);

export const textEditingInstanceSelectorStore = atom<
  undefined | InstanceSelector
>();

export const $instances = atom<Instances>(new Map());

export const selectedInstanceStore = computed(
  [$instances, $selectedInstanceSelector],
  (instances, selectedInstanceSelector) => {
    if (selectedInstanceSelector === undefined) {
      return;
    }
    const [selectedInstanceId] = selectedInstanceSelector;
    return instances.get(selectedInstanceId);
  }
);

export const synchronized$instancess = [
  ["textEditingInstanceSelector", textEditingInstanceSelectorStore],
  ["isResizingCanvas", isResizingCanvasStore],
] as const;
