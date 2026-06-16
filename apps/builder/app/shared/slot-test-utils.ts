import { expect } from "vitest";
import type { Instance } from "@webstudio-is/sdk";

export const getSlotFragmentId = (
  instances: Map<Instance["id"], Instance>,
  slotId: Instance["id"]
) => {
  const slot = instances.get(slotId);
  expect(slot?.component).toBe("Slot");
  const [fragmentChild] = slot?.children ?? [];
  expect(fragmentChild?.type).toBe("id");
  const fragmentId = fragmentChild?.value;
  expect(fragmentId).toEqual(expect.any(String));
  expect(instances.get(fragmentId ?? "")?.component).toBe("Fragment");
  return fragmentId;
};

export const expectCanonicalSlots = (
  instances: Map<Instance["id"], Instance>,
  slotIds: Instance["id"][]
) => {
  for (const slotId of slotIds) {
    getSlotFragmentId(instances, slotId);
    expect(instances.get(slotId)?.children).toHaveLength(1);
  }
};

export const expectSlotsShareFragment = (
  instances: Map<Instance["id"], Instance>,
  slotIds: [Instance["id"], Instance["id"], ...Instance["id"][]]
) => {
  expectCanonicalSlots(instances, slotIds);
  const [firstSlotId, ...otherSlotIds] = slotIds;
  const fragmentId = getSlotFragmentId(instances, firstSlotId);
  for (const slotId of otherSlotIds) {
    expect(getSlotFragmentId(instances, slotId)).toBe(fragmentId);
  }
  return fragmentId;
};

export const expectSlotsDoNotShareFragment = (
  instances: Map<Instance["id"], Instance>,
  leftSlotId: Instance["id"],
  rightSlotId: Instance["id"]
) => {
  expectCanonicalSlots(instances, [leftSlotId, rightSlotId]);
  expect(getSlotFragmentId(instances, leftSlotId)).not.toBe(
    getSlotFragmentId(instances, rightSlotId)
  );
};

export const expectSlotTreeIntegrity = (
  instances: Map<Instance["id"], Instance>,
  options: {
    selectedInstanceSelector?: Instance["id"][];
  } = {}
) => {
  const childRefCounts = new Map<Instance["id"], number>();

  for (const instance of instances.values()) {
    const childIds = new Set<Instance["id"]>();
    for (const child of instance.children) {
      if (child.type !== "id") {
        continue;
      }
      expect(
        childIds.has(child.value),
        `${instance.id} references child ${child.value} more than once`
      ).toBe(false);
      childIds.add(child.value);
      childRefCounts.set(
        child.value,
        (childRefCounts.get(child.value) ?? 0) + 1
      );
      expect(
        instances.has(child.value),
        `${instance.id} references missing child ${child.value}`
      ).toBe(true);
    }

    if (instance.component !== "Slot") {
      continue;
    }

    expect(
      instance.children,
      `Slot ${instance.id} must have one Fragment`
    ).toHaveLength(1);
    const fragmentChild = instance.children[0];
    expect(
      fragmentChild?.type,
      `Slot ${instance.id} must reference a Fragment`
    ).toBe("id");
    const fragment = instances.get(fragmentChild?.value ?? "");
    expect(
      fragment?.component,
      `Slot ${instance.id} child must be a Fragment`
    ).toBe("Fragment");
  }

  const selectedInstanceSelector = options.selectedInstanceSelector;
  if (selectedInstanceSelector !== undefined) {
    const [selectedInstanceId] = selectedInstanceSelector;
    expect(instances.has(selectedInstanceId), "selection must resolve").toBe(
      true
    );
    const selectedInstance = instances.get(selectedInstanceId);
    expect(
      selectedInstance?.component,
      "selection must not point at an internal Slot Fragment"
    ).not.toBe("Fragment");

    for (let index = 0; index < selectedInstanceSelector.length; index += 1) {
      const instanceId = selectedInstanceSelector[index];
      const parentId = selectedInstanceSelector[index + 1];
      const instance = instances.get(instanceId);
      expect(
        instance,
        `selector segment ${instanceId} must resolve`
      ).toBeDefined();
      if (parentId === undefined) {
        continue;
      }
      const parent = instances.get(parentId);
      expect(parent, `selector parent ${parentId} must resolve`).toBeDefined();
      expect(
        parent?.children.some(
          (child) => child.type === "id" && child.value === instanceId
        ),
        `selector parent ${parentId} must contain ${instanceId}`
      ).toBe(true);
    }
  }

  for (const instance of instances.values()) {
    if (instance.component !== "Fragment") {
      continue;
    }
    const parentSlots = Array.from(instances.values()).filter(
      (candidate) =>
        candidate.component === "Slot" &&
        candidate.children[0]?.type === "id" &&
        candidate.children[0].value === instance.id
    );
    if (parentSlots.length === 0) {
      continue;
    }
    expect(
      childRefCounts.get(instance.id),
      `Slot Fragment ${instance.id} reference count must match Slot parents`
    ).toBe(parentSlots.length);
  }
};
