import { describe, expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import type { InstancePath } from "../nano-states";
import {
  findClosestSlot,
  getDirectSharedSlotChildBoundary,
  getSharedSlotBoundary,
  getSlotFragmentId,
  getSlotFragmentDropTargetMutable,
  normalizeLegacySlotParentInSelectorMutable,
  prepareSlotReparentMutable,
} from "./slot";
import {
  expectSlotTreeIntegrity,
  expectSlotsShareFragment,
} from "../slot-test-utils";

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
      slotParentItem: path[3],
      fragmentId: "fragment",
      slotId: "slot",
      isDirectChild: true,
    });
    expect(getDirectSharedSlotChildBoundary(path)).toMatchObject({
      fragmentId: "fragment",
      slotId: "slot",
    });
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

    const nestedPath = [
      item(["text", "box", "fragment", "slot", "body"], "Text"),
      item(["box", "fragment", "slot", "body"], "Box"),
      item(["fragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;
    expect(getSharedSlotBoundary(nestedPath)).toMatchObject({
      slotIndex: 3,
      fragmentId: "fragment",
      slotId: "slot",
      isDirectChild: false,
    });
    expect(getDirectSharedSlotChildBoundary(nestedPath)).toBeUndefined();
  });

  test("keeps same-slot reparent shared without detaching", () => {
    const path = [
      item(["heading", "fragment", "slot1", "body"], "Heading"),
      item(["fragment", "slot1", "body"], "Fragment"),
      item(["slot1", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;
    const result = prepareSlotReparentMutable({
      instancePath: path,
      dropTarget: {
        parentSelector: ["fragment", "slot1", "body"],
        position: "end",
      },
    });

    expect(result.instancePath).toBe(path);
    expect(result.dropTarget).toEqual({
      parentSelector: ["fragment", "slot1", "body"],
      position: "end",
    });
  });

  test("keeps reparent shared when target path is inside the same slot fragment", () => {
    const path = [
      item(["box", "fragment", "slot", "body"], "Box"),
      item(["fragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;
    const result = prepareSlotReparentMutable({
      instancePath: path,
      dropTarget: {
        parentSelector: ["box", "fragment", "slot", "body"],
        position: "end",
      },
    });

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
    const result = prepareSlotReparentMutable({
      instancePath: path,
      dropTarget: {
        parentSelector: ["slot", "body"],
        position: "end",
      },
    });

    expect(result.instancePath).toBe(path);
    expect(result.dropTarget).toEqual({
      parentSelector: ["slot", "body"],
      position: "end",
    });
  });

  test("keeps reparent shared when target leaves shared slot content", () => {
    const path = [
      item(["box", "fragment", "slot", "body"], "Box"),
      item(["fragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;
    const result = prepareSlotReparentMutable({
      instancePath: path,
      dropTarget: {
        parentSelector: ["body"],
        position: "end",
      },
    });

    expect(result.instancePath).toBe(path);
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

  test("normalizes legacy slot occurrence to existing canonical shared fragment", () => {
    const instances = new Map([
      ["slot1", instance("slot1", "Slot", [{ type: "id", value: "fragment" }])],
      [
        "fragment",
        instance("fragment", "Fragment", [{ type: "id", value: "box" }]),
      ],
      ["slot2", instance("slot2", "Slot", [{ type: "id", value: "box" }])],
      ["box", instance("box", "Box")],
    ]);

    const dropTarget = getSlotFragmentDropTargetMutable(instances, {
      parentSelector: ["slot2", "body"],
      position: "end",
    });

    expect(dropTarget).toEqual({
      parentSelector: ["fragment", "slot2", "body"],
      position: "end",
    });
    expect(instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(instances.get("slot2")?.children).toEqual([
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

  test("normalizes empty legacy slot occurrence to existing empty canonical fragment", () => {
    const instances = new Map([
      ["slot1", instance("slot1", "Slot", [{ type: "id", value: "fragment" }])],
      ["fragment", instance("fragment", "Fragment")],
      ["slot2", instance("slot2", "Slot")],
    ]);

    const dropTarget = getSlotFragmentDropTargetMutable(instances, {
      parentSelector: ["slot2", "body"],
      position: "end",
    });

    expect(dropTarget).toEqual({
      parentSelector: ["fragment", "slot2", "body"],
      position: "end",
    });
    expect(instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(instances.get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(instances.get("fragment")?.children).toEqual([]);
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

  test("normalizes generated mixed slot shapes to canonical shared fragments", () => {
    const childSets = [
      ["box"],
      ["box", "heading"],
      ["box", "heading", "paragraph"],
      [],
    ];

    for (const [childSetIndex, childIds] of childSets.entries()) {
      for (let shapeMask = 0; shapeMask < 16; shapeMask += 1) {
        const fragmentId = `fragment${childSetIndex}-${shapeMask}`;
        const instances = new Map<Instance["id"], Instance>();
        instances.set("body", instance("body", "Body"));
        for (const childId of childIds) {
          instances.set(childId, instance(childId, "Box"));
        }
        instances.set(
          fragmentId,
          instance(
            fragmentId,
            "Fragment",
            childIds.map((childId) => ({ type: "id" as const, value: childId }))
          )
        );

        const canonicalSlotIds: string[] = [];
        const legacySlotIds: string[] = [];
        for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
          const slotId = `slot${childSetIndex}-${shapeMask}-${slotIndex}`;
          const isCanonical = (shapeMask & (1 << slotIndex)) !== 0;
          if (isCanonical) {
            canonicalSlotIds.push(slotId);
            instances.set(
              slotId,
              instance(slotId, "Slot", [{ type: "id", value: fragmentId }])
            );
          } else {
            legacySlotIds.push(slotId);
            instances.set(
              slotId,
              instance(
                slotId,
                "Slot",
                childIds.map((childId) => ({
                  type: "id" as const,
                  value: childId,
                }))
              )
            );
          }
        }
        if (legacySlotIds.length === 0) {
          continue;
        }

        const targetSlotId = legacySlotIds[0];
        const dropTarget = getSlotFragmentDropTargetMutable(instances, {
          parentSelector: [targetSlotId, "body"],
          position: "end",
        });
        expect(dropTarget).toBeDefined();
        if (dropTarget === undefined) {
          throw new Error("Expected slot drop target");
        }
        const normalizedFragmentId =
          canonicalSlotIds.length === 0
            ? dropTarget.parentSelector[0]
            : fragmentId;

        expect(dropTarget).toEqual({
          parentSelector: [normalizedFragmentId, targetSlotId, "body"],
          position: "end",
        });
        if (canonicalSlotIds.length === 0) {
          expect(normalizedFragmentId).not.toBe(fragmentId);
        }
        expectSlotTreeIntegrity(instances);
        const slotIds = [...canonicalSlotIds, ...legacySlotIds];
        expectSlotsShareFragment(
          instances,
          slotIds as [string, string, ...string[]]
        );
      }
    }
  });
});
