import { describe, expect, test, vi } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import type { InstancePath } from "./nano-states";
import {
  findSharedSlotIndex,
  getSharedSlotFragmentId,
  getSlotFragmentId,
  isDirectSharedSlotChild,
  prepareSlotReparentMutable,
} from "./slot-utils";

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
  test("finds shared slot fragment in an instance path", () => {
    const path = [
      item(["box", "fragment", "slot", "body"], "Box"),
      item(["fragment", "slot", "body"], "Fragment"),
      item(["slot", "body"], "Slot"),
      item(["body"], "Body"),
    ] satisfies InstancePath;

    expect(findSharedSlotIndex(path)).toBe(2);
    expect(getSharedSlotFragmentId(path)).toBe("fragment");
    expect(isDirectSharedSlotChild(path)).toBe(true);
    expect(
      getSlotFragmentId(
        instance("slot", "Slot", [{ type: "id", value: "fragment" }])
      )
    ).toBe("fragment");
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
});
