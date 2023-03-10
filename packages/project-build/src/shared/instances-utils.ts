import type { Instance, Instances, InstancesItem } from "../schema/instances";

const traverseInstances = (
  instances: Instances,
  instanceId: Instance["id"],
  callback: (instance: InstancesItem) => void
) => {
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return;
  }
  callback(instance);
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
