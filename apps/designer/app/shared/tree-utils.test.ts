import { test, expect } from "@jest/globals";
import type {
  Instance,
  Prop,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/project-build";
import {
  cloneInstance,
  cloneProps,
  cloneStyles,
  cloneStyleSources,
  cloneStyleSourceSelections,
  findSubtree,
  findSubtreeLocalStyleSources,
} from "./tree-utils";

const expectString = expect.any(String) as unknown as string;

const createInstance = (id: Instance["id"], children: Instance[]): Instance => {
  return {
    type: "instance",
    id,
    component: "Box",
    children: children,
  };
};

const createProp = (id: string, instanceId: string): Prop => {
  return {
    id,
    instanceId,
    type: "string",
    name: "prop",
    value: "value",
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
    treeId: "",
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

const createStyleDecl = (styleSourceId: string): StyleDecl => {
  return {
    styleSourceId,
    breakpointId: "breakpointId",
    property: "width",
    value: {
      type: "keyword",
      value: "value",
    },
  };
};

test("find subtree with all descendants and parent instance", () => {
  const rootInstance: Instance = createInstance("root", [
    createInstance("box1", []),
    createInstance("box2", [
      createInstance("box3", [
        createInstance("child1", []),
        createInstance("child2", [createInstance("descendant", [])]),
        createInstance("child3", []),
      ]),
    ]),
    createInstance("box4", []),
  ]);

  expect(findSubtree(rootInstance, "box3")).toEqual({
    parentInstance: createInstance("box2", [
      createInstance("box3", [
        createInstance("child1", []),
        createInstance("child2", [createInstance("descendant", [])]),
        createInstance("child3", []),
      ]),
    ]),
    targetInstance: createInstance("box3", [
      createInstance("child1", []),
      createInstance("child2", [createInstance("descendant", [])]),
      createInstance("child3", []),
    ]),
    subtreeIds: new Set(["box3", "child1", "child2", "child3", "descendant"]),
  });

  expect(findSubtree(rootInstance, "not_found")).toEqual({
    parentInstance: undefined,
    targetInstance: undefined,
    subtreeIds: new Set(),
  });

  expect(findSubtree(rootInstance, "root").parentInstance).toEqual(undefined);
});

test("clone instance tree and provide cloned ids map", () => {
  const instance = createInstance("box", [
    createInstance("child1", []),
    createInstance("child2", [createInstance("descendant", [])]),
    createInstance("child3", []),
  ]);
  const { clonedInstance, clonedInstanceIds } = cloneInstance(instance);
  expect(clonedInstance).toEqual(
    createInstance(expectString, [
      createInstance(expectString, []),
      createInstance(expectString, [createInstance(expectString, [])]),
      createInstance(expectString, []),
    ])
  );
  expect(clonedInstanceIds.get(instance.id)).toEqual(clonedInstance.id);
  expect(clonedInstanceIds.get((instance.children[0] as Instance).id)).toEqual(
    (clonedInstance.children[0] as Instance).id
  );
});

test("clone props with new ids and apply new instance ids", () => {
  const props = [
    createProp("prop1", "instance1"),
    createProp("prop2", "instance2"),
    createProp("prop3", "instance1"),
    createProp("prop4", "instance3"),
    createProp("prop5", "instance1"),
    createProp("prop6", "instance3"),
  ];
  const clonedInstanceIds = new Map<Instance["id"], Instance["id"]>();
  clonedInstanceIds.set("instance2", "newInstance2");
  clonedInstanceIds.set("instance3", "newInstance3");
  expect(cloneProps(props, clonedInstanceIds)).toEqual([
    createProp(expectString, "newInstance2"),
    createProp(expectString, "newInstance3"),
    createProp(expectString, "newInstance3"),
  ]);
});

test("clone style sources with new ids within provided subset", () => {
  const styleSources = [
    createStyleSource("local", "local1"),
    createStyleSource("local", "local2"),
    createStyleSource("token", "token3"),
    createStyleSource("local", "local4"),
  ];
  const subsetIds = new Set<StyleSource["id"]>(["local2", "token3"]);
  expect(cloneStyleSources(styleSources, subsetIds)).toEqual({
    clonedStyleSources: [
      createStyleSource("local", expectString),
      createStyleSource("token", expectString),
    ],
    clonedStyleSourceIds: new Map([
      ["local2", expectString],
      ["token3", expectString],
    ]),
  });
});

test("clone style source selections with applied instance ids and style source ids", () => {
  const styleSourceSelections = [
    createStyleSourceSelection("instance1", ["local1", "token2"]),
    createStyleSourceSelection("instance2", ["token3", "local4", "token5"]),
    createStyleSourceSelection("instance3", ["local6"]),
  ];
  const clonedStyleSourceIds = new Map<StyleSource["id"], StyleSource["id"]>([
    ["local1", "newLocal1"],
    ["local4", "newLocal4"],
  ]);
  const clonedInstanceIds = new Map<Instance["id"], Instance["id"]>([
    ["instance1", "newInstance1"],
    ["instance2", "newInstance2"],
  ]);
  expect(
    cloneStyleSourceSelections(
      styleSourceSelections,
      clonedInstanceIds,
      clonedStyleSourceIds
    )
  ).toEqual([
    createStyleSourceSelection("newInstance1", ["newLocal1", "token2"]),
    createStyleSourceSelection("newInstance2", [
      "token3",
      "newLocal4",
      "token5",
    ]),
  ]);
});

test("clone styles with appled new style source ids", () => {
  const styles = [
    createStyleDecl("styleSource1"),
    createStyleDecl("styleSource2"),
    createStyleDecl("styleSource1"),
    createStyleDecl("styleSource3"),
    createStyleDecl("styleSource1"),
    createStyleDecl("styleSource3"),
  ];
  const clonedStyleSourceIds = new Map<StyleSource["id"], StyleSource["id"]>();
  clonedStyleSourceIds.set("styleSource2", "newStyleSource2");
  clonedStyleSourceIds.set("styleSource3", "newStyleSource3");
  expect(cloneStyles(styles, clonedStyleSourceIds)).toEqual([
    createStyleDecl("newStyleSource2"),
    createStyleDecl("newStyleSource3"),
    createStyleDecl("newStyleSource3"),
  ]);
});

test("find subtree local style sources", () => {
  const subtreeIds = new Set(["instance2", "instance4"]);
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
    findSubtreeLocalStyleSources(
      subtreeIds,
      styleSources,
      styleSourceSelections
    )
  ).toEqual(new Set(["local2", "local4"]));
});
