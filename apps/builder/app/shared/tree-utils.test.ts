import { test, expect } from "@jest/globals";
import type {
  Instance,
  Prop,
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
  insertPropsCopyMutable,
} from "./tree-utils";

const expectString = expect.any(String) as unknown as string;

const createProp = (id: string, instanceId: string, value?: string): Prop => {
  return {
    id,
    instanceId,
    type: "string",
    name: "prop",
    value: value ?? "value",
  };
};

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

test("insert props copy with new ids and apply new instance ids", () => {
  const props = new Map([
    ["prop1", createProp("prop1", "instance1")],
    ["prop2", createProp("prop2", "instance2")],
    ["prop3", createProp("prop3", "instance3")],
    ["existingSharedProp", createProp("existingSharedProp", "instance3")],
  ]);
  const copiedProps = [
    createProp("prop2", "instance2"),
    createProp("sharedProp", "instance3", "newValue"),
    createProp("existingSharedProp", "instance3", "newValue"),
  ];
  const clonedInstanceIds = new Map<Instance["id"], Instance["id"]>([
    ["instance2", "newInstance2"],
  ]);
  insertPropsCopyMutable(props, copiedProps, clonedInstanceIds);
  expect(Array.from(props.entries())).toEqual([
    ["prop1", createProp("prop1", "instance1")],
    ["prop2", createProp("prop2", "instance2")],
    ["prop3", createProp("prop3", "instance3")],
    // shared prop is not overriden
    ["existingSharedProp", createProp("existingSharedProp", "instance3")],
    // new props are copied
    [expectString, createProp(expectString, "newInstance2")],
    // shared prop inserted without changes
    ["sharedProp", createProp("sharedProp", "instance3", "newValue")],
  ]);
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
