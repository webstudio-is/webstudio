import { type Instance } from "@webstudio-is/react-sdk";

export const findParentInstance = (
  instance: Instance,
  instanceId: Instance["id"]
): Instance | undefined => {
  const find = (
    childInstance: Instance,
    parentInstance?: Instance
  ): Instance | undefined => {
    if (childInstance.id === instanceId) {
      return parentInstance;
    }
    for (const child of childInstance.children) {
      if (child.type === "text") {
        continue;
      }
      const foundInstance = find(child, childInstance);
      if (foundInstance !== undefined) {
        return foundInstance;
      }
    }
  };
  return find(instance);
};
