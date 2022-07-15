import { type Instance } from "@webstudio-is/sdk";
import { type DropData } from "~/shared/canvas-components";
import { findClosestAcceptingParent } from "./find-closest-accepting-parent";
import { InstanceInsertionSpec } from "./insert-instance";

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
  const targetInstance = findClosestAcceptingParent(
    rootInstance,
    dropData?.instance || selectedInstance
  );
  return {
    parentId: targetInstance.id,
    position: dropData?.position ?? "end",
  };
};
