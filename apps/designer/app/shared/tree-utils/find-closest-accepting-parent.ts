import { type Instance } from "@webstudio-is/sdk";
import { primitives } from "~/shared/canvas-components";
import { getInstancePath } from "./get-instance-path";

const canInsert = (targetInstance: Instance): boolean => {
  const { canAcceptChild } = primitives[targetInstance.component];
  return canAcceptChild();
};

export const findClosestAcceptingParent = (
  rootInstance: Instance,
  instance?: Instance
): Instance => {
  if (instance === undefined) return rootInstance;
  if (canInsert(instance)) return instance;
  const path = getInstancePath(rootInstance, instance.id).reverse();
  for (const parentInstance of path) {
    if (canInsert(parentInstance)) {
      return parentInstance;
    }
  }
  return rootInstance;
};
