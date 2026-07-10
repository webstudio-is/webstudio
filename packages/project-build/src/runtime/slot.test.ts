import { describe, expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import {
  findClosestSlot,
  getDirectSharedSlotChildBoundary,
  getSharedSlotBoundary,
  getSlotFragmentDropTargetMutable,
  normalizeLegacySlotParentInSelectorMutable,
  prepareSlotReparentMutable,
  type InstancePath,
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

const expectSlotsShareFragment = (
  instances: Map<Instance["id"], Instance>,
  slotIds: [string, string, ...string[]]
) => {
  const fragmentIds = slotIds.map((slotId) => {
    const child = instances.get(slotId)?.children[0];
    expect(child?.type).toBe("id");
    return child?.type === "id" ? child.value : undefined;
  });
  expect(new Set(fragmentIds).size).toBe(1);
  expect(instances.get(fragmentIds[0] ?? "")?.component).toBe("Fragment");
};

describe("runtime slot utilities", () => {
  test("finds closest slot and shared slot boundary", () => {
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
    expect(getDirectSharedSlotChildBoundary(path)).toMatchObject({
      fragmentId: "fragment",
      slotId: "slot",
    });
  });

  test("keeps reparent input shared", () => {
    const path = [
      item(["box", "fragment", "slot", "body"], "Box"),
      item(["fragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;
    const dropTarget = {
      parentSelector: ["body"],
      position: "end" as const,
    };

    expect(
      prepareSlotReparentMutable({ instancePath: path, dropTarget })
    ).toEqual({
      instancePath: path,
      dropTarget,
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

    const dropTarget = getSlotFragmentDropTargetMutable(
      instances,
      {
        parentSelector: ["slot1", "body"],
        position: "end",
      },
      () => "fragment"
    );

    expect(dropTarget).toEqual({
      parentSelector: ["fragment", "slot1", "body"],
      position: "end",
    });
    expectSlotsShareFragment(instances, ["slot1", "slot2"]);
    expect(instances.get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "heading" },
    ]);
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
      ["box", "slot1", "body"],
      () => "fragment"
    );

    expect(normalizedSelector).toEqual(["box", "fragment", "slot1", "body"]);
    expect(instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(instances.get("slot2")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
  });

  test("normalizes generated mixed slot shapes to canonical shared fragments", () => {
    const childSets = [["box"], ["box", "heading"], []];

    for (const [childSetIndex, childIds] of childSets.entries()) {
      for (let shapeMask = 0; shapeMask < 16; shapeMask += 1) {
        const fragmentId = `fragment${childSetIndex}-${shapeMask}`;
        const instances = new Map<Instance["id"], Instance>();
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
        const dropTarget = getSlotFragmentDropTargetMutable(
          instances,
          {
            parentSelector: [targetSlotId, "body"],
            position: "end",
          },
          () => `generated-${childSetIndex}-${shapeMask}`
        );
        expect(dropTarget).toBeDefined();
        const normalizedFragmentId =
          canonicalSlotIds.length === 0
            ? dropTarget?.parentSelector[0]
            : fragmentId;

        expect(dropTarget).toEqual({
          parentSelector: [normalizedFragmentId, targetSlotId, "body"],
          position: "end",
        });
        expectSlotsShareFragment(instances, [
          canonicalSlotIds[0] ?? legacySlotIds[0],
          canonicalSlotIds[1] ?? legacySlotIds[1],
          ...[...canonicalSlotIds.slice(2), ...legacySlotIds.slice(2)],
        ] as [string, string, ...string[]]);
      }
    }
  });
});
