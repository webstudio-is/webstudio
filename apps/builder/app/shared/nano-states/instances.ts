import { atom, computed } from "nanostores";
import type { Instance, Instances } from "@webstudio-is/project-build";
import type { InstanceSelector } from "../tree-utils";
import type { ItemId } from "node_modules/@webstudio-is/design-system/src/components/tree/item-utils";
import { useMount } from "~/shared/hook-utils/use-mount";

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
