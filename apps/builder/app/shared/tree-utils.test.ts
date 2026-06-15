import { test, expect } from "vitest";
import type {
  Instance,
  StyleDecl,
  Styles,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { getStyleDeclKey } from "@webstudio-is/sdk";
import {
  cloneStyles,
  findLocalStyleSourcesWithinInstances,
  getInstanceOrCreateFragmentIfNecessary,
  isDescendantOrSelf,
  normalizeLegacySlotParentInSelectorMutable,
} from "./tree-utils";

const createStyleSource = (
  type: StyleSource["type"],
  id: StyleSource["id"]
): StyleSource => {
  if (type === "token") {
    return {
      type,
      id,
      name: id,
    };
  }
  return {
    type,
    id,
  };
};

const createStyleSourceSelection = (
  instanceId: Instance["id"],
  values: StyleSource["id"][]
): StyleSourceSelection => {
  return {
    instanceId,
    values,
  };
};

const createStyleDecl = (
  styleSourceId: string,
  breakpointId: string,
  value?: string
): StyleDecl => {
  return {
    styleSourceId,
    breakpointId,
    property: "width",
    value: {
      type: "keyword",
      value: value ?? "value",
    },
  };
};

const createStyleDeclPair = (
  styleSourceId: string,
  breakpointId: string,
  state?: string,
  value?: string
) => {
  return [
    getStyleDeclKey({
      styleSourceId,
      breakpointId,
      state,
      property: "width",
    }),
    createStyleDecl(styleSourceId, breakpointId, value),
  ] as const;
};

const createInstance = (
  id: string,
  component: string,
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component,
  children,
});

test("clone styles with appled new style source ids", () => {
  const styles: Styles = new Map([
    createStyleDeclPair("styleSource1", "bp1"),
    createStyleDeclPair("styleSource2", "bp2"),
    createStyleDeclPair("styleSource1", "bp3"),
    createStyleDeclPair("styleSource3", "bp4"),
    createStyleDeclPair("styleSource1", "bp5"),
    createStyleDeclPair("styleSource3", "bp6"),
  ]);
  const clonedStyleSourceIds = new Map<StyleSource["id"], StyleSource["id"]>();
  clonedStyleSourceIds.set("styleSource2", "newStyleSource2");
  clonedStyleSourceIds.set("styleSource3", "newStyleSource3");
  expect(cloneStyles(styles, clonedStyleSourceIds)).toEqual([
    createStyleDecl("newStyleSource2", "bp2"),
    createStyleDecl("newStyleSource3", "bp4"),
    createStyleDecl("newStyleSource3", "bp6"),
  ]);
});

test("find local style sources within instances", () => {
  const instanceIds = new Set(["instance2", "instance4"]);
  const styleSources = [
    createStyleSource("local", "local1"),
    createStyleSource("local", "local2"),
    createStyleSource("token", "token3"),
    createStyleSource("local", "local4"),
    createStyleSource("token", "token5"),
    createStyleSource("local", "local6"),
  ];
  const styleSourceSelections = [
    createStyleSourceSelection("instance1", ["local1"]),
    createStyleSourceSelection("instance2", ["local2"]),
    createStyleSourceSelection("instance3", ["token3"]),
    createStyleSourceSelection("instance4", ["local4", "token5"]),
    createStyleSourceSelection("instance5", ["local6"]),
  ];
  expect(
    findLocalStyleSourcesWithinInstances(
      styleSources,
      styleSourceSelections,
      instanceIds
    )
  ).toEqual(new Set(["local2", "local4"]));
});

test("is descendant or self", () => {
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

test("normalizes matching legacy slot occurrences to one shared fragment", () => {
  const instances = new Map([
    [
      "slot1",
      createInstance("slot1", "Slot", [
        { type: "id", value: "box" },
        { type: "id", value: "heading" },
      ]),
    ],
    [
      "slot2",
      createInstance("slot2", "Slot", [
        { type: "id", value: "box" },
        { type: "id", value: "heading" },
      ]),
    ],
    ["box", createInstance("box", "Box")],
    ["heading", createInstance("heading", "Heading")],
  ]);

  const dropTarget = getInstanceOrCreateFragmentIfNecessary(instances, {
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

test("normalizes matching empty legacy slot occurrences to one shared fragment", () => {
  const instances = new Map([
    ["slot1", createInstance("slot1", "Slot")],
    ["slot2", createInstance("slot2", "Slot")],
  ]);

  const dropTarget = getInstanceOrCreateFragmentIfNecessary(instances, {
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
      createInstance("slot1", "Slot", [
        { type: "id", value: "box" },
        { type: "id", value: "heading" },
      ]),
    ],
    ["slot2", createInstance("slot2", "Slot", [{ type: "id", value: "box" }])],
    ["box", createInstance("box", "Box")],
    ["heading", createInstance("heading", "Heading")],
  ]);

  const normalizedSelector = normalizeLegacySlotParentInSelectorMutable(
    instances,
    ["box", "slot1", "body"]
  );

  const slot1FragmentId = instances.get("slot1")?.children[0]?.value;
  expect(normalizedSelector).toEqual(["box", slot1FragmentId, "slot1", "body"]);
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
