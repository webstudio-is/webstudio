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
  type InstanceSelector,
  cloneStyles,
  findLocalStyleSourcesWithinInstances,
  getAncestorInstanceSelector,
  isDescendantOrSelf,
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

test("get ancestor instance selector", () => {
  const instanceSelector: InstanceSelector = ["4", "3", "2", "1"];
  expect(getAncestorInstanceSelector(instanceSelector, "2")).toEqual([
    "2",
    "1",
  ]);
  expect(getAncestorInstanceSelector(instanceSelector, "-1")).toEqual(
    undefined
  );
  expect(getAncestorInstanceSelector(instanceSelector, "1")).toEqual(["1"]);
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
});
