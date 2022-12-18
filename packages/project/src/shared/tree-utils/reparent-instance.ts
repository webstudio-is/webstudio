import { type Instance } from "@webstudio-is/react-sdk";
import { findInstanceById } from "./find-instance";
import { findParentInstance } from "./find-parent-instance";
import { deleteInstanceMutable } from "./delete-instance";
import { insertInstanceMutable } from "./insert-instance";

export const reparentInstanceMutable = (
  rootInstance: Instance,
  instanceId: Instance["id"],
  newParentId: Instance["id"],
  newPosition: number | "end"
) => {
  const instance = findInstanceById(rootInstance, instanceId);
  if (instance === undefined) {
    return;
  }

  if (newPosition === "end") {
    deleteInstanceMutable(rootInstance, instance.id);
    insertInstanceMutable(rootInstance, instance, {
      parentId: newParentId,
      position: "end",
    });
    return;
  }

  let newPositionAdjusted = newPosition;

  // If parent is the same, we need to adjust the position to account for the removal of the instance.
  const currentParent = findParentInstance(rootInstance, instance.id);
  if (currentParent !== undefined && currentParent.id === newParentId) {
    const currentPosition = currentParent.children.findIndex(
      (child) => child.type === "instance" && child.id === instance.id
    );
    if (currentPosition < newPosition) {
      newPositionAdjusted--;
    }
  }

  deleteInstanceMutable(rootInstance, instance.id);
  insertInstanceMutable(rootInstance, instance, {
    parentId: newParentId,
    position: newPositionAdjusted,
  });
};
