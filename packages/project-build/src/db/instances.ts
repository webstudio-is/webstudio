import { Instances, Instance } from "@webstudio-is/sdk";

export const parseInstances = (instancesString: string): Instances => {
  const instancesList = JSON.parse(instancesString) as Instance[];
  return new Map(instancesList.map((prop) => [prop.id, prop]));
};

export const serializeInstances = (instances: Instances) => {
  const instancesList: Instance[] = Array.from(instances.values());
  return JSON.stringify(instancesList);
};
