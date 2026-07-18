import { describe, expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import { applyBuilderPatchTransactions } from "../state/patch";
import {
  attachSharedSlot,
  extractSharedSlot,
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
  test("attaches another occurrence of a shared slot", () => {
    const instances = new Map([
      ["body", instance("body", "Body", [{ type: "id", value: "source" }])],
      [
        "source",
        instance("source", "Slot", [{ type: "id", value: "fragment" }]),
      ],
      [
        "fragment",
        instance("fragment", "Fragment", [{ type: "id", value: "heading" }]),
      ],
      ["heading", instance("heading", "Heading")],
      ["target", instance("target", "Box")],
    ]);
    const mutation = attachSharedSlot(
      { instances, props: new Map() },
      { sourceSlotId: "source", parentInstanceId: "target" },
      { createId: () => "attached" }
    );
    const updated = applyBuilderPatchTransactions(
      { instances, props: new Map() },
      [{ id: "attach-slot", payload: mutation.payload }]
    ).state.instances;

    expect(mutation.result).toEqual({
      slotId: "attached",
      fragmentId: "fragment",
    });
    expect(updated?.get("attached")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(updated?.get("target")?.children).toEqual([
      { type: "id", value: "attached" },
    ]);
  });

  test("attaches a shared slot inside another slot content fragment", () => {
    const instances = new Map([
      ["body", instance("body", "Body")],
      [
        "source",
        instance("source", "Slot", [{ type: "id", value: "source-fragment" }]),
      ],
      [
        "source-fragment",
        instance("source-fragment", "Fragment", [
          { type: "id", value: "heading" },
        ]),
      ],
      ["heading", instance("heading", "Heading")],
      [
        "target",
        instance("target", "Slot", [{ type: "id", value: "target-fragment" }]),
      ],
      ["target-fragment", instance("target-fragment", "Fragment")],
    ]);
    const mutation = attachSharedSlot(
      { instances, props: new Map() },
      { sourceSlotId: "source", parentInstanceId: "target" },
      { createId: () => "nested" }
    );
    const updated = applyBuilderPatchTransactions(
      { instances, props: new Map() },
      [{ id: "attach-nested-slot", payload: mutation.payload }]
    ).state.instances;

    expect(updated?.get("target")?.children).toEqual([
      { type: "id", value: "target-fragment" },
    ]);
    expect(updated?.get("target-fragment")?.children).toEqual([
      { type: "id", value: "nested" },
    ]);
    expect(updated?.get("nested")?.children).toEqual([
      { type: "id", value: "source-fragment" },
    ]);
  });

  test("normalizes an empty target slot before nesting a shared slot", () => {
    const instances = new Map([
      [
        "source",
        instance("source", "Slot", [{ type: "id", value: "source-fragment" }]),
      ],
      ["source-fragment", instance("source-fragment", "Fragment")],
      ["target", instance("target", "Slot")],
    ]);
    const ids = ["nested", "target-fragment"];
    const mutation = attachSharedSlot(
      { instances, props: new Map() },
      { sourceSlotId: "source", parentInstanceId: "target" },
      { createId: () => ids.shift() ?? "unexpected" }
    );
    const updated = applyBuilderPatchTransactions(
      { instances, props: new Map() },
      [{ id: "attach-empty-slot", payload: mutation.payload }]
    ).state.instances;

    expect(updated?.get("target")?.children).toEqual([
      { type: "id", value: "target-fragment" },
    ]);
    expect(updated?.get("target-fragment")?.children).toEqual([
      { type: "id", value: "nested" },
    ]);
  });

  test("extracts a subtree into canonical shared slot content", () => {
    const instances = new Map([
      ["body", instance("body", "Body", [{ type: "id", value: "section" }])],
      [
        "section",
        instance("section", "Box", [{ type: "id", value: "heading" }]),
      ],
      ["heading", instance("heading", "Heading")],
    ]);
    const ids = ["slot", "fragment"];
    const mutation = extractSharedSlot(
      { instances, props: new Map() },
      { instanceSelector: ["section", "body"], label: "Shared section" },
      { createId: () => ids.shift() ?? "unexpected" }
    );
    const updated = applyBuilderPatchTransactions(
      { instances, props: new Map() },
      [{ id: "extract-slot", payload: mutation.payload }]
    ).state.instances;

    expect(updated?.get("body")?.children).toEqual([
      { type: "id", value: "slot" },
    ]);
    expect(updated?.get("slot")).toMatchObject({
      component: "Slot",
      label: "Shared section",
      children: [{ type: "id", value: "fragment" }],
    });
    expect(updated?.get("fragment")?.children).toEqual([
      { type: "id", value: "section" },
    ]);
  });

  test("explains the required selector order when the parent is invalid", () => {
    const instances = new Map([
      ["body", instance("body", "Body", [{ type: "id", value: "section" }])],
      ["section", instance("section", "Box")],
    ]);

    expect(() =>
      extractSharedSlot(
        { instances, props: new Map() },
        { instanceSelector: ["body", "section"] },
        { createId: () => "unused" }
      )
    ).toThrow(
      "instanceSelector must use leaf-to-root order: instanceSelector[1] must be the direct parent of instanceSelector[0]"
    );
  });

  test("rejects attaching shared content inside itself", () => {
    const instances = new Map([
      [
        "source",
        instance("source", "Slot", [{ type: "id", value: "fragment" }]),
      ],
      [
        "fragment",
        instance("fragment", "Fragment", [{ type: "id", value: "section" }]),
      ],
      ["section", instance("section", "Box")],
    ]);

    expect(() =>
      attachSharedSlot(
        { instances, props: new Map() },
        { sourceSlotId: "source", parentInstanceId: "section" },
        { createId: () => "attached" }
      )
    ).toThrow("Shared Slot cannot be attached inside its own content");
  });

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
