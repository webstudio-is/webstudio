import type { WsComponentMeta } from "./schema/component-meta";
import type { Instance, Instances } from "./schema/instances";
import { blockTemplateComponent } from "./core-metas";

export const ROOT_INSTANCE_ID = ":root";

const traverseInstances = (
  instances: Instances,
  instanceId: Instance["id"],
  callback: (instance: Instance) => false | void
) => {
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return;
  }
  const skipTraversingChildren = callback(instance);
  if (skipTraversingChildren === false) {
    return;
  }
  for (const child of instance.children) {
    if (child.type === "id") {
      traverseInstances(instances, child.value, callback);
    }
  }
};

export const findTreeInstanceIds = (
  instances: Instances,
  rootInstanceId: Instance["id"]
) => {
  const ids = new Set<Instance["id"]>([rootInstanceId]);
  traverseInstances(instances, rootInstanceId, (instance) => {
    ids.add(instance.id);
  });
  return ids;
};

export const findTreeInstanceIdsExcludingSlotDescendants = (
  instances: Instances,
  rootInstanceId: Instance["id"]
) => {
  const ids = new Set<Instance["id"]>([rootInstanceId]);
  traverseInstances(instances, rootInstanceId, (instance) => {
    ids.add(instance.id);
    if (instance.component === "Slot") {
      return false;
    }
  });
  return ids;
};

export const parseComponentName = (componentName: string) => {
  const parts = componentName.split(":");
  let namespace: undefined | string;
  let name: string;
  if (parts.length === 1) {
    [name] = parts;
  } else {
    [namespace, name] = parts;
  }
  return [namespace, name] as const;
};

export type IndexesWithinAncestors = Map<Instance["id"], number>;

export const getIndexesWithinAncestors = (
  metas: Map<Instance["component"], WsComponentMeta>,
  instances: Instances,
  rootIds: Instance["id"][]
) => {
  const ancestors = new Set<Instance["component"]>();
  for (const meta of metas.values()) {
    if (meta.indexWithinAncestor !== undefined) {
      ancestors.add(meta.indexWithinAncestor);
    }
  }

  const indexes: IndexesWithinAncestors = new Map();

  const traverseInstances = (
    instances: Instances,
    instanceId: Instance["id"],
    latestIndexes = new Map<
      Instance["component"],
      Map<Instance["component"], number>
    >()
  ) => {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    const meta = metas.get(instance.component);

    // reset for both nested ancestors and block template
    if (ancestors.has(instance.component)) {
      latestIndexes = new Map(latestIndexes);
      latestIndexes.set(instance.component, new Map());
    }
    if (instance.component === blockTemplateComponent) {
      latestIndexes = new Map(latestIndexes);
      for (const key of latestIndexes.keys()) {
        latestIndexes.set(key, new Map());
      }
    }

    if (meta?.indexWithinAncestor !== undefined) {
      const ancestorIndexes = latestIndexes.get(meta.indexWithinAncestor);
      if (ancestorIndexes) {
        let index = ancestorIndexes.get(instance.component) ?? -1;
        index += 1;
        ancestorIndexes.set(instance.component, index);
        indexes.set(instance.id, index);
      }
    }

    for (const child of instance.children) {
      if (child.type === "id") {
        traverseInstances(instances, child.value, latestIndexes);
      }
    }
  };

  const latestIndexes = new Map();
  for (const instanceId of rootIds) {
    traverseInstances(instances, instanceId, latestIndexes);
  }

  return indexes;
};
