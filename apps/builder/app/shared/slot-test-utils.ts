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
