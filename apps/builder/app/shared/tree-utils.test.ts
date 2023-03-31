import { test, expect } from "@jest/globals";
import type {
  Breakpoint,
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
  type InstanceSelector,
  cloneStyles,
  findClosestDroppableTarget,
  findSubtreeLocalStyleSources,
  getAncestorInstanceSelector,
  insertInstancesCopyMutable,
  insertInstancesMutable,
  insertPropsCopyMutable,
  insertStylesCopyMutable,
  insertStyleSourcesCopyMutable,
  insertStyleSourceSelectionsCopyMutable,
  reparentInstanceMutable,
  mergeNewBreakpointsMutable,
} from "./tree-utils";

const expectString = expect.any(String) as unknown as string;

const createBreakpoint = (
  id: Breakpoint["id"],
  minWidth: Breakpoint["minWidth"]
) => ({ id, label: id, minWidth });

const createBreakpointPair = (
  id: Breakpoint["id"],
  minWidth: Breakpoint["minWidth"]
) => {
  return [id, createBreakpoint(id, minWidth)] as const;
};

const createInstance = (
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
  value?: string
) => {
  return [
    `${styleSourceId}:${breakpointId}:width`,
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

test("find closest droppable target", () => {
  const instances = new Map([
    createInstancePair("root", "Body", [
      { type: "id", value: "box1" },
      { type: "id", value: "box2" },
      { type: "id", value: "box3" },
    ]),
    createInstancePair("box1", "Box", [
      { type: "id", value: "box11" },
      { type: "id", value: "box12" },
      { type: "id", value: "box13" },
    ]),
    createInstancePair("box11", "Box", []),
    createInstancePair("box12", "Box", []),
    createInstancePair("box13", "Box", []),
    createInstancePair("box2", "Box", [
      { type: "id", value: "paragraph21" },
      { type: "id", value: "box22" },
    ]),
    createInstancePair("paragraph21", "Paragraph", [
      { type: "id", value: "bold" },
    ]),
    createInstancePair("bold", "Bold", []),
    createInstancePair("box22", "Box", []),
    createInstancePair("box3", "Box", [
      { type: "id", value: "box31" },
      { type: "id", value: "box32" },
      { type: "id", value: "box33" },
    ]),
    createInstancePair("box31", "Box", []),
    createInstancePair("box32", "Box", []),
    createInstancePair("box33", "Box", []),
  ]);
  expect(
    findClosestDroppableTarget(instances, [
      "bold",
      "paragraph21",
      "box2",
      "root",
    ])
  ).toEqual({
    parentSelector: ["box2", "root"],
    position: 1,
  });
  expect(findClosestDroppableTarget(instances, ["box3", "root"])).toEqual({
    parentSelector: ["box3", "root"],
    position: "end",
  });
  expect(findClosestDroppableTarget(instances, ["root"])).toEqual({
    parentSelector: ["root"],
    position: "end",
  });
  expect(findClosestDroppableTarget(instances, ["box4", "root"])).toEqual({
    parentSelector: ["root"],
    position: "end",
  });
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
      createInstance("inserted1", "Box", [{ type: "id", value: "inserted2" }]),
      createInstance("inserted2", "Box", []),
    ],
    ["inserted1"],
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
    [
      createInstance("inserted3", "Box", [{ type: "id", value: "inserted4" }]),
      createInstance("inserted4", "Box", []),
    ],
    ["inserted3"],
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

test("reparent instance into target", () => {
  const instances: Instances = new Map([
    createInstancePair("root", "Body", [
      { type: "id", value: "target" },
      { type: "id", value: "box1" },
      { type: "id", value: "box2" },
    ]),
    createInstancePair("target", "Box", []),
    createInstancePair("box1", "Box", [
      { type: "id", value: "box11" },
      { type: "id", value: "box12" },
      { type: "id", value: "box13" },
    ]),
    createInstancePair("box2", "Box", []),
    createInstancePair("box11", "Box", []),
    createInstancePair("box12", "Box", []),
    createInstancePair("box13", "Box", []),
  ]);

  reparentInstanceMutable(instances, ["target", "root"], {
    parentSelector: ["box1", "root"],
    position: 1,
  });
  expect(instances).toEqual(
    new Map([
      createInstancePair("root", "Body", [
        { type: "id", value: "box1" },
        { type: "id", value: "box2" },
      ]),
      createInstancePair("target", "Box", []),
      createInstancePair("box1", "Box", [
        { type: "id", value: "box11" },
        { type: "id", value: "target" },
        { type: "id", value: "box12" },
        { type: "id", value: "box13" },
      ]),
      createInstancePair("box2", "Box", []),
      createInstancePair("box11", "Box", []),
      createInstancePair("box12", "Box", []),
      createInstancePair("box13", "Box", []),
    ])
  );

  reparentInstanceMutable(instances, ["target", "box1", "root"], {
    parentSelector: ["box1", "root"],
    position: 3,
  });
  expect(instances).toEqual(
    new Map([
      createInstancePair("root", "Body", [
        { type: "id", value: "box1" },
        { type: "id", value: "box2" },
      ]),
      createInstancePair("target", "Box", []),
      createInstancePair("box1", "Box", [
        { type: "id", value: "box11" },
        { type: "id", value: "box12" },
        { type: "id", value: "target" },
        { type: "id", value: "box13" },
      ]),
      createInstancePair("box2", "Box", []),
      createInstancePair("box11", "Box", []),
      createInstancePair("box12", "Box", []),
      createInstancePair("box13", "Box", []),
    ])
  );

  reparentInstanceMutable(instances, ["target", "box1", "root"], {
    parentSelector: ["root"],
    position: "end",
  });
  expect(instances).toEqual(
    new Map([
      createInstancePair("root", "Body", [
        { type: "id", value: "box1" },
        { type: "id", value: "box2" },
        { type: "id", value: "target" },
      ]),
      createInstancePair("target", "Box", []),
      createInstancePair("box1", "Box", [
        { type: "id", value: "box11" },
        { type: "id", value: "box12" },
        { type: "id", value: "box13" },
      ]),
      createInstancePair("box2", "Box", []),
      createInstancePair("box11", "Box", []),
      createInstancePair("box12", "Box", []),
      createInstancePair("box13", "Box", []),
    ])
  );
});

test("reparent instance into slot", () => {
  const instances: Instances = new Map([
    createInstancePair("root", "Body", [
      { type: "id", value: "slot1" },
      { type: "id", value: "box2" },
      { type: "id", value: "box3" },
    ]),
    createInstancePair("slot1", "Slot", [{ type: "id", value: "fragment11" }]),
    createInstancePair("fragment11", "Fragment", []),
    createInstancePair("box2", "Box", [
      { type: "id", value: "box21" },
      { type: "id", value: "box22" },
      { type: "id", value: "box23" },
    ]),
    createInstancePair("box21", "Box", []),
    createInstancePair("box22", "Box", []),
    createInstancePair("box23", "Box", []),
    createInstancePair("slot3", "Slot", []),
  ]);

  // reuse existing fragment when drop into slot
  reparentInstanceMutable(instances, ["box2", "root"], {
    parentSelector: ["slot1", "root"],
    position: "end",
  });
  expect(instances).toEqual(
    new Map([
      createInstancePair("root", "Body", [
        { type: "id", value: "slot1" },
        { type: "id", value: "box3" },
      ]),
      createInstancePair("slot1", "Slot", [
        { type: "id", value: "fragment11" },
      ]),
      createInstancePair("fragment11", "Fragment", [
        { type: "id", value: "box2" },
      ]),
      createInstancePair("box2", "Box", [
        { type: "id", value: "box21" },
        { type: "id", value: "box22" },
        { type: "id", value: "box23" },
      ]),
      createInstancePair("box21", "Box", []),
      createInstancePair("box22", "Box", []),
      createInstancePair("box23", "Box", []),
      createInstancePair("slot3", "Slot", []),
    ])
  );

  // create new fragment when drop into empty slot
  reparentInstanceMutable(instances, ["box2", "fragment11", "slot1", "root"], {
    parentSelector: ["slot3", "root"],
    position: "end",
  });
  expect(instances).toEqual(
    new Map([
      createInstancePair("root", "Body", [
        { type: "id", value: "slot1" },
        { type: "id", value: "box3" },
      ]),
      createInstancePair("slot1", "Slot", [
        { type: "id", value: "fragment11" },
      ]),
      createInstancePair("fragment11", "Fragment", []),
      createInstancePair("box2", "Box", [
        { type: "id", value: "box21" },
        { type: "id", value: "box22" },
        { type: "id", value: "box23" },
      ]),
      createInstancePair("box21", "Box", []),
      createInstancePair("box22", "Box", []),
      createInstancePair("box23", "Box", []),
      createInstancePair("slot3", "Slot", [
        { type: "id", value: expectString },
      ]),
      createInstancePair(expectString, "Fragment", [
        { type: "id", value: "box2" },
      ]),
    ])
  );
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
    createInstance("2", "Box", [
      { type: "id", value: "3" },
      { type: "text", value: "text" },
    ]),
    createInstance("3", "Box", []),
  ];
  const copiedInstanceIds = insertInstancesCopyMutable(
    instances,
    copiedInstances,
    {
      parentSelector: ["3", "1"],
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

test("insert slot or do nothing when slot is cyclic", () => {
  const instances = new Map([
    createInstancePair("root", "Body", [
      { type: "id", value: "slot" },
      { type: "id", value: "sibling" },
    ]),
    createInstancePair("slot", "Slot", [{ type: "id", value: "fragment" }]),
    createInstancePair("fragment", "Fragment", [
      { type: "id", value: "child" },
    ]),
    createInstancePair("child", "Box", []),
    createInstancePair("sibling", "Box", []),
  ]);
  let copiedInstances = [
    createInstance("slot", "Slot", [{ type: "id", value: "fragment" }]),
  ];

  // insert slot own descendant
  let copiedInstanceIds = insertInstancesCopyMutable(
    instances,
    copiedInstances,
    {
      parentSelector: ["child", "fragment", "slot", "root"],
      position: "end",
    }
  );
  expect(copiedInstanceIds).toEqual(new Map());
  expect(Array.from(instances.entries())).toEqual([
    createInstancePair("root", "Body", [
      { type: "id", value: "slot" },
      { type: "id", value: "sibling" },
    ]),
    createInstancePair("slot", "Slot", [{ type: "id", value: "fragment" }]),
    createInstancePair("fragment", "Fragment", [
      { type: "id", value: "child" },
    ]),
    createInstancePair("child", "Box", []),
    createInstancePair("sibling", "Box", []),
  ]);

  // do not insert slot into itself
  copiedInstanceIds = insertInstancesCopyMutable(instances, copiedInstances, {
    parentSelector: ["slot", "root"],
    position: "end",
  });
  expect(copiedInstanceIds).toEqual(new Map());
  expect(Array.from(instances.entries())).toEqual([
    createInstancePair("root", "Body", [
      { type: "id", value: "slot" },
      { type: "id", value: "sibling" },
    ]),
    createInstancePair("slot", "Slot", [{ type: "id", value: "fragment" }]),
    createInstancePair("fragment", "Fragment", [
      { type: "id", value: "child" },
    ]),
    createInstancePair("child", "Box", []),
    createInstancePair("sibling", "Box", []),
  ]);

  // insert slot into sibling
  copiedInstanceIds = insertInstancesCopyMutable(instances, copiedInstances, {
    parentSelector: ["sibling", "root"],
    position: "end",
  });
  expect(copiedInstanceIds).toEqual(new Map([["slot", expectString]]));
  expect(Array.from(instances.entries())).toEqual([
    createInstancePair("root", "Body", [
      { type: "id", value: "slot" },
      { type: "id", value: "sibling" },
    ]),
    createInstancePair("slot", "Slot", [{ type: "id", value: "fragment" }]),
    createInstancePair("fragment", "Fragment", [
      { type: "id", value: "child" },
    ]),
    createInstancePair("child", "Box", []),
    createInstancePair("sibling", "Box", [{ type: "id", value: expectString }]),
    createInstancePair(expectString, "Slot", [
      { type: "id", value: "fragment" },
    ]),
  ]);

  // insert new slot from other project
  copiedInstances = [
    createInstance("slot2", "Slot", [{ type: "id", value: "fragment2" }]),
    createInstance("fragment2", "Fragment", [
      { type: "id", value: "slot2box" },
    ]),
    createInstance("slot2box", "Box", []),
  ];
  copiedInstanceIds = insertInstancesCopyMutable(instances, copiedInstances, {
    parentSelector: ["root"],
    position: "end",
  });
  expect(copiedInstanceIds).toEqual(new Map([["slot2", expectString]]));
  expect(Array.from(instances.entries())).toEqual([
    createInstancePair("root", "Body", [
      { type: "id", value: "slot" },
      { type: "id", value: "sibling" },
      { type: "id", value: expectString },
    ]),
    createInstancePair("slot", "Slot", [{ type: "id", value: "fragment" }]),
    createInstancePair("fragment", "Fragment", [
      { type: "id", value: "child" },
    ]),
    createInstancePair("child", "Box", []),
    createInstancePair("sibling", "Box", [{ type: "id", value: expectString }]),
    createInstancePair(expectString, "Slot", [
      { type: "id", value: "fragment" },
    ]),
    createInstancePair("fragment2", "Fragment", [
      { type: "id", value: "slot2box" },
    ]),
    createInstancePair("slot2box", "Box", []),
    createInstancePair(expectString, "Slot", [
      { type: "id", value: "fragment2" },
    ]),
  ]);
});

test("insert style sources copy with new ids and provide map from old ids", () => {
  const styleSources = new Map([
    ["local1", createStyleSource("local", "local1")],
    ["local2", createStyleSource("local", "local2")],
    ["token3", createStyleSource("token", "token3")],
  ]);
  const copiedStyleSources = [
    createStyleSource("local", "local1"),
    createStyleSource("local", "local2"),
    createStyleSource("local", "local4"),
    createStyleSource("token", "token5"),
  ];
  const newStyleSourceIds = new Set(["local1", "local2"]);
  const copiedStyleSourceIds = insertStyleSourcesCopyMutable(
    styleSources,
    copiedStyleSources,
    newStyleSourceIds
  );
  expect(Array.from(copiedStyleSourceIds.entries())).toEqual([
    ["local1", expectString],
    ["local2", expectString],
  ]);
  expect(Array.from(styleSources.entries())).toEqual([
    ["local1", createStyleSource("local", "local1")],
    ["local2", createStyleSource("local", "local2")],
    // shared prop should not be overriden
    ["token3", createStyleSource("token", "token3")],
    // new style sources are copied
    [expectString, createStyleSource("local", expectString)],
    [expectString, createStyleSource("local", expectString)],
    // shared style sources are inserted without changes
    ["local4", createStyleSource("local", "local4")],
    ["token5", createStyleSource("token", "token5")],
  ]);
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
    createStyleSourceSelection("instance3", ["local6", "token5"]),
    createStyleSourceSelection("instance4", ["token5"]),
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
    ["instance4", createStyleSourceSelection("instance4", ["token5"])],
  ]);
});

test("insert styles copy and apply new style source ids", () => {
  const styles: Styles = new Map([
    createStyleDeclPair("styleSource1", "bp1"),
    createStyleDeclPair("styleSource2", "bp2"),
    createStyleDeclPair("styleSource1", "bp3"),
    createStyleDeclPair("styleSource3", "bp4"),
    createStyleDeclPair("existingSharedStyleSource", "bp4"),
  ]);
  const copiedStyles = [
    createStyleDecl("styleSource2", "bp2"),
    createStyleDecl("styleSource3", "bp4"),
    createStyleDecl("sharedStyleSource", "bp4"),
    createStyleDecl("existingSharedStyleSource", "bp4", "newValue"),
  ];
  const copiedStyleSourceIds = new Map<StyleSource["id"], StyleSource["id"]>([
    ["styleSource2", "newStyleSource2"],
    ["styleSource3", "newStyleSource3"],
  ]);
  const mergedBreakpointIds = new Map<Breakpoint["id"], Breakpoint["id"]>([
    ["bp2", "newBp2"],
  ]);
  insertStylesCopyMutable(
    styles,
    copiedStyles,
    copiedStyleSourceIds,
    mergedBreakpointIds
  );
  expect(Array.from(styles.entries())).toEqual([
    createStyleDeclPair("styleSource1", "bp1"),
    createStyleDeclPair("styleSource2", "bp2"),
    createStyleDeclPair("styleSource1", "bp3"),
    createStyleDeclPair("styleSource3", "bp4"),
    // shared style is not overriden
    createStyleDeclPair("existingSharedStyleSource", "bp4"),
    // new styles are copied
    createStyleDeclPair("newStyleSource2", "newBp2"),
    createStyleDeclPair("newStyleSource3", "bp4"),
    // shared style inserted without changes
    createStyleDeclPair("sharedStyleSource", "bp4"),
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

test("merge new breakpoints", () => {
  const breakpoints = new Map([
    createBreakpointPair("1", 0),
    createBreakpointPair("2", 600),
    createBreakpointPair("3", 1200),
  ]);
  const newBreakpoints = [
    createBreakpoint("4", 600),
    createBreakpoint("5", 768),
  ];
  const mergedBreakpointIds = mergeNewBreakpointsMutable(
    breakpoints,
    newBreakpoints
  );
  expect(mergedBreakpointIds).toEqual(new Map([["4", "2"]]));
  expect(breakpoints).toEqual(
    new Map([
      createBreakpointPair("1", 0),
      createBreakpointPair("2", 600),
      createBreakpointPair("3", 1200),
      createBreakpointPair("5", 768),
    ])
  );
});
