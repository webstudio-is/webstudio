import type { Instance, Instances } from "@webstudio-is/project-build";
import type { WsComponentMeta } from "./components/component-meta";

export type IndexesOfTypeWithinRequiredAncestors = Map<
  // ancestorInstanceComponent;childInstanceId
  `${Instance["component"]}:${Instance["id"]}`,
  number
>;

export const getIndexesOfTypeWithinRequiredAncestors = (
  metas: Map<Instance["component"], WsComponentMeta>,
  instances: Instances,
  rootIds: Instance["id"][]
) => {
  const requiredAncestors = new Set<Instance["component"]>();
  for (const meta of metas.values()) {
    if (meta.requiredAncestors) {
      for (const ancestorComponent of meta.requiredAncestors) {
        requiredAncestors.add(ancestorComponent);
      }
    }
  }

  const indexes: IndexesOfTypeWithinRequiredAncestors = new Map();

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
    if (requiredAncestors.has(instance.component)) {
      latestIndexes = new Map(latestIndexes);
      latestIndexes.set(instance.component, new Map());
    }

    if (meta.requiredAncestors) {
      for (const ancestorComponent of meta.requiredAncestors) {
        const ancestorIndexes = latestIndexes.get(ancestorComponent);
        if (ancestorIndexes === undefined) {
          continue;
        }
        let index = ancestorIndexes.get(instance.component) ?? -1;
        index += 1;
        ancestorIndexes.set(instance.component, index);
        indexes.set(`${ancestorComponent}:${instance.id}`, index);
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
