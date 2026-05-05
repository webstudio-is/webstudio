import { atom, computed } from "nanostores";
import {
  type Instance,
  type Instances,
  ROOT_INSTANCE_ID,
  rootComponent,
} from "@webstudio-is/sdk";
import { $instances } from "../sync/data-stores";
import type { InstanceSelector } from "../tree-utils";
import { $selectedPage } from "./pages";
import { $selectedInstanceSelector } from "./instance-selection";
export {
  $selectedInstanceSelector,
  selectInstance,
} from "./instance-selection";

export const $isResizingCanvas = atom(false);

export const $editingItemSelector = atom<undefined | InstanceSelector>(
  undefined
);

export const $textEditingInstanceSelector = atom<
  | undefined
  | {
      selector: InstanceSelector;
      reason: "right" | "left" | "enter";
    }
  | {
      selector: InstanceSelector;
      reason: "new";
    }
  | {
      selector: InstanceSelector;
      reason: "click";
      mouseX: number;
      mouseY: number;
    }
  | {
      selector: InstanceSelector;
      reason: "up" | "down";
      cursorX: number;
    }
>();

export const $textEditorContextMenu = atom<
  | {
      cursorRect: DOMRect;
    }
  | undefined
>(undefined);

type ContextMenuCommand =
  | {
      type: "filter";
      value: string;
    }
  | { type: "selectNext" }
  | { type: "selectPrevious" }
  | { type: "enter" };

export const $textEditorContextMenuCommand = atom<
  undefined | ContextMenuCommand
>(undefined);

export const execTextEditorContextMenuCommand = (
  command: ContextMenuCommand
) => {
  $textEditorContextMenuCommand.set(command);
};
export const $temporaryInstances = atom<Instances>(new Map());
export const addTemporaryInstance = (instance: Instance) => {
  $temporaryInstances.get().set(instance.id, instance);
  $temporaryInstances.set($temporaryInstances.get());
};

export const $virtualInstances = computed($selectedPage, (selectedPage) => {
  const virtualInstances: Instances = new Map();
  if (selectedPage) {
    virtualInstances.set(ROOT_INSTANCE_ID, {
      type: "instance",
      id: ROOT_INSTANCE_ID,
      component: rootComponent,
      children: [{ type: "id", value: selectedPage.rootInstanceId }],
    });
  }
  return virtualInstances;
});

export const $selectedInstance = computed(
  [
    $instances,
    $virtualInstances,
    $temporaryInstances,
    $selectedInstanceSelector,
  ],
  (instances, virtualInstances, tempInstances, instanceSelector) => {
    if (instanceSelector === undefined) {
      return;
    }
    const [selectedInstanceId] = instanceSelector;
    return (
      instances.get(selectedInstanceId) ??
      virtualInstances.get(selectedInstanceId) ??
      tempInstances.get(selectedInstanceId)
    );
  }
);

export const getInstanceKey = <
  InstanceSelector extends undefined | Instance["id"][],
>(
  instanceSelector: InstanceSelector
): (InstanceSelector extends undefined ? undefined : never) | string =>
  JSON.stringify(instanceSelector);

export const $selectedInstanceKeyWithRoot = computed(
  $selectedInstanceSelector,
  (instanceSelector) => {
    if (instanceSelector) {
      if (instanceSelector[0] === ROOT_INSTANCE_ID) {
        return getInstanceKey(instanceSelector);
      }
      return getInstanceKey([...instanceSelector, ROOT_INSTANCE_ID]);
    }
  }
);

export const $selectedInstanceKey = computed(
  $selectedInstanceSelector,
  (instanceSelector) => getInstanceKey(instanceSelector)
);

export type InstancePath = Array<{
  instance: Instance;
  instanceSelector: string[];
}>;

export const getInstancePath = (
  instanceSelector: string[],
  instances: Instances,
  virtualInstances?: Instances,
  temporaryInstances?: Instances
): undefined | InstancePath => {
  const instancePath: InstancePath = [];
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance =
      instances.get(instanceId) ??
      virtualInstances?.get(instanceId) ??
      temporaryInstances?.get(instanceId);
    if (instance === undefined) {
      continue;
    }
    instancePath.push({
      instance,
      instanceSelector: instanceSelector.slice(index),
    });
  }
  if (instancePath.length === 0) {
    return;
  }
  return instancePath;
};

export const $selectedInstancePath = computed(
  [
    $instances,
    $virtualInstances,
    $temporaryInstances,
    $selectedInstanceSelector,
  ],
  (instances, virtualInstances, temporaryInstances, instanceSelector) => {
    if (instanceSelector === undefined) {
      return;
    }
    return getInstancePath(
      instanceSelector,
      instances,
      virtualInstances,
      temporaryInstances
    );
  }
);

export const $selectedInstancePathWithRoot = computed(
  [
    $instances,
    $virtualInstances,
    $temporaryInstances,
    $selectedInstanceSelector,
  ],
  (instances, virtualInstances, temporaryInstances, instanceSelector) => {
    if (instanceSelector === undefined) {
      return;
    }
    if (instanceSelector[0] !== ROOT_INSTANCE_ID) {
      instanceSelector = [...instanceSelector, ROOT_INSTANCE_ID];
    }
    return getInstancePath(
      instanceSelector,
      instances,
      virtualInstances,
      temporaryInstances
    );
  }
);
