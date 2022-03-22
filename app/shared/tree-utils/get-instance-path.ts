import { Instance } from "@webstudio-is/sdk";

export const getInstancePath = (
  instance: Instance,
  instanceId: Instance["id"]
) => {
  const path = [];

  const find = (instance: Instance) => {
    if (instance.id === instanceId) return true;
    for (const child of instance.children) {
      if (typeof child === "string") continue;
      const found = find(child);
      if (found) {
        path.push(child);
        return true;
      }
    }
  };

  if (find(instance)) {
    path.push(instance);
  }

  return path.reverse();
};
