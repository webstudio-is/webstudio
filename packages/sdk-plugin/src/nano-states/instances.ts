import { atom, computed } from "nanostores";
import type { Instance, Instances } from "@webstudio-is/sdk";
import { type EffectCallback, useEffect } from "react";

export const useMount = (effect: EffectCallback) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
};

type ItemId = string;
type InstanceSelector = Instance["id"][];

export const isResizingCanvasStore = atom(false);

export const selectedInstanceSelectorStore = atom<undefined | InstanceSelector>(
  undefined
);

export const editingItemIdStore = atom<undefined | ItemId>(undefined);

export const textEditingInstanceSelectorStore = atom<
  undefined | InstanceSelector
>();

export const instancesStore = atom<Instances>(new Map());
export const useSetInstances = (instances: [Instance["id"], Instance][]) => {
  useMount(() => {
    instancesStore.set(new Map(instances));
  });
};

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
