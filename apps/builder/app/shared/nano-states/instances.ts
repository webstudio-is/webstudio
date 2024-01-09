import { atom, computed } from "nanostores";
import type { Instances } from "@webstudio-is/sdk";
import type { InstanceSelector } from "../tree-utils";

export const $isResizingCanvas = atom(false);

export const $selectedInstanceSelector = atom<undefined | InstanceSelector>(
  undefined
);

export const $editingItemId = atom<undefined | string>(undefined);

export const textEditingInstanceSelectorStore = atom<
  undefined | InstanceSelector
>();

export const $instances = atom<Instances>(new Map());

export const $selectedInstance = computed(
  [$instances, $selectedInstanceSelector],
  (instances, selectedInstanceSelector) => {
    if (selectedInstanceSelector === undefined) {
      return;
    }
    const [selectedInstanceId] = selectedInstanceSelector;
    return instances.get(selectedInstanceId);
  }
);

export const $synchronizedInstances = [
  ["textEditingInstanceSelector", textEditingInstanceSelectorStore],
  ["isResizingCanvas", $isResizingCanvas],
] as const;
