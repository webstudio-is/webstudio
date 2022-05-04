import { type Instance } from "@webstudio-is/sdk";

export const findInstanceById = (
  instance: Instance,
  id: Instance["id"]
): Instance | undefined => {
  if (instance.id === id) {
    return instance;
  }

  if (instance.children !== undefined) {
    for (const child of instance.children) {
      if (typeof child === "string") continue;
      const foundInstance = findInstanceById(child, id);
      if (foundInstance !== undefined) return foundInstance;
    }
  }
};
