import type {
  Instance,
  Instances,
  Pages,
  Props,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import { getAllPages } from "@webstudio-is/sdk";
import { isRichTextTree } from "./content-model";
import type { InstancePath, InstanceSelector } from "./instance-path";

export type { InstancePath } from "./instance-path";

export const getInstancePath = (
  instanceSelector: InstanceSelector,
  instances: Instances,
  ...fallbackInstances: Instances[]
): undefined | InstancePath => {
  const instancePath: InstancePath = [];
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance =
      instances.get(instanceId) ??
      fallbackInstances
        .find((instances) => instances.has(instanceId))
        ?.get(instanceId);
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
): { pageId: string; instanceSelector: InstanceSelector } => {
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
  const instanceSelector: InstanceSelector = [];
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

export const findAllEditableInstanceSelector = ({
  instanceSelector,
  instances,
  props,
  metas,
  htmlTagsByInstanceId,
  results,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  htmlTagsByInstanceId?: Map<Instance["id"], string>;
  results: InstanceSelector[];
}) => {
  const [instanceId] = instanceSelector;

  if (instanceId === undefined) {
    return;
  }

  if (
    isRichTextTree({
      instanceId,
      instances,
      props,
      metas,
      htmlTagsByInstanceId,
    })
  ) {
    results.push(instanceSelector);
    return;
  }

  const instance = instances.get(instanceId);
  if (instance) {
    for (const child of instance.children) {
      if (child.type === "id") {
        findAllEditableInstanceSelector({
          instanceSelector: [child.value, ...instanceSelector],
          instances,
          props,
          metas,
          htmlTagsByInstanceId,
          results,
        });
      }
    }
  }
};
