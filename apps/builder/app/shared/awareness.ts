import { atom, computed, onSet } from "nanostores";
import {
  findPageByIdOrPath,
  Instance,
  Instances,
  ROOT_INSTANCE_ID,
  type Page,
  rootComponent,
} from "@webstudio-is/sdk";
import { $pages } from "./nano-states/pages";
import { $instances, $selectedInstanceSelector } from "./nano-states/instances";

type Awareness = {
  pageId: Page["id"];
  instanceSelector?: Instance["id"][];
};

export const $awareness = atom<undefined | Awareness>();

onSet($awareness, ({ newValue }) => {
  $selectedInstanceSelector.set(newValue?.instanceSelector);
});

export const $selectedPage = computed(
  [$pages, $awareness],
  (pages, awareness) => {
    if (pages === undefined || awareness === undefined) {
      return;
    }
    return findPageByIdOrPath(awareness.pageId, pages);
  }
);

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
  [$instances, $virtualInstances, $temporaryInstances, $awareness],
  (instances, virtualInstances, tempInstances, awareness) => {
    if (awareness?.instanceSelector === undefined) {
      return;
    }
    const [selectedInstanceId] = awareness.instanceSelector;
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
  $awareness,
  (awareness) => {
    const instanceSelector = awareness?.instanceSelector;
    if (instanceSelector) {
      if (instanceSelector[0] === ROOT_INSTANCE_ID) {
        return getInstanceKey(instanceSelector);
      }
      return getInstanceKey([...instanceSelector, ROOT_INSTANCE_ID]);
    }
  }
);

export const $selectedInstanceKey = computed($awareness, (awareness) =>
  getInstanceKey(awareness?.instanceSelector)
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
): InstancePath => {
  const instancePath: InstancePath = [];
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance =
      instances.get(instanceId) ??
      virtualInstances?.get(instanceId) ??
      temporaryInstances?.get(instanceId);
    // collection item can be undefined
    if (instance === undefined) {
      continue;
    }
    instancePath.push({
      instance,
      instanceSelector: instanceSelector.slice(index),
    });
  }
  return instancePath;
};

export const $selectedInstancePath = computed(
  [$instances, $virtualInstances, $temporaryInstances, $awareness],
  (instances, virtualInstances, temporaryInstances, awareness) => {
    const instanceSelector = awareness?.instanceSelector;
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
  [$instances, $virtualInstances, $temporaryInstances, $awareness],
  (instances, virtualInstances, temporaryInstances, awareness) => {
    let instanceSelector = awareness?.instanceSelector;
    if (instanceSelector === undefined) {
      return;
    }
    // add root as ancestor when root is not selected
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

export const selectPage = (pageId: Page["id"]) => {
  const pages = $pages.get();
  if (pages === undefined) {
    return;
  }
  const page = findPageByIdOrPath(pageId, pages);
  if (page === undefined) {
    return;
  }
  $awareness.set({ pageId: page.id, instanceSelector: [page.rootInstanceId] });
};

export const selectInstance = (
  instanceSelector: undefined | Instance["id"][]
) => {
  const awareness = $awareness.get();
  if (awareness) {
    $awareness.set({
      pageId: awareness.pageId,
      instanceSelector,
    });
  }
};
