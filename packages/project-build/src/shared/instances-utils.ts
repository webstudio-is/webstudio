import type { Instance, Instances } from "../schema/instances";

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
  const ids = new Set<Instance["id"]>();
  traverseInstances(instances, rootInstanceId, (instance) => {
    ids.add(instance.id);
  });
  return ids;
};

export const findTreeInstanceIdsExcludingSlotDescendants = (
  instances: Instances,
  rootInstanceId: Instance["id"]
) => {
  const ids = new Set<Instance["id"]>();
  traverseInstances(instances, rootInstanceId, (instance) => {
    ids.add(instance.id);
    if (instance.component === "Slot") {
      return false;
    }
  });
  return ids;
};
