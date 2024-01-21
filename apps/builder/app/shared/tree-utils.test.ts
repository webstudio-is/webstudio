import { test, expect, describe } from "@jest/globals";
import type {
  Instance,
  Prop,
  StyleDecl,
  Styles,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { getStyleDeclKey } from "@webstudio-is/sdk";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import {
  type InstanceSelector,
  cloneStyles,
  findLocalStyleSourcesWithinInstances,
  getAncestorInstanceSelector,
  insertInstancesMutable,
  insertPropsCopyMutable,
} from "./tree-utils";

const baseMetasMap = new Map(Object.entries(baseMetas));

const expectString = expect.any(String) as unknown as string;

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return {
    type: "instance",
    id,
    component,
    children,
  };
};

const createInstancePair = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): [Instance["id"], Instance] => {
  return [id, createInstance(id, component, children)];
};

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

test("insert instances tree into target", () => {
  const instances = new Map([
    createInstancePair("root", "Body", [{ type: "id", value: "box1" }]),
    createInstancePair("box1", "Box", [
      { type: "id", value: "box11" },
      { type: "id", value: "box12" },
      { type: "id", value: "box13" },
    ]),
    createInstancePair("box11", "Box", []),
    createInstancePair("box12", "Box", []),
    createInstancePair("box13", "Box", []),
  ]);

  insertInstancesMutable(
    instances,
    new Map(),
    baseMetasMap,
    [
      createInstance("inserted1", "Box", [{ type: "id", value: "inserted2" }]),
      createInstance("inserted2", "Box", []),
    ],
    [{ type: "id", value: "inserted1" }],
    {
      parentSelector: ["box1", "root"],
      position: 1,
    }
  );
  expect(Array.from(instances.entries())).toEqual([
    createInstancePair("root", "Body", [{ type: "id", value: "box1" }]),
    createInstancePair("box1", "Box", [
      { type: "id", value: "box11" },
      { type: "id", value: "inserted1" },
      { type: "id", value: "box12" },
      { type: "id", value: "box13" },
    ]),
    createInstancePair("box11", "Box", []),
    createInstancePair("box12", "Box", []),
    createInstancePair("box13", "Box", []),
    createInstancePair("inserted1", "Box", [
      { type: "id", value: "inserted2" },
    ]),
    createInstancePair("inserted2", "Box", []),
  ]);

  insertInstancesMutable(
    instances,
    new Map(),
    baseMetasMap,
    [
      createInstance("inserted3", "Box", [{ type: "id", value: "inserted4" }]),
      createInstance("inserted4", "Box", []),
    ],
    [{ type: "id", value: "inserted3" }],
    {
      parentSelector: ["box1", "root"],
      position: "end",
    }
  );
  expect(Array.from(instances.entries())).toEqual([
    createInstancePair("root", "Body", [{ type: "id", value: "box1" }]),
    createInstancePair("box1", "Box", [
      { type: "id", value: "box11" },
      { type: "id", value: "inserted1" },
      { type: "id", value: "box12" },
      { type: "id", value: "box13" },
      { type: "id", value: "inserted3" },
    ]),
    createInstancePair("box11", "Box", []),
    createInstancePair("box12", "Box", []),
    createInstancePair("box13", "Box", []),
    createInstancePair("inserted1", "Box", [
      { type: "id", value: "inserted2" },
    ]),
    createInstancePair("inserted2", "Box", []),
    createInstancePair("inserted3", "Box", [
      { type: "id", value: "inserted4" },
    ]),
    createInstancePair("inserted4", "Box", []),
  ]);
});

