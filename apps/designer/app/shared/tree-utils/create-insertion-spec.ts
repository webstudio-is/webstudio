import { type Instance } from "@webstudio-is/sdk";
import { primitives, type DropData } from "~/shared/canvas-components";
import { getInstancePath } from "./get-instance-path";
import { InstanceInsertionSpec } from "./insert-instance";

const canInsert = (targetInstance: Instance): boolean => {
  const { canAcceptChild } = primitives[targetInstance.component];
  return canAcceptChild();
};

const closestAcceptingParent = (
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

/**
 * Creates an insertion spec based on ability of the target instance to accept a child.
 * It finds a fallback parent in the tree.
 */
export const createInsertionSpec = ({
  dropData,
  selectedInstance,
  rootInstance,
}: {
  dropData?: DropData;
  selectedInstance?: Instance;
  rootInstance: Instance;
}): InstanceInsertionSpec => {
  const targetInstance = closestAcceptingParent(
    rootInstance,
    dropData?.instance || selectedInstance
  );
  return {
    parentId: targetInstance.id,
    position: dropData?.position ?? "end",
  };
};
