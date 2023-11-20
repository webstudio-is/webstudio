import type { Instance, Instances } from "@webstudio-is/sdk";
import type { WsComponentMeta } from "./components/component-meta";

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
    if (meta === undefined) {
      return;
    }

    if (ancestors.has(instance.component)) {
      latestIndexes = new Map(latestIndexes);
      latestIndexes.set(instance.component, new Map());
    }

    if (meta.indexWithinAncestor !== undefined) {
      const ancestorIndexes = latestIndexes.get(meta.indexWithinAncestor);
      if (ancestorIndexes !== undefined) {
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
