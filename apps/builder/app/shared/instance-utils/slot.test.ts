import { describe, expect, test, vi } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import type { InstancePath } from "../nano-states";
import {
  findClosestSlot,
  getSharedSlotBoundary,
  getSharedSlotFragmentId,
  getSlotFragmentId,
  getSlotFragmentDropTargetMutable,
  isDirectSharedSlotChild,
  isSharedSlotFragmentPair,
  isSharedSlotBoundaryCrossing,
  normalizeLegacySlotParentInSelectorMutable,
  prepareSlotReparentMutable,
} from "./slot";

const instance = (
  id: string,
  component: string,
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component,
  children,
});

const item = (selector: string[], component: string, children = []) => ({
  instanceSelector: selector,
  instance: instance(selector[0], component, children),
});

describe("slot utils", () => {
  test("finds closest slot in an instance selector", () => {
    const slot = instance("slot", "Slot");
    expect(
      findClosestSlot(
        new Map([
          ["body", instance("body", "Body")],
          ["slot", slot],
          ["box", instance("box", "Box")],
        ]),
        ["box", "slot", "body"]
      )
    ).toBe(slot);
  });

  test("finds shared slot fragment in an instance path", () => {
    const path = [
      item(["box", "fragment", "slot", "body"], "Box"),
      item(["fragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;

    expect(getSharedSlotBoundary(path)).toMatchObject({
      slotIndex: 2,
      fragmentId: "fragment",
      slotId: "slot",
      isDirectChild: true,
    });
    expect(getSharedSlotFragmentId(path)).toBe("fragment");
    expect(isDirectSharedSlotChild(path)).toBe(true);
    expect(isSharedSlotFragmentPair(path[1], path[2])).toBe(true);
    expect(
      getSlotFragmentId(
        instance("slot", "Slot", [{ type: "id", value: "fragment" }])
      )
    ).toBe("fragment");
    expect(
      getSharedSlotBoundary([
        item(["box", "body"], "Box"),
        item(["body"], "Body"),
      ])
    ).toBeUndefined();
  });

  test("keeps same-slot reparent shared without detaching", () => {
    const path = [
      item(["heading", "fragment", "slot1", "body"], "Heading"),
      item(["fragment", "slot1", "body"], "Fragment"),
      item(["slot1", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;
    const detachSharedSlotContentMutable = vi.fn();
    const result = prepareSlotReparentMutable({
      instances: new Map([
        [
          "slot1",
          instance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        ],
      ]),
      instancePath: path,
      dropTarget: {
        parentSelector: ["fragment", "slot1", "body"],
        position: "end",
      },
      detachSharedSlotContentMutable,
    });

    expect(detachSharedSlotContentMutable).not.toHaveBeenCalled();
    expect(result.instancePath).toBe(path);
    expect(result.dropTarget).toEqual({
      parentSelector: ["fragment", "slot1", "body"],
      position: "end",
    });
  });

  test("detects when a move crosses out of shared slot content", () => {
    const path = [
      item(["box", "fragment", "slot", "body"], "Box"),
      item(["fragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;
    const instances = new Map([
      ["slot", instance("slot", "Slot", [{ type: "id", value: "fragment" }])],
    ]);

    expect(
      isSharedSlotBoundaryCrossing(instances, path, {
        parentSelector: ["fragment", "slot", "body"],
        position: "end",
      })
    ).toBe(false);
    expect(
      isSharedSlotBoundaryCrossing(instances, path, {
        parentSelector: ["slot", "body"],
        position: "end",
      })
    ).toBe(false);
    expect(
      isSharedSlotBoundaryCrossing(instances, path, {
        parentSelector: ["body"],
        position: "end",
      })
    ).toBe(true);
  });

  test("keeps reparent shared when target path is inside the same slot fragment", () => {
    const path = [
      item(["box", "fragment", "slot", "body"], "Box"),
      item(["fragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;
    const detachSharedSlotContentMutable = vi.fn();

    const result = prepareSlotReparentMutable({
      instances: new Map(),
      instancePath: path,
      dropTarget: {
        parentSelector: ["box", "fragment", "slot", "body"],
        position: "end",
      },
      detachSharedSlotContentMutable,
    });

    expect(detachSharedSlotContentMutable).not.toHaveBeenCalled();
    expect(result.instancePath).toBe(path);
    expect(result.dropTarget).toEqual({
      parentSelector: ["box", "fragment", "slot", "body"],
      position: "end",
    });
  });

  test("keeps reparent shared when target is the visible slot occurrence", () => {
    const path = [
      item(["box", "fragment", "slot", "body"], "Box"),
      item(["fragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;
    const detachSharedSlotContentMutable = vi.fn();

    const result = prepareSlotReparentMutable({
      instances: new Map([
        ["slot", instance("slot", "Slot", [{ type: "id", value: "fragment" }])],
      ]),
      instancePath: path,
      dropTarget: {
        parentSelector: ["slot", "body"],
        position: "end",
      },
      detachSharedSlotContentMutable,
    });

    expect(detachSharedSlotContentMutable).not.toHaveBeenCalled();
    expect(result.instancePath).toBe(path);
    expect(result.dropTarget).toEqual({
      parentSelector: ["slot", "body"],
      position: "end",
    });
  });

  test("detaches when reparent leaves shared slot content", () => {
    const path = [
      item(["box", "fragment", "slot", "body"], "Box"),
      item(["fragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;
    const detachedPath = [
      item(["newBox", "newFragment", "slot", "body"], "Box"),
      item(["newFragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;

    const result = prepareSlotReparentMutable({
      instances: new Map(),
      instancePath: path,
      dropTarget: {
        parentSelector: ["body"],
        position: "end",
      },
      detachSharedSlotContentMutable: () => ({
        instancePath: detachedPath,
        fragmentId: "fragment",
        slotId: "slot",
        newInstanceIds: new Map([
          ["box", "newBox"],
          ["fragment", "newFragment"],
        ]),
      }),
    });

    expect(result.instancePath).toBe(detachedPath);
    expect(result.dropTarget).toEqual({
      parentSelector: ["body"],
      position: "end",
    });
  });

  test("normalizes matching legacy slot occurrences to one shared fragment", () => {
    const instances = new Map([
      [
        "slot1",
        instance("slot1", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
      ],
      [
        "slot2",
        instance("slot2", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
      ],
      ["box", instance("box", "Box")],
      ["heading", instance("heading", "Heading")],
    ]);

    const dropTarget = getSlotFragmentDropTargetMutable(instances, {
      parentSelector: ["slot1", "body"],
      position: "end",
    });

    const fragmentId = instances.get("slot1")?.children[0]?.value;
    expect(dropTarget).toEqual({
      parentSelector: [fragmentId, "slot1", "body"],
      position: "end",
    });
    expect(instances.get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect(instances.get("slot2")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect(instances.get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "heading" },
    ]);
  });

  test("keeps canonical slot fragment drop target without normalizing", () => {
    const instances = new Map([
      ["slot", instance("slot", "Slot", [{ type: "id", value: "fragment" }])],
      [
        "fragment",
        instance("fragment", "Fragment", [{ type: "id", value: "box" }]),
      ],
      ["box", instance("box", "Box")],
    ]);

    const dropTarget = getSlotFragmentDropTargetMutable(instances, {
      parentSelector: ["slot", "body"],
      position: "end",
    });

    expect(dropTarget).toEqual({
      parentSelector: ["fragment", "slot", "body"],
      position: "end",
    });
    expect(instances.get("slot")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(instances.get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
  });

  test("normalizes matching empty legacy slot occurrences to one shared fragment", () => {
    const instances = new Map([
      ["slot1", instance("slot1", "Slot")],
      ["slot2", instance("slot2", "Slot")],
    ]);

    const dropTarget = getSlotFragmentDropTargetMutable(instances, {
      parentSelector: ["slot1", "body"],
      position: "end",
    });

    const fragmentId = instances.get("slot1")?.children[0]?.value;
    expect(dropTarget).toEqual({
      parentSelector: [fragmentId, "slot1", "body"],
      position: "end",
    });
    expect(instances.get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect(instances.get("slot2")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect(instances.get(fragmentId ?? "")?.children).toEqual([]);
  });

  test("normalizes only legacy slots with the same children", () => {
    const instances = new Map([
      [
        "slot1",
        instance("slot1", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
      ],
      ["slot2", instance("slot2", "Slot", [{ type: "id", value: "box" }])],
      ["box", instance("box", "Box")],
      ["heading", instance("heading", "Heading")],
    ]);

    const normalizedSelector = normalizeLegacySlotParentInSelectorMutable(
      instances,
      ["box", "slot1", "body"]
    );

    const slot1FragmentId = instances.get("slot1")?.children[0]?.value;
    expect(normalizedSelector).toEqual([
      "box",
      slot1FragmentId,
      "slot1",
      "body",
    ]);
    expect(instances.get("slot1")?.children).toEqual([
      { type: "id", value: slot1FragmentId },
    ]);
    expect(instances.get(slot1FragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "heading" },
    ]);
    expect(instances.get("slot2")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
  });
});
