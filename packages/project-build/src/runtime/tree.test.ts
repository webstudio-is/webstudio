import { describe, expect, test } from "vitest";
import type { Instance, Props, WsComponentMeta } from "@webstudio-is/sdk";
import {
  blockComponent,
  collectionComponent,
  elementComponent,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  areInstanceSelectorsEqual,
  canDropInstanceSelector,
  findClosestDroppableInstanceSelector,
  getReparentDropTargetMutable,
  isDescendantOrSelf,
  sortInstancePathsForChildMutation,
  wrapEditableChildrenAroundDropTargetMutable,
} from "./tree";

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component,
  children,
});

const metas = new Map<string, WsComponentMeta>();
const props = new Map<string, never>() as Props;

const createTestId = (() => {
  let id = 0;
  return () => `generated-${id++}`;
})();

describe("instance selectors", () => {
  test("compares selectors by every instance id", () => {
    expect(
      areInstanceSelectorsEqual(["child", "root"], ["child", "root"])
    ).toBe(true);
    expect(areInstanceSelectorsEqual(["child"], ["child", "root"])).toBe(false);
    expect(
      areInstanceSelectorsEqual(["child", "root"], ["other", "root"])
    ).toBe(false);
    expect(areInstanceSelectorsEqual(undefined, ["child"])).toBe(false);
  });

  test("detects descendants by selector suffix", () => {
    expect(
      isDescendantOrSelf(["child", "parent", "root"], ["parent", "root"])
    ).toBe(true);
    expect(isDescendantOrSelf(["parent", "root"], ["parent", "root"])).toBe(
      true
    );
    expect(isDescendantOrSelf(["child", "other"], ["parent", "root"])).toBe(
      false
    );
    expect(isDescendantOrSelf(["child"], ["parent", "root"])).toBe(false);
    expect(isDescendantOrSelf(["child"], [])).toBe(true);
  });
});

