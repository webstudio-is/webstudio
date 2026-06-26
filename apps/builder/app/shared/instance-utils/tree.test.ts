import { test, expect } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { CompactBuild } from "@webstudio-is/project-build";
import type {
  Instance,
  Props,
  StyleDecl,
  Styles,
  StyleSource,
  StyleSourceSelection,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  collectionComponent,
  elementComponent,
  getStyleDeclKey,
} from "@webstudio-is/sdk";
import {
  areInstanceSelectorsEqual,
  createInstanceAppendPayload,
  createInstanceChild,
  createInstanceDeletePayload,
  createInstanceMovePayload,
  createInstanceMovePatches,
  cloneInstanceSubtree,
  cloneInstanceWithNewIds,
  cloneStyles,
  findChildReferenceIndex,
  findLocalStyleSourcesWithinInstances,
  findParentInstanceReference,
  getBuildInstanceDepths,
  getInstanceDepths,
  getSameParentAdjustedInsertIndex,
  getReparentDropTargetMutable,
  isDescendantOrSelf,
  serializeInstanceSummary,
  wrapEditableChildrenAroundDropTargetMutable,
} from "./tree";

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

test("clone styles with applied new style source ids", () => {
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

test("gets instance depths from build page roots", () => {
  const build = {
    pages: createDefaultPages({ rootInstanceId: "root" }),
    instances: [
      createInstance("root", elementComponent, [
        { type: "id", value: "child" },
      ]),
      createInstance("child", elementComponent),
    ],
  } satisfies Pick<CompactBuild, "pages" | "instances">;

  expect(getBuildInstanceDepths(build)).toEqual(
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

test("serializes instance summary", () => {
  expect(
    serializeInstanceSummary(
      createInstance("instance", elementComponent, [
        { type: "id", value: "child" },
        { type: "text", value: "Text" },
      ]),
      2
    )
  ).toEqual({
    id: "instance",
    label: undefined,
    component: elementComponent,
    tag: undefined,
    depth: 2,
    childCount: 2,
  });
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
      build: {
        props: [],
        dataSources: [],
        styleSources: [],
        styleSourceSelections: [],
        styles: [],
      },
      parent,
      instances,
      createdInstances: [created],
      insertIndex: 0,
      mode: "append",
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
      build: {
        props: [],
        dataSources: [],
        styleSources: [],
        styleSourceSelections: [],
        styles: [],
      },
      parent,
      instances,
      createdInstances: [created],
      insertIndex: 0,
      mode: "replace",
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
