import { type Instance } from "@webstudio-is/react-sdk";

// @todo should be optimized because it will be a frequent operation on a potentially large tree.
export const findInstanceById = (
  instance: Instance,
  id: Instance["id"]
): Instance | undefined => {
  if (instance.id === id) {
    return instance;
  }

  if (instance.children !== undefined) {
    for (const child of instance.children) {
      if (child.type === "text") {
        continue;
      }
      const foundInstance = findInstanceById(child, id);
      if (foundInstance !== undefined) {
        return foundInstance;
      }
    }
  }
};
