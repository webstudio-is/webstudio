// Slot utilities own the business rules for shared Slot content. Put Slot
// Fragment normalization, boundary detection, and Slot-specific drop/reparent
// helpers here; callers decide which user operation is being performed.
import { nanoid } from "nanoid";
import type { Instance, Instances } from "@webstudio-is/sdk";
import type { DroppableTarget, InstanceSelector } from "./tree";
import type { InstancePath } from "../nano-states/instances";

export type SharedSlotDetachResult = {
  instancePath: InstancePath;
  newInstanceIds?: Map<Instance["id"], Instance["id"]>;
  fragmentId?: Instance["id"];
  slotId?: Instance["id"];
};

export type SharedSlotBoundary = {
  slotIndex: number;
  fragmentItem: InstancePath[number];
  slotItem: InstancePath[number];
  slotParentItem?: InstancePath[number];
  fragmentId: Instance["id"];
  slotId: Instance["id"];
  isDirectChild: boolean;
};

// Slot content contract:
// - Slot children are shared content, stored under the Slot's Fragment child.
// - Any edit that stays inside that Fragment must update all occurrences of
//   the same Slot: insert, delete, reorder, wrap, duplicate, and reparent.
// - Moving or copying content into a Slot makes it part of that shared content.
// - Content becomes independent only when it crosses out of the Slot boundary.
// - Unwrapping a direct Slot child crosses that boundary; unwrapping nested
//   descendants inside the Fragment does not.
const findSharedSlotIndex = (instancePath: InstancePath) => {
  return instancePath.findIndex(
    (item, index) =>
      item.instance.component === "Slot" &&
      instancePath[index - 1]?.instance.component === "Fragment"
  );
};

export const getSharedSlotBoundary = (
  instancePath: InstancePath
): undefined | SharedSlotBoundary => {
  const slotIndex = findSharedSlotIndex(instancePath);
  if (slotIndex === -1) {
    return;
  }
  const fragmentItem = instancePath[slotIndex - 1];
  const slotItem = instancePath[slotIndex];
  if (fragmentItem === undefined || slotItem === undefined) {
    return;
  }
  return {
    slotIndex,
    fragmentItem,
    slotItem,
    slotParentItem: instancePath[slotIndex + 1],
    fragmentId: fragmentItem.instance.id,
    slotId: slotItem.instance.id,
    isDirectChild: slotIndex === 2,
  };
};

export const getDirectSharedSlotChildBoundary = (
  instancePath: InstancePath
) => {
  const boundary = getSharedSlotBoundary(instancePath);
  if (boundary?.isDirectChild !== true) {
    return;
  }
  return boundary;
};

export const findClosestSlot = (
  instances: Instances,
  instanceSelector: InstanceSelector
) => {
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (instance?.component === "Slot") {
      return instance;
    }
  }
};

const areInstanceChildrenEqual = (
  left: Instance["children"],
  right: Instance["children"]
) => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((leftChild, index) => {
    const rightChild = right[index];
    if (rightChild === undefined || leftChild.type !== rightChild.type) {
      return false;
    }
    if (leftChild.type === "id") {
      return rightChild.type === "id" && leftChild.value === rightChild.value;
    }
    return leftChild.value === rightChild.value;
  });
};

export const getSlotFragmentDropTargetMutable = (
  instances: Instances,
  dropTarget: DroppableTarget
) => {
  const [parentId] = dropTarget.parentSelector;
  const instance = instances.get(parentId);
  if (instance === undefined) {
    return;
  }
  // Slot content is shared by every rendered occurrence of the same Slot.
  // The Slot stores a single Fragment child as the shared content root; editing
  // inside that Fragment should update all occurrences of the Slot.
  if (instance.component === "Slot") {
    const findReusableFragmentId = (legacyChildren: Instance["children"]) => {
      for (const candidate of instances.values()) {
        if (
          candidate.component !== "Slot" ||
          candidate.children[0]?.type !== "id"
        ) {
          continue;
        }
        const fragment = instances.get(candidate.children[0].value);
        if (
          fragment?.component === "Fragment" &&
          areInstanceChildrenEqual(fragment.children, legacyChildren)
        ) {
          return fragment.id;
        }
      }
    };

    const wrapSlotChildrenWithFragment = () => {
      const legacyChildren = instance.children.map((child) => ({ ...child }));
      const id = findReusableFragmentId(legacyChildren) ?? nanoid();
      if (instances.has(id) === false) {
        instances.set(id, {
          type: "instance",
          id,
          component: "Fragment",
          children: legacyChildren,
        });
      }
      for (const candidate of instances.values()) {
        if (
          candidate.component === "Slot" &&
          (areInstanceChildrenEqual(candidate.children, legacyChildren) ||
            getSlotFragmentId(candidate) === id)
        ) {
          candidate.children = [{ type: "id", value: id }];
        }
      }
      return {
        parentSelector: [id, ...dropTarget.parentSelector],
        position: dropTarget.position,
      };
    };

    if (instance.children.length === 0) {
      return wrapSlotChildrenWithFragment();
    }
    if (instance.children[0].type === "id") {
      const fragmentId = instance.children[0].value;
      const fragment = instances.get(fragmentId);
      if (fragment?.component !== "Fragment") {
        // Legacy slots stored content directly under Slot. Normalize before
        // inserting so the first content child is not mistaken for Fragment.
        return wrapSlotChildrenWithFragment();
      }
      return {
        parentSelector: [fragmentId, ...dropTarget.parentSelector],
        position: dropTarget.position,
      };
    }
    return wrapSlotChildrenWithFragment();
  }
  return;
};

export const normalizeLegacySlotParentInSelectorMutable = (
  instances: Instances,
  instanceSelector: InstanceSelector
) => {
  const parentSelector = instanceSelector.slice(1);
  const dropTarget = getSlotFragmentDropTargetMutable(instances, {
    parentSelector,
    position: "end",
  });
  if (dropTarget === undefined) {
    return instanceSelector;
  }
  return [instanceSelector[0], ...dropTarget.parentSelector];
};

export const normalizeLegacySlotInstancePathMutable = (
  instances: Instances,
  instancePath: InstancePath
) => {
  const normalizedInstanceSelector = normalizeLegacySlotParentInSelectorMutable(
    instances,
    instancePath[0].instanceSelector
  );
  return (
    getInstancePathFromInstances(normalizedInstanceSelector, instances) ??
    instancePath
  );
};

const getInstancePathFromInstances = (
  instanceSelector: InstanceSelector,
  instances: Instances
): undefined | InstancePath => {
  const instancePath: InstancePath = [];
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      continue;
    }
    instancePath.push({
      instance,
      instanceSelector: instanceSelector.slice(index),
    });
  }
  if (instancePath.length === 0) {
    return;
  }
  return instancePath;
};

export const getSlotFragmentId = (slot: undefined | Instance) => {
  if (slot?.component !== "Slot" || slot.children[0]?.type !== "id") {
    return;
  }
  return slot.children[0].value;
};

export const prepareSlotReparentMutable = ({
  instancePath,
  dropTarget,
}: {
  instancePath: InstancePath;
  dropTarget: DroppableTarget;
}): { instancePath: InstancePath; dropTarget: DroppableTarget } => {
  return {
    instancePath,
    dropTarget,
  };
};
