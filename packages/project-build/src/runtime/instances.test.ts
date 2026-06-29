import { describe, expect, test } from "vitest";
import {
  elementComponent,
  type Instance,
  type Prop,
  type StyleDecl,
  type StyleSource,
  type StyleSourceSelection,
} from "@webstudio-is/sdk";
import {
  collectExclusiveInstanceIds,
  cloneInstanceSubtree,
  cloneInstanceWithNewIds,
  createInstanceAppendPayload,
  createInstanceChild,
  createInstanceClonePayload,
  createInstanceCleanupPayload,
  createInstanceDeletePayload,
  createInstanceMovePatches,
  createInstanceMovePayload,
  createTextContentChild,
  createTextContentResetPayload,
  createTextContentUpdatePayload,
  findChildReferenceIndex,
  findLocalStyleSourcesWithinInstances,
  findParentInstanceReference,
  findTextContentChild,
  getInstanceDepths,
  getSameParentAdjustedInsertIndex,
  getTextContentChild,
  getTextContentErrors,
  isTextContentChild,
  serializeTextNodes,
  setTextContentMutable,
} from "./instances";

const createInstance = (
  id: Instance["id"],
  componentOrChildren: string | Instance["children"] = [],
  children?: Instance["children"]
): Instance => ({
  type: "instance",
  id,
  component:
    typeof componentOrChildren === "string"
      ? componentOrChildren
      : elementComponent,
  children:
    typeof componentOrChildren === "string"
      ? (children ?? [])
      : componentOrChildren,
});

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

test("collects root-owned instance ids without deleting shared child subtrees", () => {
  const instances = new Map<Instance["id"], Instance>([
    [
      "page-root",
      createInstance("page-root", [
        { type: "id", value: "owned-child" },
        { type: "id", value: "shared-child" },
      ]),
    ],
    ["owned-child", createInstance("owned-child")],
    [
      "other-root",
      createInstance("other-root", [{ type: "id", value: "shared-child" }]),
    ],
    [
      "shared-child",
      createInstance("shared-child", [{ type: "id", value: "shared-leaf" }]),
    ],
    ["shared-leaf", createInstance("shared-leaf")],
  ]);

  expect(collectExclusiveInstanceIds(instances, ["page-root"])).toEqual(
    new Set(["page-root", "owned-child"])
  );
});

test("collects multiple requested roots even when one root references another", () => {
  const instances = new Map<Instance["id"], Instance>([
    [
      "first-root",
      createInstance("first-root", [{ type: "id", value: "second-root" }]),
    ],
    [
      "second-root",
      createInstance("second-root", [{ type: "id", value: "child" }]),
    ],
    ["child", createInstance("child")],
  ]);

  expect(
    collectExclusiveInstanceIds(instances, ["first-root", "second-root"])
  ).toEqual(new Set(["first-root", "second-root", "child"]));
});
const createCloneInstance = (
  id: Instance["id"],
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component: elementComponent,
  children,
});

