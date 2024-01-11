import { atom, computed } from "nanostores";
import type { Instances } from "@webstudio-is/sdk";
import type { InstanceSelector } from "../tree-utils";

export const isResizingCanvasStore = atom(false);

export const selectedInstanceSelectorStore = atom<undefined | InstanceSelector>(
  undefined
);

export const editingItemIdStore = atom<undefined | string>(undefined);

export const textEditingInstanceSelectorStore = atom<
  undefined | InstanceSelector
>();

export const instancesStore = atom<Instances>(new Map());

export const selectedInstanceStore = computed(
  [instancesStore, selectedInstanceSelectorStore],
  (instances, selectedInstanceSelector) => {
    if (selectedInstanceSelector === undefined) {
      return;
    }
    const [selectedInstanceId] = selectedInstanceSelector;
    return instances.get(selectedInstanceId);
  }
);

export const synchronizedInstancesStores = [
  ["textEditingInstanceSelector", textEditingInstanceSelectorStore],
  ["isResizingCanvas", isResizingCanvasStore],
] as const;
