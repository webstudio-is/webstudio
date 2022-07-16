import { type Instance } from "@webstudio-is/react-sdk";
import { insertInstanceMutable } from "./insert-instance";

type InstanceMoveSpec = {
  id: Instance["id"];
  newParentId: Instance["id"];
  newIndex: number;
};

const extractInstance = (
  treeNode: Instance,
  id: Instance["id"]
): Instance | null => {
  const index = treeNode.children.findIndex(
    (child) => typeof child !== "string" && child.id === id
  );

  if (index !== -1) {
    const instance = treeNode.children[index];

    // for TypeScript
    if (typeof instance === "string") {
      throw new Error("Cannot happen");
    }

    treeNode.children.splice(index, 1);
    return instance;
  }

  for (const child of treeNode.children) {
    if (typeof child !== "string") {
      const extracted = extractInstance(child, id);
      if (extracted !== null) {
        return extracted;
      }
    }
  }

  return null;
};

export const moveInstanceMutable = (
  treeRoot: Instance,
  spec: InstanceMoveSpec
) => {
  const instance = extractInstance(treeRoot, spec.id);

  // mostly for TypeScript
  if (instance === null) {
    throw new Error("Cannot move instance that doesn't exist");
  }

  insertInstanceMutable(treeRoot, instance, {
    parentId: spec.newParentId,
    position: spec.newIndex,
  });

  return treeRoot;
};
