import { atom, computed } from "nanostores";
import type { Instances } from "@webstudio-is/sdk";
import type { InstanceSelector } from "../tree-utils";

export const $isResizingCanvas = atom(false);

export const $selectedInstanceSelector = atom<undefined | InstanceSelector>(
  undefined
);

export const $editingItemSelector = atom<undefined | InstanceSelector>(
  undefined
);

export const $textEditingInstanceSelector = atom<
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
  ["textEditingInstanceSelector", $textEditingInstanceSelector],
  ["isResizingCanvas", $isResizingCanvas],
] as const;
