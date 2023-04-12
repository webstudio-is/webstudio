import { atom, computed } from "nanostores";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import type {
  Instance,
  Instances,
  InstancesItem,
} from "@webstudio-is/project-build";
import { createInstancesIndex, type InstanceSelector } from "../tree-utils";
import { getElementByInstanceSelector } from "../dom-utils";
import { useSyncInitializeOnce } from "../hook-utils";
import { selectedPageStore } from "./pages";

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

export const instancesStore = atom<Map<InstancesItem["id"], InstancesItem>>(
  new Map()
);
export const useSetInstances = (
  instances: [InstancesItem["id"], InstancesItem][]
) => {
  useSyncInitializeOnce(() => {
    instancesStore.set(new Map(instances));
  });
};

// @todo will be removed soon
const denormalizeTree = (
  instances: Instances,
  rootInstanceId: Instance["id"]
): undefined | Instance => {
  const convertTree = (instance: InstancesItem) => {
    const legacyInstance: Instance = {
      type: "instance",
      id: instance.id,
      component: instance.component,
      label: instance.label,
      children: [],
    };
    for (const child of instance.children) {
      if (child.type === "id") {
        const childInstance = instances.get(child.value);
        if (childInstance) {
          legacyInstance.children.push(convertTree(childInstance));
        }
      } else {
        legacyInstance.children.push(child);
      }
    }
    return legacyInstance;
  };
  const rootInstance = instances.get(rootInstanceId);
  if (rootInstance === undefined) {
    return;
  }
  return convertTree(rootInstance);
};

export const rootInstanceContainer = computed(
  [instancesStore, selectedPageStore],
  (instances, selectedPage) => {
    if (selectedPage === undefined) {
      return undefined;
    }
    return denormalizeTree(instances, selectedPage.rootInstanceId);
  }
);

export const instancesIndexStore = computed(
  rootInstanceContainer,
  createInstancesIndex
);

export const selectedInstanceStore = computed(
  [instancesIndexStore, selectedInstanceSelectorStore],
  (instancesIndex, selectedInstanceSelector) => {
    if (selectedInstanceSelector === undefined) {
      return;
    }
    const [selectedInstanceId] = selectedInstanceSelector;
    return instancesIndex.instancesById.get(selectedInstanceId);
  }
);

export const synchronizedInstancesStores = [
  ["textEditingInstanceSelector", textEditingInstanceSelectorStore],
  ["isResizingCanvas", isResizingCanvasStore],
] as const;