test("creates instance clone payload with child references and props", () => {
  const targetParent = createCloneInstance("parent", []);
  const props: Prop[] = [
    {
      id: "prop",
      instanceId: "source",
      name: "className",
      type: "string",
      value: "card",
    },
  ];
  const ids = ["source-copy", "child-copy", "prop-copy"];

  const result = createInstanceClonePayload({
    instances: new Map([
      [
        "source",
        createCloneInstance("source", [
          { type: "id", value: "child" },
          { type: "text", value: "Text" },
        ]),
      ],
      ["child", createCloneInstance("child")],
      [targetParent.id, targetParent],
    ]),
    sourceInstanceId: "source",
    targetParent,
    insertIndex: 0,
    props,
    styleSourceSelections: [],
    styleSources: [],
    styles: new Map(),
    createId: () => ids.shift() ?? "missing",
  });

  expect(result).toEqual({
    clonedRootId: "source-copy",
    clonedInstanceIds: ["source-copy", "child-copy"],
    payload: [
      {
        namespace: "instances",
        patches: [
          {
            op: "add",
            path: ["source-copy"],
            value: createCloneInstance("source-copy", [
              { type: "id", value: "child-copy" },
              { type: "text", value: "Text" },
            ]),
          },
          {
            op: "add",
            path: ["child-copy"],
            value: createCloneInstance("child-copy"),
          },
          {
            op: "add",
            path: ["parent", "children", 0],
            value: { type: "id", value: "source-copy" },
          },
        ],
      },
      {
        namespace: "props",
        patches: [
          {
            op: "add",
            path: [expect.any(String)],
            value: {
              ...props[0],
              id: expect.any(String),
              instanceId: "source-copy",
            },
          },
        ],
      },
    ],
  });
});
describe("text content utils", () => {
  test("creates text and expression children", () => {
    expect(createTextContentChild({ type: "text", value: "Hello" })).toEqual({
      type: "text",
      value: "Hello",
    });
    expect(
      createTextContentChild({ type: "expression", value: "title" })
    ).toEqual({
      type: "expression",
      value: "title",
    });
  });

  test("validates only expression children", () => {
    expect(
      getTextContentErrors({ type: "text", value: "invalid expression {" })
    ).toEqual([]);
    expect(
      getTextContentErrors({ type: "expression", value: "invalid {" })
    ).not.toEqual([]);
  });

  test("detects text content children", () => {
    expect(isTextContentChild({ type: "text", value: "Hello" })).toBe(true);
    expect(isTextContentChild({ type: "expression", value: "title" })).toBe(
      true
    );
    expect(isTextContentChild({ type: "id", value: "child" })).toBe(false);
    expect(isTextContentChild(undefined)).toBe(false);
  });

  test("gets text content child by index", () => {
    const instance: Instance = {
      type: "instance",
      id: "instance",
      component: "Text",
      children: [
        { type: "id", value: "child" },
        { type: "text", value: "Hello" },
      ],
    };

    expect(getTextContentChild(instance, 0)).toBeUndefined();
    expect(getTextContentChild(instance, 1)).toEqual({
      type: "text",
      value: "Hello",
    });
  });

  test("finds text content children with explicit status", () => {
    const instances: Instance[] = [
      {
        type: "instance",
        id: "instance",
        component: "Text",
        children: [
          { type: "id", value: "child" },
          { type: "text", value: "Hello" },
        ],
      },
    ];

    expect(
      findTextContentChild(instances, {
        instanceId: "instance",
        childIndex: 1,
        mode: "text",
      })
    ).toEqual({
      status: "found",
      child: { type: "text", value: "Hello" },
    });
    expect(
      findTextContentChild(instances, {
        instanceId: "missing",
        childIndex: 1,
      })
    ).toEqual({ status: "instance-not-found" });
    expect(
      findTextContentChild(instances, {
        instanceId: "instance",
        childIndex: 2,
      })
    ).toEqual({ status: "child-not-found" });
    expect(
      findTextContentChild(instances, {
        instanceId: "instance",
        childIndex: 0,
      })
    ).toEqual({ status: "not-text-content" });
    expect(
      findTextContentChild(instances, {
        instanceId: "instance",
        childIndex: 1,
        mode: "expression",
      })
    ).toEqual({ status: "mode-mismatch", actual: "text" });
  });

  test("replaces instance children with a single text content child", () => {
    const instance: Instance = {
      type: "instance",
      id: "instance",
      component: "Text",
      children: [{ type: "text", value: "old" }],
    };

    setTextContentMutable(instance, "expression", "value");

    expect(instance.children).toEqual([{ type: "expression", value: "value" }]);
  });

  test("creates text content update payload", () => {
    expect(
      createTextContentUpdatePayload({
        instanceId: "instance",
        childIndex: 1,
        child: { type: "text", value: "Hello" },
      })
    ).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["instance", "children", 1],
            value: { type: "text", value: "Hello" },
          },
        ],
      },
    ]);
  });

  test("creates text content reset payload", () => {
    expect(createTextContentResetPayload({ instanceId: "instance" })).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["instance", "children"],
            value: [],
          },
        ],
      },
    ]);
  });

  test("serializes text and expression children with filters", () => {
    const instances: Instance[] = [
      {
        type: "instance",
        id: "root",
        component: "Body",
        children: [
          { type: "text", value: "Hello world" },
          { type: "id", value: "child" },
        ],
      },
      {
        type: "instance",
        id: "child",
        component: "Text",
        label: "Label",
        children: [{ type: "expression", value: "greeting" }],
      },
      {
        type: "instance",
        id: "outside",
        component: "Text",
        children: [{ type: "text", value: "Outside" }],
      },
    ];

    expect(
      serializeTextNodes({
        instances,
        rootInstanceIds: new Set(["root", "child"]),
        mode: "all",
        maxValueLength: 5,
      })
    ).toEqual([
      {
        instanceId: "root",
        childIndex: 0,
        component: "Body",
        label: undefined,
        mode: "text",
        value: "Hello",
      },
      {
        instanceId: "child",
        childIndex: 0,
        component: "Text",
        label: "Label",
        mode: "expression",
        value: "greet",
      },
    ]);

    expect(
      serializeTextNodes({
        instances,
        instanceId: "root",
        mode: "text",
        contains: "world",
      })
    ).toEqual([
      {
        instanceId: "root",
        childIndex: 0,
        component: "Body",
        label: undefined,
        mode: "text",
        value: "Hello world",
      },
    ]);
  });
});

