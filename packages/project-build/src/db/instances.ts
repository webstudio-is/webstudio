import { Instances, InstancesList } from "../schema/instances";

export const parseInstances = (
  instancesString: string,
  skipValidation = false
): Instances => {
  const instancesList = skipValidation
    ? (JSON.parse(instancesString) as InstancesList)
    : InstancesList.parse(JSON.parse(instancesString));
  return new Map(instancesList.map((prop) => [prop.id, prop]));
};

export const serializeInstances = (instances: Instances) => {
  const instancesList: InstancesList = Array.from(instances.values());
  return JSON.stringify(instancesList);
};
