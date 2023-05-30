import { atom, computed } from "nanostores";
import type { Instance, Instances } from "@webstudio-is/project-build";
import type { InstanceSelector } from "../tree-utils";
import { getElementByInstanceSelector } from "../dom-utils";
import { useSyncInitializeOnce } from "../hook-utils";
import { registeredComponentMetasStore } from "./components-meta";

export const isResizingCanvasStore = atom(false);

export const selectedInstanceSelectorStore = atom<undefined | InstanceSelector>(
  undefined
);

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

  const metas = registeredComponentMetasStore.get();
  const meta = metas.get(selectedInstance.component);
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

export const instancesStore = atom<Instances>(new Map());
export const useSetInstances = (instances: [Instance["id"], Instance][]) => {
  useSyncInitializeOnce(() => {
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
