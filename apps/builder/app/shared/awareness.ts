import { atom, computed, onSet } from "nanostores";
import {
  findPageByIdOrPath,
  Instance,
  Instances,
  ROOT_INSTANCE_ID,
  type Page,
  rootComponent,
  Pages,
  findParentFolderByChildId,
  getPagePath,
  ROOT_FOLDER_ID,
} from "@webstudio-is/sdk";
import { $pages } from "./nano-states/pages";
import { $instances, $selectedInstanceSelector } from "./nano-states/instances";
import type { InstanceSelector } from "./tree-utils";

export type Awareness = {
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

export const $selectedPagePath = computed(
  [$selectedPage, $pages],
  (page, pages) => {
    if (pages === undefined || page === undefined) {
      return "/";
    }
    const parentFolder = findParentFolderByChildId(page.id, pages.folders);
    const parentFolderId = parentFolder?.id ?? ROOT_FOLDER_ID;
    const foldersPath = getPagePath(parentFolderId, pages);
    return [foldersPath, page?.path ?? ""]
      .filter(Boolean)
      .join("/")
      .replace(/\/+/g, "/");
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
): undefined | InstancePath => {
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
  // all consuming code expect at least one instance to be selected
  // though it is possible to get empty array when undo created page
  if (instancePath.length === 0) {
    return undefined;
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
  if (
    awareness &&
    // prevent triggering select across the builder when selector is the same
    // useful when click and focus events have to select instance
    awareness.instanceSelector?.join() !== instanceSelector?.join()
  ) {
    $awareness.set({
      pageId: awareness.pageId,
      instanceSelector,
    });
  }
};

const findPageId = (pages: Pages, instanceSelector: InstanceSelector) => {
  const rootInstanceId = instanceSelector.at(-1);
  for (const page of [pages.homePage, ...pages.pages]) {
    if (page.rootInstanceId === rootInstanceId) {
      return page.id;
    }
  }
  return pages.homePage.id;
};

const parentInstanceByIdCache = new WeakMap<
  Instances,
  Map<Instance["id"], Instance["id"]>
>();

/**
 * traverse the tree up until body to build awareness
 * when instance id is inside of slot last matching parent is used to further
 */
export const findAwarenessByInstanceId = (
  pages: Pages,
  instances: Instances,
  startingInstanceId: Instance["id"]
): Awareness => {
  // recompute parent instances only when instances are changed
  let parentInstanceById = parentInstanceByIdCache.get(instances);
  if (parentInstanceById === undefined) {
    parentInstanceById = new Map<Instance["id"], Instance["id"]>();
    for (const instance of instances.values()) {
      for (const child of instance.children) {
        if (child.type === "id") {
          parentInstanceById.set(child.value, instance.id);
        }
      }
    }
    parentInstanceByIdCache.set(instances, parentInstanceById);
  }
  const instanceSelector = [];
  let currentInstanceId: undefined | Instance["id"] = startingInstanceId;
  while (currentInstanceId) {
    instanceSelector.push(currentInstanceId);
    currentInstanceId = parentInstanceById.get(currentInstanceId);
  }
  const pageId = findPageId(pages, instanceSelector);
  return { pageId, instanceSelector };
};