test("clone instance with mapped id children", () => {
  expect(
    cloneInstanceWithNewIds({
      instance: {
        type: "instance",
        id: "source",
        component: elementComponent,
        children: [
          { type: "id", value: "child" },
          { type: "text", value: "Text" },
          { type: "expression", value: "value" },
        ],
      },
      newInstanceIds: new Map([
        ["source", "clone"],
        ["child", "child-clone"],
      ]),
    })
  ).toEqual({
    type: "instance",
    id: "clone",
    component: elementComponent,
    children: [
      { type: "id", value: "child-clone" },
      { type: "text", value: "Text" },
      { type: "expression", value: "value" },
    ],
  });
});

test("clones an instance subtree with new ids", () => {
  const instances = new Map([
    [
      "root",
      createInstance("root", elementComponent, [
        { type: "id", value: "child" },
        { type: "text", value: "Text" },
      ]),
    ],
    ["child", createInstance("child", elementComponent)],
  ]);
  const ids = ["root-copy", "child-copy"];

  expect(
    cloneInstanceSubtree({
      instances,
      rootInstanceId: "root",
      createId: () => ids.shift() ?? "missing",
    })
  ).toEqual({
    instanceIds: ["root", "child"],
    nextIdById: new Map([
      ["root", "root-copy"],
      ["child", "child-copy"],
    ]),
    clonedInstances: [
      [
        "root-copy",
        createInstance("root-copy", elementComponent, [
          { type: "id", value: "child-copy" },
          { type: "text", value: "Text" },
        ]),
      ],
      ["child-copy", createInstance("child-copy", elementComponent)],
    ],
  });
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

test("gets instance depths from root ids", () => {
  const instances = new Map([
    [
      "root",
      createInstance("root", elementComponent, [
        { type: "id", value: "child" },
      ]),
    ],
    ["child", createInstance("child", elementComponent)],
  ]);

  expect(getInstanceDepths(instances, ["root"])).toEqual(
    new Map([
      ["root", 0],
      ["child", 1],
    ])
  );
});

test("finds child reference index", () => {
  expect(
    findChildReferenceIndex(
      [
        { type: "text", value: "before" },
        { type: "id", value: "child" },
        { type: "text", value: "after" },
      ],
      "child"
    )
  ).toBe(1);
  expect(
    findChildReferenceIndex([{ type: "text", value: "only" }], "child")
  ).toBe(-1);
});

test("creates instance child references", () => {
  expect(createInstanceChild("child")).toEqual({ type: "id", value: "child" });
});

test("adjusts same-parent insert index after removal", () => {
  expect(
    getSameParentAdjustedInsertIndex({
      currentIndex: 1,
      requestedIndex: 3,
    })
  ).toBe(2);
  expect(
    getSameParentAdjustedInsertIndex({
      currentIndex: 3,
      requestedIndex: 1,
    })
  ).toBe(1);
});

test("finds parent instance reference", () => {
  const instances = new Map([
    [
      "parent",
      createInstance("parent", elementComponent, [
        { type: "text", value: "before" },
        { type: "id", value: "child" },
      ]),
    ],
    ["child", createInstance("child", elementComponent)],
  ]);

  expect(findParentInstanceReference(instances, "child")).toEqual({
    instance: instances.get("parent"),
    childIndex: 1,
  });
  expect(findParentInstanceReference(instances, "missing")).toBeUndefined();
});

test("creates instance move patches", () => {
  const instances = new Map([
    [
      "parent",
      createInstance("parent", elementComponent, [
        { type: "id", value: "a" },
        { type: "id", value: "b" },
      ]),
    ],
    ["a", createInstance("a", elementComponent)],
    ["b", createInstance("b", elementComponent)],
    ["target", createInstance("target", elementComponent)],
  ]);

  expect(
    createInstanceMovePatches({
      instances,
      moves: [{ instanceId: "a", parentInstanceId: "target" }],
    })
  ).toEqual({
    errors: [],
    patches: [
      { op: "remove", path: ["parent", "children", 0] },
      {
        op: "add",
        path: ["target", "children", 0],
        value: { type: "id", value: "a" },
      },
    ],
  });
});

test("creates instance move payload", () => {
  const instances = new Map([
    [
      "parent",
      createInstance("parent", elementComponent, [{ type: "id", value: "a" }]),
    ],
    ["a", createInstance("a", elementComponent)],
    ["target", createInstance("target", elementComponent)],
  ]);

  expect(
    createInstanceMovePayload({
      instances,
      moves: [{ instanceId: "a", parentInstanceId: "target" }],
    })
  ).toEqual({
    errors: [],
    payload: [
      {
        namespace: "instances",
        patches: [
          { op: "remove", path: ["parent", "children", 0] },
          {
            op: "add",
            path: ["target", "children", 0],
            value: { type: "id", value: "a" },
          },
        ],
      },
    ],
  });
});

test("adjusts same-parent move insert indexes", () => {
  const instances = new Map([
    [
      "parent",
      createInstance("parent", elementComponent, [
        { type: "id", value: "a" },
        { type: "id", value: "b" },
        { type: "id", value: "c" },
      ]),
    ],
    ["a", createInstance("a", elementComponent)],
    ["b", createInstance("b", elementComponent)],
    ["c", createInstance("c", elementComponent)],
  ]);

  expect(
    createInstanceMovePatches({
      instances,
      moves: [{ instanceId: "a", parentInstanceId: "parent", insertIndex: 3 }],
    }).patches
  ).toEqual([
    { op: "remove", path: ["parent", "children", 0] },
    {
      op: "add",
      path: ["parent", "children", 2],
      value: { type: "id", value: "a" },
    },
  ]);
});

test("reports invalid instance moves", () => {
  const instances = new Map([
    [
      "parent",
      createInstance("parent", elementComponent, [
        { type: "id", value: "child" },
      ]),
    ],
    [
      "child",
      createInstance("child", elementComponent, [
        { type: "id", value: "leaf" },
      ]),
    ],
    ["leaf", createInstance("leaf", elementComponent)],
  ]);

  expect(
    createInstanceMovePatches({
      instances,
      moves: [
        { instanceId: "missing", parentInstanceId: "parent" },
        { instanceId: "child", parentInstanceId: "leaf" },
        { instanceId: "child", parentInstanceId: "parent", insertIndex: 2 },
      ],
    }).errors
  ).toEqual([
    { type: "instance-not-found", instanceId: "missing" },
    { type: "descendant-target", instanceId: "child" },
    { type: "insert-index-outside-parent", parentInstanceId: "parent" },
  ]);
});

test("creates instance delete payload with cleanup", () => {
  const instances = new Map([
    [
      "parent",
      createInstance("parent", elementComponent, [
        { type: "id", value: "child" },
      ]),
    ],
    [
      "child",
      createInstance("child", elementComponent, [
        { type: "id", value: "leaf" },
      ]),
    ],
    ["leaf", createInstance("leaf", elementComponent)],
  ]);
  const result = createInstanceDeletePayload({
    instances,
    instanceIds: ["child"],
    props: [],
    dataSources: [],
    styleSources: [],
    styleSourceSelections: [],
    styles: [],
  });

  expect(result.errors).toEqual([]);
  expect(result.instanceIds).toEqual(["child", "leaf"]);
  expect(result.payload[0]).toEqual({
    namespace: "instances",
    patches: [
      { op: "remove", path: ["parent", "children", 0] },
      { op: "remove", path: ["child"] },
      { op: "remove", path: ["leaf"] },
    ],
  });
  expect(result.payload.every(({ patches }) => patches.length > 0)).toBe(true);
});

test("omits empty instance cleanup namespaces", () => {
  expect(
    createInstanceDeletePayload({
      instances: new Map([
        [
          "root",
          createInstance("root", elementComponent, [
            { type: "id", value: "child" },
          ]),
        ],
        ["child", createInstance("child", elementComponent)],
      ]),
      instanceIds: ["child"],
      props: [],
      dataSources: [],
      styleSources: [],
      styleSourceSelections: [],
      styles: [],
    }).payload
  ).toEqual([
    {
      namespace: "instances",
      patches: [
        { op: "remove", path: ["root", "children", 0] },
        { op: "remove", path: ["child"] },
      ],
    },
  ]);
});

test("creates instance append payload", () => {
  const parent = createInstance("parent", elementComponent);
  const created = createInstance("created", elementComponent);
  const instances = new Map([["parent", parent]]);

  expect(
    createInstanceAppendPayload({
      parent,
      instances,
      createdInstances: [created],
      insertIndex: 0,
      mode: "append",
      props: [],
      dataSources: [],
      styleSources: [],
      styleSourceSelections: [],
      styles: [],
    })
  ).toEqual({
    replacedInstanceIds: [],
    payload: [
      {
        namespace: "instances",
        patches: [
          { op: "add", path: ["created"], value: created },
          {
            op: "add",
            path: ["parent", "children", 0],
            value: { type: "id", value: "created" },
          },
        ],
      },
    ],
  });
});

test("creates instance replace payload with cleanup", () => {
  const parent = createInstance("parent", elementComponent, [
    { type: "id", value: "old" },
    { type: "text", value: "keep text cleanup only removes ids" },
  ]);
  const old = createInstance("old", elementComponent, [
    { type: "id", value: "leaf" },
  ]);
  const leaf = createInstance("leaf", elementComponent);
  const created = createInstance("created", elementComponent);
  const instances = new Map([
    ["parent", parent],
    ["old", old],
    ["leaf", leaf],
  ]);

  expect(
    createInstanceAppendPayload({
      parent,
      instances,
      createdInstances: [created],
      insertIndex: 0,
      mode: "replace",
      props: [],
      dataSources: [],
      styleSources: [],
      styleSourceSelections: [],
      styles: [],
    })
  ).toEqual({
    replacedInstanceIds: ["old", "leaf"],
    payload: [
      {
        namespace: "instances",
        patches: [
          { op: "remove", path: ["parent", "children", 1] },
          { op: "remove", path: ["parent", "children", 0] },
          { op: "add", path: ["created"], value: created },
          {
            op: "add",
            path: ["parent", "children", 0],
            value: { type: "id", value: "created" },
          },
          { op: "remove", path: ["old"] },
          { op: "remove", path: ["leaf"] },
        ],
      },
    ],
  });
});

test("reports invalid instance deletes", () => {
  const instances = new Map([
    ["root", createInstance("root", elementComponent)],
  ]);

  expect(
    createInstanceDeletePayload({
      instances,
      instanceIds: ["root", "missing"],
      pageRootIds: new Set(["root"]),
      props: [],
      dataSources: [],
      styleSources: [],
      styleSourceSelections: [],
      styles: [],
    }).errors
  ).toEqual([
    { type: "page-root", instanceId: "root" },
    { type: "instance-not-found", instanceId: "missing" },
  ]);
});

test("cleans local styles and scoped data when removing instances", () => {
  const styleDecl: StyleDecl = {
    styleSourceId: "local-1",
    breakpointId: "base",
    property: "color",
    value: { type: "keyword", value: "red" },
  };
  const props: Prop[] = [
    {
      id: "prop-1",
      instanceId: "child-1",
      name: "title",
      type: "string",
      value: "Title",
    },
    {
      id: "resource-prop",
      instanceId: "child-1",
      name: "data",
      type: "resource",
      value: "prop-resource",
    },
  ];
  const styles: StyleDecl[] = [
    styleDecl,
    {
      styleSourceId: "token-1",
      breakpointId: "base",
      property: "fontSize",
      value: { type: "unit", value: 16, unit: "px" },
    },
  ];

  expect(
    createInstanceCleanupPayload({
      instanceIds: new Set(["child-1"]),
      props,
      dataSources: [
        {
          id: "variable-1",
          type: "variable",
          scopeInstanceId: "child-1",
          name: "Value",
          value: { type: "string", value: "text" },
        },
        {
          id: "resource-variable",
          type: "resource",
          scopeInstanceId: "child-1",
          name: "Resource",
          resourceId: "variable-resource",
        },
      ],
      styleSources: [
        { type: "local", id: "local-1" },
        { type: "token", id: "token-1", name: "Token" },
      ],
      styleSourceSelections: [
        { instanceId: "child-1", values: ["token-1", "local-1"] },
      ],
      styles,
    })
  ).toEqual([
    {
      namespace: "instances",
      patches: [{ op: "remove", path: ["child-1"] }],
    },
    {
      namespace: "props",
      patches: [
        { op: "remove", path: ["prop-1"] },
        { op: "remove", path: ["resource-prop"] },
      ],
    },
    {
      namespace: "dataSources",
      patches: [
        { op: "remove", path: ["variable-1"] },
        { op: "remove", path: ["resource-variable"] },
      ],
    },
    {
      namespace: "resources",
      patches: [
        { op: "remove", path: ["prop-resource"] },
        { op: "remove", path: ["variable-resource"] },
      ],
    },
    {
      namespace: "styleSourceSelections",
      patches: [{ op: "remove", path: ["child-1"] }],
    },
    {
      namespace: "styleSources",
      patches: [{ op: "remove", path: ["local-1"] }],
    },
    {
      namespace: "styles",
      patches: [{ op: "remove", path: ["local-1:base:color:"] }],
    },
  ]);
});

test("gets instance depths from roots", () => {
  const instances = new Map([
    [
      "root",
      createInstance("root", elementComponent, [
        { type: "id", value: "child" },
        { type: "id", value: "sibling" },
      ]),
    ],
    [
      "child",
      createInstance("child", elementComponent, [
        { type: "id", value: "leaf" },
      ]),
    ],
    ["sibling", createInstance("sibling", elementComponent)],
    ["leaf", createInstance("leaf", elementComponent)],
    ["other-root", createInstance("other-root", elementComponent)],
  ]);

  expect(getInstanceDepths(instances, ["root"])).toEqual(
    new Map([
      ["root", 0],
      ["child", 1],
      ["leaf", 2],
      ["sibling", 1],
    ])
  );
});
