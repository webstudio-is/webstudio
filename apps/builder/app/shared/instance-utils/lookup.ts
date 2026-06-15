// Lookup utilities answer read-only questions about instance ancestry and
// selection paths. Put path building and cross-page instance discovery here,
// not mutations or store transactions.
import type { Instance, Instances, Pages } from "@webstudio-is/sdk";
import { getAllPages } from "@webstudio-is/sdk";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { getInstancePath } from "../nano-states";
import type { InstanceSelector } from "./tree";

export const findClosestSlot = (
  instances: Instances,
  instanceSelector: InstanceSelector
) => {
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (instance?.component === "Slot") {
      return instance;
    }
  }
};

/**
 * Build the ancestor path array for an instance.
 * Returns an array of labels for all ancestors from root to parent.
 */
export const buildInstancePath = (
  instanceId: Instance["id"],
  pages: Pages,
  instances: Instances
): string[] => {
  const awareness = findPageAndSelectorByInstanceId(
    pages,
    instances,
    instanceId
  );
  if (!awareness.instanceSelector) {
    return [];
  }

  const instancePath = getInstancePath(
    awareness.instanceSelector,
    instances,
    undefined,
    undefined
  );

  if (!instancePath) {
    return [];
  }

  return instancePath
    .slice()
    .reverse()
    .slice(0, -1)
    .map(({ instance }) => getInstanceLabel(instance));
};

const parentInstanceByIdCache = new WeakMap<
  Instances,
  Map<Instance["id"], Instance["id"]>
>();

/**
 * Traverse the instance tree up to the root to find the page and full instance
 * selector for a given instance id. When an instance appears via a slot,
 * the last matching parent is used.
 */
export const findPageAndSelectorByInstanceId = (
  pages: Pages,
  instances: Instances,
  startingInstanceId: Instance["id"]
): { pageId: string; instanceSelector: string[] } => {
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
  const instanceSelector: string[] = [];
  let currentInstanceId: undefined | Instance["id"] = startingInstanceId;
  while (currentInstanceId) {
    instanceSelector.push(currentInstanceId);
    currentInstanceId = parentInstanceById.get(currentInstanceId);
  }
  const rootInstanceId = instanceSelector.at(-1);
  for (const page of getAllPages(pages)) {
    if (page.rootInstanceId === rootInstanceId) {
      return { pageId: page.id, instanceSelector };
    }
  }
  return { pageId: pages.homePageId, instanceSelector };
};