describe("child mutation order", () => {
  test("sorts deepest children first and later siblings before earlier siblings", () => {
    const body = createInstance("body", "Body", [
      { type: "id", value: "first" },
      { type: "id", value: "second" },
      { type: "id", value: "third" },
    ]);
    const first = createInstance("first", "Box");
    const second = createInstance("second", "Box", [
      { type: "id", value: "nested" },
    ]);
    const third = createInstance("third", "Box");
    const nested = createInstance("nested", "Box");

    const sorted = sortInstancePathsForChildMutation([
      {
        id: "first",
        instancePath: [
          { instance: first, instanceSelector: ["first", "body"] },
          { instance: body, instanceSelector: ["body"] },
        ],
      },
      {
        id: "third",
        instancePath: [
          { instance: third, instanceSelector: ["third", "body"] },
          { instance: body, instanceSelector: ["body"] },
        ],
      },
      {
        id: "nested",
        instancePath: [
          { instance: nested, instanceSelector: ["nested", "second", "body"] },
          { instance: second, instanceSelector: ["second", "body"] },
          { instance: body, instanceSelector: ["body"] },
        ],
      },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["nested", "third", "first"]);
  });
});

describe("drop targets", () => {
  test("wraps editable children around drop target", () => {
    const instances = new Map([
      [
        "paragraph",
        createInstance("paragraph", "Paragraph", [
          { type: "text", value: "left" },
          { type: "id", value: "bold" },
          { type: "text", value: "right" },
        ]),
      ],
      ["bold", createInstance("bold", "Bold")],
    ]);

    const dropTarget = wrapEditableChildrenAroundDropTargetMutable(
      instances,
      props,
      metas,
      { parentSelector: ["paragraph", "body"], position: 1 },
      createTestId
    );

    expect(dropTarget).toEqual({
      parentSelector: ["paragraph", "body"],
      position: 1,
    });
    const paragraphChildren = instances.get("paragraph")?.children;
    expect(paragraphChildren).toEqual([
      { type: "id", value: expect.any(String) },
      { type: "id", value: expect.any(String) },
    ]);
    const [leftSpanChild, rightSpanChild] = paragraphChildren ?? [];
    expect(instances.get(leftSpanChild?.value ?? "")).toMatchObject({
      component: elementComponent,
      tag: "span",
      children: [
        { type: "text", value: "left" },
        { type: "id", value: "bold" },
      ],
    });
    expect(instances.get(rightSpanChild?.value ?? "")).toMatchObject({
      component: elementComponent,
      tag: "span",
      children: [{ type: "text", value: "right" }],
    });
  });

  test("skips wrapping missing and non-rich parents", () => {
    expect(
      wrapEditableChildrenAroundDropTargetMutable(
        new Map(),
        props,
        metas,
        {
          parentSelector: ["missing"],
          position: 0,
        },
        createTestId
      )
    ).toBeUndefined();

    const instances = new Map([
      ["box", createInstance("box", "Box", [{ type: "id", value: "child" }])],
      ["child", createInstance("child", "Box")],
    ]);

    expect(
      wrapEditableChildrenAroundDropTargetMutable(
        instances,
        props,
        metas,
        {
          parentSelector: ["box"],
          position: 0,
        },
        createTestId
      )
    ).toBeUndefined();
    expect(instances.get("box")?.children).toEqual([
      { type: "id", value: "child" },
    ]);
  });

  test("wraps editable children around start and end drop targets", () => {
    const startInstances = new Map([
      [
        "paragraph",
        createInstance("paragraph", "Paragraph", [
          { type: "text", value: "left" },
          { type: "id", value: "bold" },
        ]),
      ],
      ["bold", createInstance("bold", "Bold")],
    ]);

    expect(
      wrapEditableChildrenAroundDropTargetMutable(
        startInstances,
        props,
        metas,
        {
          parentSelector: ["paragraph"],
          position: 0,
        },
        createTestId
      )
    ).toEqual({ parentSelector: ["paragraph"], position: 0 });
    const [rightSpanChild] = startInstances.get("paragraph")?.children ?? [];
    expect(startInstances.get(rightSpanChild?.value ?? "")).toMatchObject({
      component: elementComponent,
      tag: "span",
      children: [
        { type: "text", value: "left" },
        { type: "id", value: "bold" },
      ],
    });

    const endInstances = new Map([
      [
        "paragraph",
        createInstance("paragraph", "Paragraph", [
          { type: "text", value: "left" },
          { type: "id", value: "bold" },
        ]),
      ],
      ["bold", createInstance("bold", "Bold")],
    ]);

    expect(
      wrapEditableChildrenAroundDropTargetMutable(
        endInstances,
        props,
        metas,
        {
          parentSelector: ["paragraph"],
          position: "end",
        },
        createTestId
      )
    ).toEqual({ parentSelector: ["paragraph"], position: 1 });
    const [leftSpanChild] = endInstances.get("paragraph")?.children ?? [];
    expect(endInstances.get(leftSpanChild?.value ?? "")).toMatchObject({
      component: elementComponent,
      tag: "span",
      children: [
        { type: "text", value: "left" },
        { type: "id", value: "bold" },
      ],
    });
  });

  test("resolves collection item and slot targets", () => {
    const instances = new Map([
      [
        "collection",
        createInstance("collection", collectionComponent, [
          { type: "id", value: "slot" },
        ]),
      ],
      [
        "slot",
        createInstance("slot", "Slot", [{ type: "id", value: "fragment" }]),
      ],
      ["fragment", createInstance("fragment", "Fragment")],
    ]);

    expect(
      getReparentDropTargetMutable(
        instances,
        props,
        metas,
        {
          parentSelector: ["missing-item", "collection", "body"],
          position: "end",
        },
        createTestId
      )
    ).toEqual({
      parentSelector: ["collection", "body"],
      position: "end",
    });

    expect(
      getReparentDropTargetMutable(
        instances,
        props,
        metas,
        {
          parentSelector: ["slot", "collection", "body"],
          position: "end",
        },
        createTestId
      )
    ).toEqual({
      parentSelector: ["fragment", "slot", "collection", "body"],
      position: "end",
    });
  });

  test("checks content-model-compatible drop target", () => {
    const instances = new Map([
      [
        "body",
        createInstance("body", "Body", [
          { type: "id", value: "box" },
          { type: "id", value: "list" },
        ]),
      ],
      ["box", createInstance("box", "Box")],
      ["list", createInstance("list", "List", [{ type: "id", value: "item" }])],
      ["item", createInstance("item", "ListItem")],
    ]);

    expect(
      canDropInstanceSelector({
        dragSelector: ["box", "body"],
        dropSelector: ["body"],
        instances,
        props,
        metas: componentMetas,
      })
    ).toBe(true);

    expect(
      canDropInstanceSelector({
        dragSelector: ["box", "body"],
        dropSelector: ["list", "body"],
        instances,
        props,
        metas: componentMetas,
      })
    ).toBe(false);
  });

  test("checks content-mode drop target within the same block", () => {
    const instances = new Map([
      [
        "body",
        createInstance("body", "Body", [
          { type: "id", value: "block" },
          { type: "id", value: "other-block" },
        ]),
      ],
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "first" },
          { type: "id", value: "second" },
        ]),
      ],
      ["first", createInstance("first", "Box")],
      ["second", createInstance("second", "Box")],
      ["other-block", createInstance("other-block", blockComponent)],
    ]);

    expect(
      canDropInstanceSelector({
        dragSelector: ["first", "block", "body"],
        dropSelector: ["block", "body"],
        instances,
        props,
        metas: componentMetas,
        contentMode: true,
      })
    ).toBe(true);

    expect(
      canDropInstanceSelector({
        dragSelector: ["first", "block", "body"],
        dropSelector: ["other-block", "body"],
        instances,
        props,
        metas: componentMetas,
        contentMode: true,
      })
    ).toBe(false);
  });

  test("finds closest droppable selector for canvas inserts and reparenting", () => {
    const instances = new Map([
      [
        "body",
        createInstance("body", "Body", [
          { type: "id", value: "box" },
          { type: "id", value: "list" },
        ]),
      ],
      ["box", createInstance("box", "Box", [{ type: "id", value: "image" }])],
      ["image", createInstance("image", "Image")],
      ["list", createInstance("list", "List", [{ type: "id", value: "item" }])],
      ["item", createInstance("item", "ListItem")],
    ]);

    expect(
      findClosestDroppableInstanceSelector({
        instanceSelector: ["image", "box", "body"],
        dragPayload: { type: "insert", component: elementComponent },
        instances,
        props,
        metas: componentMetas,
      })
    ).toEqual(["box", "body"]);

    expect(
      findClosestDroppableInstanceSelector({
        instanceSelector: ["item", "list", "body"],
        dragPayload: {
          type: "insert",
          component: "ListItem",
          fragment: {
            children: [{ type: "id", value: "new-item" }],
            instances: [createInstance("new-item", "ListItem")],
            props: [],
          },
        },
        instances,
        props,
        metas: componentMetas,
      })
    ).toEqual(["list", "body"]);

    expect(
      findClosestDroppableInstanceSelector({
        instanceSelector: ["list", "body"],
        dragPayload: { type: "reparent", instanceSelector: ["box", "body"] },
        instances,
        props,
        metas: componentMetas,
      })
    ).toBeUndefined();
  });
});
