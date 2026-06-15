import type { Instance, Instances } from "@webstudio-is/sdk";
import {
  normalizeLegacySlotParentInSelectorMutable,
  type DroppableTarget,
} from "./tree-utils";
import { getInstancePath, type InstancePath } from "./nano-states";

export type SharedSlotDetachResult = {
  instancePath: InstancePath;
  newInstanceIds?: Map<Instance["id"], Instance["id"]>;
  fragmentId?: Instance["id"];
  slotId?: Instance["id"];
};

export const findSharedSlotIndex = (instancePath: InstancePath) => {
  return instancePath.findIndex(
    (item, index) =>
      item.instance.component === "Slot" &&
      instancePath[index - 1]?.instance.component === "Fragment"
  );
};

export const getSharedSlotFragmentId = (instancePath: InstancePath) => {
  const slotIndex = findSharedSlotIndex(instancePath);
  return slotIndex === -1
    ? undefined
    : instancePath[slotIndex - 1]?.instance.id;
};

export const isDirectSharedSlotChild = (instancePath: InstancePath) => {
  return findSharedSlotIndex(instancePath) === 2;
};

export const normalizeLegacySlotInstancePathMutable = (
  instances: Instances,
  instancePath: InstancePath
) => {
  const normalizedInstanceSelector = normalizeLegacySlotParentInSelectorMutable(
    instances,
    instancePath[0].instanceSelector
  );
  return getInstancePath(normalizedInstanceSelector, instances) ?? instancePath;
};

export const getSlotFragmentId = (slot: undefined | Instance) => {
  if (slot?.component !== "Slot" || slot.children[0]?.type !== "id") {
    return;
  }
  return slot.children[0].value;
};

const isSameSharedSlotDropTarget = (
  instances: Instances,
  fragmentId: undefined | Instance["id"],
  dropTarget: DroppableTarget
) => {
  if (fragmentId === undefined) {
    return false;
  }
  if (dropTarget.parentSelector.includes(fragmentId)) {
    return true;
  }
  return (
    getSlotFragmentId(instances.get(dropTarget.parentSelector[0])) ===
    fragmentId
  );
};

const remapDropTargetAfterSharedSlotDetach = (
  dropTarget: DroppableTarget,
  detachResult: SharedSlotDetachResult
): DroppableTarget => {
  if (
    detachResult.newInstanceIds === undefined ||
    detachResult.fragmentId === undefined ||
    detachResult.slotId === undefined
  ) {
    return dropTarget;
  }
  const dropTargetSlotIndex = dropTarget.parentSelector.findIndex(
    (instanceId, index) =>
      instanceId === detachResult.slotId &&
      dropTarget.parentSelector[index - 1] === detachResult.fragmentId
  );
  if (dropTargetSlotIndex === -1) {
    return dropTarget;
  }
  return {
    parentSelector: dropTarget.parentSelector.map((instanceId, index) =>
      index < dropTargetSlotIndex
        ? (detachResult.newInstanceIds?.get(instanceId) ?? instanceId)
        : instanceId
    ),
    position: dropTarget.position,
  };
};

export const prepareSlotReparentMutable = ({
  instances,
  instancePath,
  dropTarget,
  detachSharedSlotContentMutable,
}: {
  instances: Instances;
  instancePath: InstancePath;
  dropTarget: DroppableTarget;
  detachSharedSlotContentMutable: (
    instancePath: InstancePath
  ) => SharedSlotDetachResult;
}): { instancePath: InstancePath; dropTarget: DroppableTarget } => {
  const sourceFragmentId = getSharedSlotFragmentId(instancePath);
  const detachResult = isSameSharedSlotDropTarget(
    instances,
    sourceFragmentId,
    dropTarget
  )
    ? { instancePath }
    : detachSharedSlotContentMutable(instancePath);
  return {
    instancePath: detachResult.instancePath,
    dropTarget: remapDropTargetAfterSharedSlotDetach(dropTarget, detachResult),
  };
};
