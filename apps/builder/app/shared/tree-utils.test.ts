import { test, expect } from "@jest/globals";
import type {
  Instance,
  Instances,
  InstancesItem,
  Prop,
  StyleDecl,
  Styles,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/project-build";
import {
  cloneStyles,
  createInstancesIndex,
  findClosestDroppableTarget,
  findClosestRichTextInstance,
  findParentInstance,
  findSubtreeLocalStyleSources,
  getInstanceAncestorsAndSelf,
  insertInstanceMutable,
  insertInstancesCopyMutable,
  insertInstancesMutable,
  insertPropsCopyMutable,
  insertStylesCopyMutable,
  insertStyleSourcesCopyMutable,
  insertStyleSourceSelectionsCopyMutable,
  reparentInstanceMutable,
} from "./tree-utils";

const expectString = expect.any(String) as unknown as string;

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance[]
): Instance => {
  return {
    type: "instance",
    id,
    component,
    children: children,
  };
};

const createInstancesItem = (
  id: Instance["id"],
  component: string,
  children: InstancesItem["children"]
): InstancesItem => {
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
  children: InstancesItem["children"]
): [Instance["id"], InstancesItem] => {
  return [id, createInstancesItem(id, component, children)];
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
  breakpointId: string
): StyleDecl => {
  return {
    styleSourceId,
    breakpointId,
    property: "width",
    value: {
      type: "keyword",
      value: "value",
    },
  };
};

test("find closest droppable target", () => {
  const rootInstance = createInstance("root", "Body", [
    createInstance("box1", "Box", [
      createInstance("box11", "Box", []),
      createInstance("box12", "Box", []),
      createInstance("box13", "Box", []),
    ]),
    createInstance("box2", "Box", [
      createInstance("paragraph21", "Paragraph", [
        createInstance("bold", "Bold", []),
      ]),
      createInstance("box22", "Box", []),
    ]),
    createInstance("box3", "Box", [
      createInstance("box31", "Box", []),
      createInstance("box32", "Box", []),
      createInstance("box33", "Box", []),
    ]),
  ]);
  const instancesIndex = createInstancesIndex(rootInstance);
  expect(findClosestDroppableTarget(instancesIndex, "bold")).toEqual({
    parentId: "box2",
    position: 1,
  });
  expect(findClosestDroppableTarget(instancesIndex, "box3")).toEqual({
    parentId: "box3",
    position: 3,
  });
  expect(findClosestDroppableTarget(instancesIndex, "root")).toEqual({
    parentId: "root",
    position: 3,
  });
  expect(findClosestDroppableTarget(instancesIndex, undefined)).toEqual({
    parentId: "root",
    position: 3,
  });
});

