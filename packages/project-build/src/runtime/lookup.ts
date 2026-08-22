import type {
  Instance,
  Instances,
  GetInstanceChildren,
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
      for (const child of instance.children ?? []) {
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

type TextEditorLookupInput = {
  instanceSelector: InstanceSelector;
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  htmlTagsByInstanceId?: Map<Instance["id"], string>;
  getInstanceChildren?: GetInstanceChildren;
};

const hasExpressionInTree = (
  instanceId: Instance["id"],
  instances: Instances,
  visited = new Set<Instance["id"]>()
): boolean => {
  if (visited.has(instanceId)) {
    return false;
  }
  visited.add(instanceId);
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return false;
  }
  return instance.children.some(
    (child) =>
      child.type === "expression" ||
      (child.type === "id" &&
        hasExpressionInTree(child.value, instances, visited))
  );
};

const isTextEditorTarget = (
  instanceId: Instance["id"],
  args: TextEditorLookupInput
) =>
  isRichTextTree({
    instanceId,
    instances: args.instances,
    props: args.props,
    metas: args.metas,
    htmlTagsByInstanceId: args.htmlTagsByInstanceId,
  }) && hasExpressionInTree(instanceId, args.instances) === false;

export const findClosestTextEditorTarget = (
  args: TextEditorLookupInput
): undefined | InstanceSelector => {
  let target: InstanceSelector | undefined;
  for (let index = 0; index < args.instanceSelector.length; index += 1) {
    const instanceId = args.instanceSelector[index];
    if (isTextEditorTarget(instanceId, args) === false) {
      break;
    }
    target = args.instanceSelector.slice(index);
  }
  return target;
};

export const findAllNavigableTextInstanceSelectors = (
  args: TextEditorLookupInput
) => {
  const results: InstanceSelector[] = [];
  const visit = (instanceSelector: InstanceSelector) => {
    const [instanceId] = instanceSelector;
    if (instanceId === undefined) {
      return;
    }
    if (isTextEditorTarget(instanceId, args)) {
      results.push(instanceSelector);
      return;
    }
    const instance = args.instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    const children =
      args.getInstanceChildren?.(instance, instanceSelector) ??
      instance.children;
    for (const child of children) {
      if (child.type === "id") {
        visit([child.value, ...instanceSelector]);
      }
    }
  };
  visit(args.instanceSelector);
  return results;
};

export const findTextEditorTarget = (args: TextEditorLookupInput) => {
  return (
    findClosestTextEditorTarget(args) ??
    findAllNavigableTextInstanceSelectors(args)[0]
  );
};