describe("insert instances into container with text or rich text children", () => {
  test("insert in the end after text", () => {
    const getInstances = () =>
      new Map([
        createInstancePair("root", "Body", [{ type: "id", value: "box" }]),
        createInstancePair("box", "Box", [{ type: "text", value: "text" }]),
      ]);

    const instances1 = getInstances();
    insertInstancesMutable(
      instances1,
      new Map(),
      baseMetasMap,
      [createInstance("inserted", "Box", [])],
      [{ type: "id", value: "inserted" }],
      {
        parentSelector: ["box", "root"],
        position: 0,
      }
    );
    expect(Array.from(instances1.entries())).toEqual([
      createInstancePair("root", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [
        { type: "id", value: "inserted" },
        { type: "id", value: expectString },
      ]),
      createInstancePair(expectString, "Text", [
        { type: "text", value: "text" },
      ]),
      createInstancePair("inserted", "Box", []),
    ]);

    const instances2 = getInstances();
    insertInstancesMutable(
      instances2,
      new Map(),
      baseMetasMap,
      [createInstance("inserted", "Box", [])],
      [{ type: "id", value: "inserted" }],
      {
        parentSelector: ["box", "root"],
        position: "end",
      }
    );
    expect(Array.from(instances2.entries())).toEqual([
      createInstancePair("root", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [
        { type: "id", value: expectString },
        { type: "id", value: "inserted" },
      ]),
      createInstancePair(expectString, "Text", [
        { type: "text", value: "text" },
      ]),
      createInstancePair("inserted", "Box", []),
    ]);
  });

  test("insert container between rich text children", () => {
    const getInstances = () =>
      new Map([
        createInstancePair("root", "Body", [{ type: "id", value: "box" }]),
        createInstancePair("box", "Box", [
          { type: "id", value: "bold" },
          { type: "text", value: "text" },
          { type: "id", value: "italic" },
        ]),
        createInstancePair("bold", "Bold", [{ type: "text", value: "bold" }]),
        createInstancePair("italic", "Italic", [
          { type: "text", value: "italic" },
        ]),
      ]);

    // insert before text
    const instances1 = getInstances();
    insertInstancesMutable(
      instances1,
      new Map(),
      baseMetasMap,
      [createInstance("inserted", "Box", [])],
      [{ type: "id", value: "inserted" }],
      {
        parentSelector: ["box", "root"],
        position: 1,
      }
    );
    expect(Array.from(instances1.entries())).toEqual([
      createInstancePair("root", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [
        { type: "id", value: expectString },
        { type: "id", value: "inserted" },
        { type: "id", value: expectString },
      ]),
      createInstancePair("bold", "Bold", [{ type: "text", value: "bold" }]),
      createInstancePair("italic", "Italic", [
        { type: "text", value: "italic" },
      ]),
      createInstancePair(expectString, "Text", [{ type: "id", value: "bold" }]),
      createInstancePair(expectString, "Text", [
        { type: "text", value: "text" },
        { type: "id", value: "italic" },
      ]),
      createInstancePair("inserted", "Box", []),
    ]);

    // insert after text
    const instances2 = getInstances();
    insertInstancesMutable(
      instances2,
      new Map(),
      baseMetasMap,
      [createInstance("inserted", "Box", [])],
      [{ type: "id", value: "inserted" }],
      {
        parentSelector: ["box", "root"],
        position: 2,
      }
    );
    expect(Array.from(instances2.entries())).toEqual([
      createInstancePair("root", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [
        { type: "id", value: expectString },
        { type: "id", value: "inserted" },
      ]),
      createInstancePair("bold", "Bold", [{ type: "text", value: "bold" }]),
      createInstancePair("italic", "Italic", [
        { type: "text", value: "italic" },
      ]),
      createInstancePair(expectString, "Text", [
        { type: "id", value: "bold" },
        { type: "text", value: "text" },
        { type: "id", value: "italic" },
      ]),
      createInstancePair("inserted", "Box", []),
    ]);
  });

  test("insert container without children", () => {
    const getInstances = () =>
      new Map([createInstancePair("root", "Body", [])]);

    const instances1 = getInstances();
    insertInstancesMutable(
      instances1,
      new Map(),
      baseMetasMap,
      [createInstance("inserted", "Box", [])],
      [{ type: "id", value: "inserted" }],
      {
        parentSelector: ["root"],
        position: 1,
      }
    );
    expect(Array.from(instances1.entries())).toEqual([
      createInstancePair("root", "Body", [{ type: "id", value: "inserted" }]),
      createInstancePair("inserted", "Box", []),
    ]);
  });
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