test("insert instance into target", () => {
  const rootInstance = createInstance("root", "Body", [
    createInstance("box1", "Box", [
      createInstance("box11", "Box", []),
      createInstance("box12", "Box", []),
      createInstance("box13", "Box", []),
    ]),
  ]);

  let instancesIndex = createInstancesIndex(rootInstance);
  insertInstanceMutable(
    instancesIndex,
    createInstance("inserted1", "Box", [
      createInstance("inserted2", "Box", []),
    ]),
    {
      parentId: "box1",
      position: 1,
    }
  );
  expect(rootInstance).toEqual(
    createInstance("root", "Body", [
      createInstance("box1", "Box", [
        createInstance("box11", "Box", []),
        createInstance("inserted1", "Box", [
          createInstance("inserted2", "Box", []),
        ]),
        createInstance("box12", "Box", []),
        createInstance("box13", "Box", []),
      ]),
    ])
  );

  instancesIndex = createInstancesIndex(rootInstance);
  insertInstanceMutable(
    instancesIndex,
    createInstance("inserted3", "Box", [
      createInstance("inserted4", "Box", []),
    ]),
    {
      parentId: "box1",
      position: "end",
    }
  );
  expect(rootInstance).toEqual(
    createInstance("root", "Body", [
      createInstance("box1", "Box", [
        createInstance("box11", "Box", []),
        createInstance("inserted1", "Box", [
          createInstance("inserted2", "Box", []),
        ]),
        createInstance("box12", "Box", []),
        createInstance("box13", "Box", []),
        createInstance("inserted3", "Box", [
          createInstance("inserted4", "Box", []),
        ]),
      ]),
    ])
  );
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
    [
      createInstancesItem("inserted1", "Box", [
        { type: "id", value: "inserted2" },
      ]),
      createInstancesItem("inserted2", "Box", []),
    ],
    ["inserted1"],
    {
      parentId: "box1",
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
    [
      createInstancesItem("inserted3", "Box", [
        { type: "id", value: "inserted4" },
      ]),
      createInstancesItem("inserted4", "Box", []),
    ],
    ["inserted3"],
    {
      parentId: "box1",
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

test("reparent instance into target", () => {
  const rootInstance = createInstance("root", "Body", [
    createInstance("target", "Box", []),
    createInstance("box1", "Box", [
      createInstance("box11", "Box", []),
      createInstance("box12", "Box", []),
      createInstance("box13", "Box", []),
    ]),
    createInstance("box2", "Box", []),
  ]);

  let instancesIndex = createInstancesIndex(rootInstance);
  reparentInstanceMutable(instancesIndex, "target", {
    parentId: "box1",
    position: 1,
  });
  expect(rootInstance).toEqual(
    createInstance("root", "Body", [
      createInstance("box1", "Box", [
        createInstance("box11", "Box", []),
        createInstance("target", "Box", []),
        createInstance("box12", "Box", []),
        createInstance("box13", "Box", []),
      ]),
      createInstance("box2", "Box", []),
    ])
  );

  instancesIndex = createInstancesIndex(rootInstance);
  reparentInstanceMutable(instancesIndex, "target", {
    parentId: "box1",
    position: 3,
  });
  expect(rootInstance).toEqual(
    createInstance("root", "Body", [
      createInstance("box1", "Box", [
        createInstance("box11", "Box", []),
        createInstance("box12", "Box", []),
        createInstance("target", "Box", []),
        createInstance("box13", "Box", []),
      ]),
      createInstance("box2", "Box", []),
    ])
  );

  instancesIndex = createInstancesIndex(rootInstance);
  reparentInstanceMutable(instancesIndex, "target", {
    parentId: "root",
    position: "end",
  });
  expect(rootInstance).toEqual(
    createInstance("root", "Body", [
      createInstance("box1", "Box", [
        createInstance("box11", "Box", []),
        createInstance("box12", "Box", []),
        createInstance("box13", "Box", []),
      ]),
      createInstance("box2", "Box", []),
      createInstance("target", "Box", []),
    ])
  );
});

test("get path from instance and its ancestors", () => {
  const rootInstance: Instance = createInstance("root", "Box", [
    createInstance("box1", "Box", []),
    createInstance("box2", "Box", [
      createInstance("box3", "Box", [
        createInstance("child1", "Box", []),
        createInstance("child2", "Box", []),
      ]),
    ]),
    createInstance("box4", "Box", []),
  ]);
  const instancesIndex = createInstancesIndex(rootInstance);

  expect(getInstanceAncestorsAndSelf(instancesIndex, "box3")).toEqual([
    rootInstance,

    createInstance("box2", "Box", [
      createInstance("box3", "Box", [
        createInstance("child1", "Box", []),
        createInstance("child2", "Box", []),
      ]),
    ]),

    createInstance("box3", "Box", [
      createInstance("child1", "Box", []),
      createInstance("child2", "Box", []),
    ]),
  ]);
});

test("find closest rich text to instance", () => {
  const rootInstance: Instance = createInstance("root", "Box", [
    createInstance("box1", "Box", []),
    createInstance("paragraph2", "Paragraph", [
      createInstance("italic3", "Italic", [
        createInstance("bold4", "Bold", []),
        createInstance("box5", "Box", []),
      ]),
    ]),
    createInstance("box6", "Box", []),
  ]);
  const instancesIndex = createInstancesIndex(rootInstance);

  expect(findClosestRichTextInstance(instancesIndex, "bold4")?.id).toEqual(
    "paragraph2"
  );
  expect(findClosestRichTextInstance(instancesIndex, "paragraph2")?.id).toEqual(
    "paragraph2"
  );
  expect(findClosestRichTextInstance(instancesIndex, "box6")?.id).toEqual(
    undefined
  );
});

test("find parent instance", () => {
  const instances: Instances = new Map([
    createInstancePair("1", "Body", [{ type: "id", value: "3" }]),
    // this is outside of subtree
    createInstancePair("2", "Box", []),
    // these should be matched
    createInstancePair("3", "Box", [
      { type: "id", value: "4" },
      { type: "id", value: "5" },
    ]),
    createInstancePair("4", "Box", []),
    createInstancePair("5", "Box", []),
    // this one is from other tree
    createInstancePair("6", "Box", []),
  ]);
  expect(findParentInstance(instances, "4")).toEqual({
    type: "instance",
    id: "3",
    component: "Box",
    children: [
      { type: "id", value: "4" },
      { type: "id", value: "5" },
    ],
  });
});

test("insert tree of instances copy and provide map from ids map", () => {
  const instances = new Map([
    createInstancePair("1", "Body", [
      { type: "id", value: "2" },
      { type: "id", value: "3" },
    ]),
    createInstancePair("2", "Box", []),
    createInstancePair("3", "Box", [{ type: "id", value: "4" }]),
    createInstancePair("4", "Box", []),
  ]);
  const copiedInstances = [
    createInstancesItem("2", "Box", [
      { type: "id", value: "3" },
      { type: "text", value: "text" },
    ]),
    createInstancesItem("3", "Box", []),
  ];
  const copiedInstanceIds = insertInstancesCopyMutable(
    instances,
    copiedInstances,
    {
      parentId: "3",
      position: 0,
    }
  );
  expect(Array.from(copiedInstanceIds.entries())).toEqual([
    ["2", expectString],
    ["3", expectString],
  ]);
  expect(Array.from(instances.entries())).toEqual([
    createInstancePair("1", "Body", [
      { type: "id", value: "2" },
      { type: "id", value: "3" },
    ]),
    createInstancePair("2", "Box", []),
    createInstancePair("3", "Box", [
      { type: "id", value: expectString },
      { type: "id", value: "4" },
    ]),
    createInstancePair("4", "Box", []),
    createInstancePair(expectString, "Box", [
      { type: "id", value: expectString },
      { type: "text", value: "text" },
    ]),
    createInstancePair(expectString, "Box", []),
  ]);
});

test("insert style sources copy with new ids and provide map from old ids", () => {
  const styleSources = new Map([
    ["local1", createStyleSource("local", "local1")],
    ["local2", createStyleSource("local", "local2")],
  ]);
  const copiedStyleSources = [
    createStyleSource("local", "local1"),
    createStyleSource("local", "local2"),
  ];
  const copiedStyleSourceIds = insertStyleSourcesCopyMutable(
    styleSources,
    copiedStyleSources
  );
  expect(Array.from(copiedStyleSourceIds.entries())).toEqual([
    ["local1", expectString],
    ["local2", expectString],
  ]);
  expect(Array.from(styleSources.entries())).toEqual([
    ["local1", createStyleSource("local", "local1")],
    ["local2", createStyleSource("local", "local2")],
    [expectString, createStyleSource("local", expectString)],
    [expectString, createStyleSource("local", expectString)],
  ]);
});

test("insert props copy with new ids and apply new instance ids", () => {
  const props = new Map([
    ["prop1", createProp("prop1", "instance1")],
    ["prop2", createProp("prop2", "instance2")],
    ["prop3", createProp("prop3", "instance3")],
  ]);
  const copiedProps = [
    createProp("prop1", "instance1"),
    createProp("prop2", "instance2"),
  ];
  const clonedInstanceIds = new Map<Instance["id"], Instance["id"]>([
    ["instance2", "newInstance2"],
  ]);
  insertPropsCopyMutable(props, copiedProps, clonedInstanceIds);
  expect(Array.from(props.entries())).toEqual([
    ["prop1", createProp("prop1", "instance1")],
    ["prop2", createProp("prop2", "instance2")],
    ["prop3", createProp("prop3", "instance3")],
    [expectString, createProp(expectString, "instance1")],
    [expectString, createProp(expectString, "newInstance2")],
  ]);
});

test("insert style source selections copy and apply new instance ids and style source ids", () => {
  const styleSourceSelections = new Map([
    [
      "instance1",
      createStyleSourceSelection("instance1", ["local1", "token2"]),
    ],
    [
      "instance2",
      createStyleSourceSelection("instance2", ["token3", "local4", "token5"]),
    ],
    ["instance3", createStyleSourceSelection("instance3", ["local6"])],
  ]);
  const copiedStyleSourceSelections = [
    createStyleSourceSelection("instance1", ["local1", "token2"]),
    createStyleSourceSelection("instance2", ["token3", "local4", "token5"]),
  ];
  const copiedStyleSourceIds = new Map<StyleSource["id"], StyleSource["id"]>([
    ["local1", "newLocal1"],
    ["local4", "newLocal4"],
  ]);
  const copiedInstanceIds = new Map<Instance["id"], Instance["id"]>([
    ["instance1", "newInstance1"],
    ["instance2", "newInstance2"],
  ]);
  insertStyleSourceSelectionsCopyMutable(
    styleSourceSelections,
    copiedStyleSourceSelections,
    copiedInstanceIds,
    copiedStyleSourceIds
  );
  expect(Array.from(styleSourceSelections.entries())).toEqual([
    [
      "instance1",
      createStyleSourceSelection("instance1", ["local1", "token2"]),
    ],
    [
      "instance2",
      createStyleSourceSelection("instance2", ["token3", "local4", "token5"]),
    ],
    ["instance3", createStyleSourceSelection("instance3", ["local6"])],
    [
      "newInstance1",
      createStyleSourceSelection("newInstance1", ["newLocal1", "token2"]),
    ],
    [
      "newInstance2",
      createStyleSourceSelection("newInstance2", [
        "token3",
        "newLocal4",
        "token5",
      ]),
    ],
  ]);
});

test("insert styles copy and apply new style source ids", () => {
  const styles: Styles = new Map([
    [`styleSource1:bp1:width`, createStyleDecl("styleSource1", "bp1")],
    [`styleSource2:bp2:width`, createStyleDecl("styleSource2", "bp2")],
    [`styleSource1:bp3:width`, createStyleDecl("styleSource1", "bp3")],
    [`styleSource3:bp4:width`, createStyleDecl("styleSource3", "bp4")],
  ]);
  const copiedStyles = [
    createStyleDecl("styleSource2", "bp2"),
    createStyleDecl("styleSource3", "bp4"),
  ];
  const copiedStyleSourceIds = new Map<StyleSource["id"], StyleSource["id"]>([
    ["styleSource2", "newStyleSource2"],
    ["styleSource3", "newStyleSource3"],
  ]);
  insertStylesCopyMutable(styles, copiedStyles, copiedStyleSourceIds);
  expect(Array.from(styles.entries())).toEqual([
    [`styleSource1:bp1:width`, createStyleDecl("styleSource1", "bp1")],
    [`styleSource2:bp2:width`, createStyleDecl("styleSource2", "bp2")],
    [`styleSource1:bp3:width`, createStyleDecl("styleSource1", "bp3")],
    [`styleSource3:bp4:width`, createStyleDecl("styleSource3", "bp4")],
    [`newStyleSource2:bp2:width`, createStyleDecl("newStyleSource2", "bp2")],
    [`newStyleSource3:bp4:width`, createStyleDecl("newStyleSource3", "bp4")],
  ]);
});

test("clone styles with appled new style source ids", () => {
  const styles: Styles = new Map([
    [`styleSource1:bp1:width`, createStyleDecl("styleSource1", "bp1")],
    [`styleSource2:bp2:width`, createStyleDecl("styleSource2", "bp2")],
    [`styleSource1:bp3:width`, createStyleDecl("styleSource1", "bp3")],
    [`styleSource3:bp4:width`, createStyleDecl("styleSource3", "bp4")],
    [`styleSource1:bp5:width`, createStyleDecl("styleSource1", "bp5")],
    [`styleSource3:bp6:width`, createStyleDecl("styleSource3", "bp6")],
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

test("find subtree local style sources", () => {
  const subtreeIds = new Set(["instance2", "instance4"]);
  const styleSources = new Map([
    ["local1", createStyleSource("local", "local1")],
    ["local2", createStyleSource("local", "local2")],
    ["token3", createStyleSource("token", "token3")],
    ["local4", createStyleSource("local", "local4")],
    ["token5", createStyleSource("token", "token5")],
    ["local6", createStyleSource("local", "local6")],
  ]);
  const styleSourceSelections = new Map([
    ["instance1", createStyleSourceSelection("instance1", ["local1"])],
    ["instance2", createStyleSourceSelection("instance2", ["local2"])],
    ["instance3", createStyleSourceSelection("instance3", ["token3"])],
    [
      "instance4",
      createStyleSourceSelection("instance4", ["local4", "token5"]),
    ],
    ["instance5", createStyleSourceSelection("instance5", ["local6"])],
  ]);

  expect(
    findSubtreeLocalStyleSources(
      subtreeIds,
      styleSources,
      styleSourceSelections
    )
  ).toEqual(new Set(["local2", "local4"]));
});
