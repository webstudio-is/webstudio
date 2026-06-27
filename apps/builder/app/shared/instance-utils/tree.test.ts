import { expect, test } from "vitest";
import type { Instance, Props, WsComponentMeta } from "@webstudio-is/sdk";
import { collectionComponent, elementComponent } from "@webstudio-is/sdk";
import {
  areInstanceSelectorsEqual,
  getReparentDropTargetMutable,
  isDescendantOrSelf,
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

test("compares instance selectors", () => {
  expect(areInstanceSelectorsEqual(["child", "body"], ["child", "body"])).toBe(
    true
  );
  expect(areInstanceSelectorsEqual(["child"], ["other"])).toBe(false);
  expect(areInstanceSelectorsEqual(undefined, ["child"])).toBe(false);
  expect(areInstanceSelectorsEqual(undefined, undefined)).toBe(false);
});

test("is descendant or self", () => {
  expect(isDescendantOrSelf(["1", "2", "3"], [])).toBe(true);
  expect(isDescendantOrSelf(["1", "2", "3"], ["1", "2", "3"])).toBe(true);
  expect(isDescendantOrSelf(["0", "1", "2", "3"], ["1", "2", "3"])).toBe(true);
  expect(isDescendantOrSelf(["1", "2", "3"], ["0", "1", "2", "3"])).toBe(false);
  expect(
    isDescendantOrSelf(
      ["item-child", "collection:entry-1", "collection", "body", "page-root"],
      ["collection", "body", "page-root"]
    )
  ).toBe(true);
});

test("wrap editable children around drop target", () => {
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
    { parentSelector: ["paragraph", "body"], position: 1 }
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

test("wrap editable children around drop target skips missing and non-rich parents", () => {
  expect(
    wrapEditableChildrenAroundDropTargetMutable(new Map(), props, metas, {
      parentSelector: ["missing"],
      position: 0,
    })
  ).toBeUndefined();

  const instances = new Map([
    ["box", createInstance("box", "Box", [{ type: "id", value: "child" }])],
    ["child", createInstance("child", "Box")],
  ]);

  expect(
    wrapEditableChildrenAroundDropTargetMutable(instances, props, metas, {
      parentSelector: ["box"],
      position: 0,
    })
  ).toBeUndefined();
  expect(instances.get("box")?.children).toEqual([
    { type: "id", value: "child" },
  ]);
});

test("wrap editable children around start and end drop targets", () => {
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
    wrapEditableChildrenAroundDropTargetMutable(startInstances, props, metas, {
      parentSelector: ["paragraph"],
      position: 0,
    })
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
    wrapEditableChildrenAroundDropTargetMutable(endInstances, props, metas, {
      parentSelector: ["paragraph"],
      position: "end",
    })
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

test("get reparent drop target resolves collection item and slot targets", () => {
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
    getReparentDropTargetMutable(instances, props, metas, {
      parentSelector: ["missing-item", "collection", "body"],
      position: "end",
    })
  ).toEqual({
    parentSelector: ["collection", "body"],
    position: "end",
  });

  expect(
    getReparentDropTargetMutable(instances, props, metas, {
      parentSelector: ["slot", "collection", "body"],
      position: "end",
    })
  ).toEqual({
    parentSelector: ["fragment", "slot", "collection", "body"],
    position: "end",
  });
});
