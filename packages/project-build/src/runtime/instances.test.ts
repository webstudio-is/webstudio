import { describe, expect, test } from "vitest";
import {
  encodeDataVariableId,
  type DataSource,
  elementComponent,
  type Instance,
  type Prop,
  type StyleDecl,
  type StyleSource,
  type StyleSourceSelection,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  collectExclusiveInstanceIds,
  canUnwrapInstancePath,
  canWrapInstance,
  canConvertInstance,
  cloneInstanceSubtree,
  cloneInstanceWithNewIds,
  convertInstance,
  createInstanceAppendPayload,
  createInstanceChild,
  createInstanceClonePayload,
  createInstanceCleanupPayload,
  createInstanceDeletePayload,
  createInstanceMovePatches,
  createInstanceMovePayload,
  createTextTreeUpdatePayload,
  createTextContentChild,
  createTextContentResetPayload,
  createTextContentSetPayload,
  createTextContentUpdatePayload,
  findChildReferenceIndex,
  findLocalStyleSourcesWithinInstances,
  findParentInstanceReference,
  fillGrid,
  findTextContentChild,
  getInstanceDepths,
  getValidElementChildTags,
  getValidTagsForInstance,
  getSameParentAdjustedInsertIndex,
  getTextContentChild,
  getTextContentErrors,
  isTextContentChild,
  listInstances,
  deleteInstances,
  moveInstancesInput,
  moveInstances,
  replaceTextInput,
  serializeTextNodes,
  setInstanceLabel,
  setInstanceTag,
  setTextContent,
  setTextContentMutable,
  unwrapInstance,
  updateTextTree,
  updateTextInstance,
  wrapInstance,
} from "./instances";
import { applyBuilderPatchPayloadMutable } from "../state/patch";
import { createDefaultPages } from "@webstudio-is/project-build";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";

const runtimeContext = { createId: () => "generated" };

test("rejects conflicting page selectors for text replacement", () => {
  expect(
    replaceTextInput.safeParse({
      find: "Old",
      replace: "New",
      pageId: "home",
      pagePath: "/other",
    }).success
  ).toBe(false);
});

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

describe("canUnwrapInstancePath", () => {
  test("allows regular nested instances and rejects root children and rich text", () => {
    const body = createInstance("body", "Body", [
      { type: "id", value: "wrapper" },
      { type: "id", value: "paragraph" },
    ]);
    const wrapper = createInstance("wrapper", "Box", [
      { type: "id", value: "box" },
    ]);
    const box = createInstance("box", "Box");
    const paragraph = createInstance("paragraph", "Paragraph", [
      { type: "id", value: "bold" },
    ]);
    const bold = createInstance("bold", "Bold");
    const instances = new Map([
      ["body", body],
      ["wrapper", wrapper],
      ["box", box],
      ["paragraph", paragraph],
      ["bold", bold],
    ]);
    const props = new Map();

    expect(
      canUnwrapInstancePath({
        instancePath: [
          { instance: box, instanceSelector: ["box", "wrapper", "body"] },
          { instance: wrapper, instanceSelector: ["wrapper", "body"] },
          { instance: body, instanceSelector: ["body"] },
        ],
        rootInstanceId: "body",
        instances,
        props,
        metas: componentMetas,
      })
    ).toBe(true);
    expect(
      canUnwrapInstancePath({
        instancePath: [
          { instance: wrapper, instanceSelector: ["wrapper", "body"] },
          { instance: body, instanceSelector: ["body"] },
        ],
        rootInstanceId: "body",
        instances,
        props,
        metas: componentMetas,
      })
    ).toBe(false);
    expect(
      canUnwrapInstancePath({
        instancePath: [
          { instance: bold, instanceSelector: ["bold", "paragraph", "body"] },
          { instance: paragraph, instanceSelector: ["paragraph", "body"] },
          { instance: body, instanceSelector: ["body"] },
        ],
        rootInstanceId: "body",
        instances,
        props,
        metas: componentMetas,
      })
    ).toBe(false);
  });
});

describe("tag content model helpers", () => {
  test("returns tags that keep the selected instance valid in its parent", () => {
    const body = createInstance("body", elementComponent, [
      { type: "id", value: "list" },
    ]);
    body.tag = "body";
    const list = createInstance("list", elementComponent, [
      { type: "id", value: "item" },
    ]);
    list.tag = "ul";
    const item = createInstance("item", elementComponent);
    const instances = new Map([
      [body.id, body],
      [list.id, list],
      [item.id, item],
    ]);

    expect(
      getValidTagsForInstance({
        instanceId: item.id,
        instanceSelector: [item.id, list.id, body.id],
        instances,
        props: new Map(),
        metas: componentMetas,
        availableTags: ["div", "li"],
      })
    ).toEqual(["li"]);
  });

  test("returns tags for a new element child without preserving invalid descendants", () => {
    const body = createInstance("body", elementComponent, [
      { type: "id", value: "list" },
    ]);
    body.tag = "body";
    const list = createInstance("list", elementComponent, [
      { type: "id", value: "invalid-child" },
    ]);
    list.tag = "ul";
    const invalidChild = createInstance("invalid-child", elementComponent);
    invalidChild.tag = "div";
    const instances = new Map([
      [body.id, body],
      [list.id, list],
      [invalidChild.id, invalidChild],
    ]);

    expect(
      getValidElementChildTags({
        parentInstanceId: list.id,
        parentInstanceSelector: [list.id, body.id],
        instances,
        props: new Map(),
        metas: componentMetas,
        availableTags: ["div", "li"],
      })
    ).toEqual(["li"]);
  });
});

describe("canWrapInstance", () => {
  test("validates both wrapper placement and wrapped child placement", () => {
    const body = createInstance("body", elementComponent, [
      { type: "id", value: "text" },
      { type: "id", value: "list" },
    ]);
    body.tag = "body";
    const text = createInstance("text", elementComponent);
    text.tag = "span";
    const list = createInstance("list", elementComponent, [
      { type: "id", value: "list-item" },
    ]);
    list.tag = "ul";
    const listItem = createInstance("list-item", elementComponent);
    listItem.tag = "li";
    const instances = new Map([
      [body.id, body],
      [text.id, text],
      [list.id, list],
      [listItem.id, listItem],
    ]);

    expect(
      canWrapInstance(
        text.id,
        [text.id, body.id],
        body.id,
        elementComponent,
        "strong",
        instances,
        new Map(),
        componentMetas
      )
    ).toBe(true);
    expect(
      canWrapInstance(
        listItem.id,
        [listItem.id, list.id, body.id],
        list.id,
        elementComponent,
        "div",
        instances,
        new Map(),
        componentMetas
      )
    ).toBe(false);
  });
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

test("collects shared descendants when all owners are requested", () => {
  const instances = new Map<Instance["id"], Instance>([
    [
      "first-root",
      createInstance("first-root", [{ type: "id", value: "shared-child" }]),
    ],
    [
      "second-root",
      createInstance("second-root", [{ type: "id", value: "shared-child" }]),
    ],
    [
      "shared-child",
      createInstance("shared-child", [{ type: "id", value: "shared-leaf" }]),
    ],
    ["shared-leaf", createInstance("shared-leaf")],
  ]);

  expect(
    collectExclusiveInstanceIds(instances, ["first-root", "second-root"])
  ).toEqual(
    new Set(["first-root", "shared-child", "shared-leaf", "second-root"])
  );
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

test("preserves asset references when cloning instance props", () => {
  const ids = ["source-copy", "asset-prop-copy"];
  const result = createInstanceClonePayload({
    instances: new Map([
      ["source", createCloneInstance("source")],
      ["parent", createCloneInstance("parent")],
    ]),
    sourceInstanceId: "source",
    targetParent: createCloneInstance("parent"),
    insertIndex: 0,
    props: [
      {
        id: "image-src",
        instanceId: "source",
        name: "src",
        type: "asset",
        value: "hero-image",
      },
    ],
    styleSourceSelections: [],
    styleSources: [],
    styles: new Map(),
    createId: () => ids.shift() ?? "missing",
  });

  if (result === undefined) {
    throw new Error(
      "Expected valid source instance to produce a clone payload"
    );
  }
  const propsPayload = result.payload.find(
    (item) => item.namespace === "props"
  );
  expect(propsPayload).toEqual({
    namespace: "props",
    patches: [
      {
        op: "add",
        path: [expect.any(String)],
        value: {
          id: expect.any(String),
          instanceId: "source-copy",
          name: "src",
          type: "asset",
          value: "hero-image",
        },
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

  test.each([undefined, "text" as const])(
    "updates expression children as direct text with mode %s",
    (mode) => {
      const result = updateTextInstance(
        {
          instances: new Map([
            [
              "instance",
              createInstance("instance", [
                { type: "expression", value: '"Old value"' },
              ]),
            ],
          ]),
        },
        {
          instanceId: "instance",
          childIndex: 0,
          text: "New visible text",
          mode,
        }
      );

      expect(result).toMatchObject({
        kind: "mutation",
        result: {
          instanceId: "instance",
          childIndex: 0,
          mode: "text",
        },
      });
      expect(result.payload).toEqual([
        {
          namespace: "instances",
          patches: [
            {
              op: "replace",
              path: ["instance", "children", 0],
              value: { type: "text", value: "New visible text" },
            },
          ],
        },
      ]);
    }
  );

  test("validates expression text only when expression mode is requested", () => {
    expect(() =>
      updateTextInstance(
        {
          instances: new Map([
            [
              "instance",
              createInstance("instance", [{ type: "text", value: "Old" }]),
            ],
          ]),
        },
        {
          instanceId: "instance",
          childIndex: 0,
          text: "invalid expression {",
          mode: "expression",
        }
      )
    ).toThrow("Unexpected token");
  });

  test("sets text content as the only child", () => {
    const result = setTextContent(
      {
        instances: new Map([
          [
            "instance",
            createInstance("instance", [{ type: "id", value: "child" }]),
          ],
        ]),
      },
      {
        operation: "set",
        instanceId: "instance",
        text: "Hello",
        mode: "text",
      }
    );

    expect(result).toMatchObject({
      kind: "mutation",
      result: {
        instanceId: "instance",
        operation: "set",
        mode: "text",
      },
    });
    expect(result.payload).toEqual(
      createTextContentSetPayload({
        instanceId: "instance",
        child: { type: "text", value: "Hello" },
      })
    );
  });

  test("resets text content", () => {
    const result = setTextContent(
      {
        instances: new Map([
          [
            "instance",
            createInstance("instance", [{ type: "text", value: "Hello" }]),
          ],
        ]),
      },
      {
        operation: "reset",
        instanceId: "instance",
      }
    );

    expect(result).toMatchObject({
      kind: "mutation",
      result: {
        instanceId: "instance",
        operation: "reset",
      },
    });
    expect(result.payload).toEqual(
      createTextContentResetPayload({ instanceId: "instance" })
    );
  });

  test("validates expression when setting text content", () => {
    expect(() =>
      setTextContent(
        {
          instances: new Map([["instance", createInstance("instance")]]),
        },
        {
          operation: "set",
          instanceId: "instance",
          text: "invalid expression {",
          mode: "expression",
        }
      )
    ).toThrow("Unexpected token");
  });

  test("does not mutate unchanged text content", () => {
    const result = setTextContent(
      {
        instances: new Map([
          [
            "instance",
            createInstance("instance", [{ type: "text", value: "Hello" }]),
          ],
        ]),
      },
      {
        operation: "set",
        instanceId: "instance",
        text: "Hello",
        mode: "text",
      }
    );

    expect(result.noop).toEqual(true);
    expect(result.payload).toEqual([]);
  });
});

describe("wrapInstance", () => {
  test("wraps selected instance with a runtime-generated parent", () => {
    const result = wrapInstance(
      {
        instances: new Map([
          [
            "body",
            createInstance("body", "Body", [{ type: "id", value: "selected" }]),
          ],
          ["selected", createInstance("selected", "Box")],
        ]),
        props: new Map(),
      },
      {
        instanceSelector: ["selected", "body"],
        component: "Box",
      },
      { createId: () => "wrapper" }
    );

    expect(result.result).toEqual({
      instanceSelector: ["wrapper", "body"],
    });
    expect(result.payload).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "add",
            path: ["wrapper"],
            value: createInstance("wrapper", "Box", [
              { type: "id", value: "selected" },
            ]),
          },
          {
            op: "replace",
            path: ["body", "children", 0],
            value: { type: "id", value: "wrapper" },
          },
        ],
      },
    ]);
  });

  test("wraps selected instance inside shared Slot content", () => {
    const result = wrapInstance(
      {
        instances: new Map([
          [
            "body",
            createInstance("body", "Body", [{ type: "id", value: "slot" }]),
          ],
          [
            "slot",
            createInstance("slot", "Slot", [{ type: "id", value: "fragment" }]),
          ],
          [
            "fragment",
            createInstance("fragment", "Fragment", [
              { type: "id", value: "selected" },
            ]),
          ],
          ["selected", createInstance("selected", "Box")],
        ]),
        props: new Map(),
      },
      {
        instanceSelector: ["selected", "fragment", "slot", "body"],
        component: elementComponent,
        tag: "div",
      },
      { createId: () => "wrapper" }
    );

    expect(result.result).toEqual({
      instanceSelector: ["wrapper", "fragment", "slot", "body"],
    });
    expect(result.payload).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["fragment"],
            value: createInstance("fragment", "Fragment", [
              { type: "id", value: "wrapper" },
            ]),
          },
          {
            op: "add",
            path: ["wrapper"],
            value: {
              ...createInstance("wrapper", elementComponent, [
                { type: "id", value: "selected" },
              ]),
              tag: "div",
            },
          },
        ],
      },
    ]);
  });

  test("rejects wrapping rich text content", () => {
    expect(() =>
      wrapInstance(
        {
          instances: new Map([
            [
              "body",
              createInstance("body", "Body", [
                { type: "id", value: "paragraph" },
              ]),
            ],
            [
              "paragraph",
              createInstance("paragraph", "Paragraph", [
                { type: "id", value: "bold" },
              ]),
            ],
            ["bold", createInstance("bold", "Bold")],
          ]),
          props: new Map(),
        },
        {
          instanceSelector: ["bold", "paragraph", "body"],
          component: "Box",
        },
        { createId: () => "wrapper" }
      )
    ).toThrow("Cannot wrap textual content");
  });
});

describe("canConvertInstance", () => {
  test("uses the same content-model validation as convertInstance", () => {
    const instances = new Map([
      ["body", createInstance("body", "Body", [{ type: "id", value: "box" }])],
      ["box", createInstance("box", "Box")],
    ]);
    const props = new Map();
    const metas: Map<string, WsComponentMeta> = new Map([
      ["Body", { contentModel: { category: "instance", children: ["Box"] } }],
      ["Box", { contentModel: { category: "instance", children: [] } }],
      [
        "Paragraph",
        { contentModel: { category: "instance", children: ["instance"] } },
      ],
    ]);

    expect(
      canConvertInstance({
        instanceId: "box",
        instanceSelector: ["box", "body"],
        component: "Box",
        instances,
        props,
        metas,
      })
    ).toBe(true);
    expect(
      canConvertInstance({
        instanceId: "box",
        instanceSelector: ["box", "body"],
        component: "Paragraph",
        instances,
        props,
        metas,
      })
    ).toBe(false);
  });
});

describe("convertInstance", () => {
  test("converts component and adds element tag", () => {
    const result = convertInstance(
      {
        instances: new Map([
          [
            "body",
            createInstance("body", "Body", [{ type: "id", value: "box" }]),
          ],
          ["box", createInstance("box", "Box")],
        ]),
        props: new Map(),
      },
      {
        instanceSelector: ["box", "body"],
        component: elementComponent,
        currentTag: "article",
      },
      runtimeContext
    );

    expect(result.result).toEqual({ instanceId: "box" });
    expect(result.payload).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["box", "component"],
            value: elementComponent,
          },
          {
            op: "add",
            path: ["box", "tag"],
            value: "article",
          },
        ],
      },
    ]);
  });

  test("removes legacy tag prop and renames React props when converting to element", () => {
    const result = convertInstance(
      {
        instances: new Map([
          [
            "body",
            createInstance("body", "Body", [{ type: "id", value: "box" }]),
          ],
          ["box", createInstance("box", "Box")],
        ]),
        props: new Map([
          [
            "box:tag",
            {
              id: "box:tag",
              instanceId: "box",
              name: "tag",
              type: "string",
              value: "div",
            },
          ],
          [
            "class-prop",
            {
              id: "class-prop",
              instanceId: "box",
              name: "className",
              type: "string",
              value: "hero",
            },
          ],
        ]),
      },
      {
        instanceSelector: ["box", "body"],
        component: elementComponent,
        tag: "section",
      },
      runtimeContext
    );

    expect(result.payload).toEqual([
      {
        namespace: "props",
        patches: [{ op: "remove", path: ["box:tag"] }],
      },
      {
        namespace: "props",
        patches: [
          { op: "remove", path: ["class-prop"] },
          {
            op: "add",
            path: ["box:class"],
            value: {
              id: "box:class",
              instanceId: "box",
              name: "class",
              type: "string",
              value: "hero",
            },
          },
        ],
      },
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["box", "component"],
            value: elementComponent,
          },
          {
            op: "add",
            path: ["box", "tag"],
            value: "section",
          },
        ],
      },
    ]);
  });

  test("converts selected instance inside shared Slot content", () => {
    const result = convertInstance(
      {
        pages: createDefaultPages({ rootInstanceId: "body" }),
        instances: new Map([
          [
            "body",
            createInstance("body", "Body", [{ type: "id", value: "slot" }]),
          ],
          [
            "slot",
            createInstance("slot", "Slot", [{ type: "id", value: "fragment" }]),
          ],
          [
            "fragment",
            createInstance("fragment", "Fragment", [
              { type: "id", value: "selected" },
            ]),
          ],
          ["selected", createInstance("selected", "Box")],
        ]),
        props: new Map(),
        dataSources: new Map(),
        resources: new Map(),
        styleSources: new Map(),
        styleSourceSelections: new Map(),
        styles: new Map(),
        breakpoints: new Map(),
        assets: new Map(),
      },
      {
        instanceSelector: ["selected", "fragment", "slot", "body"],
        component: elementComponent,
        tag: "section",
      },
      runtimeContext
    );

    expect(result.result).toEqual({ instanceId: "selected" });
    expect(result.payload).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["selected", "component"],
            value: elementComponent,
          },
          {
            op: "add",
            path: ["selected", "tag"],
            value: "section",
          },
        ],
      },
    ]);
  });

  test("rejects conversion that violates content model", () => {
    expect(() =>
      convertInstance(
        {
          instances: new Map([
            [
              "body",
              createInstance("body", "Body", [{ type: "id", value: "list" }]),
            ],
            [
              "list",
              {
                ...createInstance("list", elementComponent, [
                  { type: "id", value: "item" },
                ]),
                tag: "ul",
              },
            ],
            [
              "item",
              {
                ...createInstance("item", elementComponent),
                tag: "li",
              },
            ],
          ]),
          props: new Map(),
        },
        {
          instanceSelector: ["item", "list", "body"],
          component: elementComponent,
          tag: "div",
        },
        runtimeContext
      )
    ).toThrow("Converted tree violates content model");
  });
});

describe("unwrapInstance", () => {
  test("replaces empty parent with selected instance", () => {
    const result = unwrapInstance(
      {
        instances: new Map([
          [
            "body",
            createInstance("body", "Body", [{ type: "id", value: "parent" }]),
          ],
          [
            "parent",
            createInstance("parent", "Box", [{ type: "id", value: "child" }]),
          ],
          ["child", createInstance("child", "Box")],
        ]),
        props: new Map(),
      },
      {
        instanceSelector: ["child", "parent", "body"],
      },
      runtimeContext
    );

    expect(result.result).toEqual({
      instanceSelector: ["child", "body"],
    });
    expect(result.payload).toEqual([
      {
        namespace: "instances",
        patches: [
          { op: "remove", path: ["parent"] },
          {
            op: "replace",
            path: ["body", "children", 0],
            value: { type: "id", value: "child" },
          },
        ],
      },
    ]);
  });

  test("moves selected instance after parent when parent keeps siblings", () => {
    const result = unwrapInstance(
      {
        instances: new Map([
          [
            "body",
            createInstance("body", "Body", [{ type: "id", value: "parent" }]),
          ],
          [
            "parent",
            createInstance("parent", "Box", [
              { type: "id", value: "first" },
              { type: "id", value: "second" },
            ]),
          ],
          ["first", createInstance("first", "Image")],
          ["second", createInstance("second", "Link")],
        ]),
        props: new Map(),
      },
      {
        instanceSelector: ["first", "parent", "body"],
      },
      runtimeContext
    );

    expect(result.result).toEqual({
      instanceSelector: ["first", "body"],
    });
    expect(result.payload).toEqual([
      {
        namespace: "instances",
        patches: [
          { op: "remove", path: ["parent", "children", 0] },
          {
            op: "add",
            path: ["body", "children", 1],
            value: { type: "id", value: "first" },
          },
        ],
      },
    ]);
  });

  test("unwraps direct shared Slot child with siblings outside Slot", () => {
    const result = unwrapInstance(
      {
        instances: new Map([
          [
            "body",
            createInstance("body", "Body", [{ type: "id", value: "slot" }]),
          ],
          [
            "slot",
            createInstance("slot", "Slot", [{ type: "id", value: "fragment" }]),
          ],
          [
            "fragment",
            createInstance("fragment", "Fragment", [
              { type: "id", value: "selected" },
              { type: "id", value: "sibling" },
            ]),
          ],
          ["selected", createInstance("selected", "Box")],
          ["sibling", createInstance("sibling", "Box")],
        ]),
        props: new Map(),
      },
      {
        instanceSelector: ["selected", "fragment", "slot", "body"],
      },
      runtimeContext
    );

    expect(result.result).toEqual({
      instanceSelector: ["selected", "body"],
    });
    expect(result.payload).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["body"],
            value: createInstance("body", "Body", [
              { type: "id", value: "slot" },
              { type: "id", value: "selected" },
            ]),
          },
          {
            op: "replace",
            path: ["fragment"],
            value: createInstance("fragment", "Fragment", [
              { type: "id", value: "sibling" },
            ]),
          },
        ],
      },
    ]);
  });

  test("rejects unwrapping rich text content", () => {
    expect(() =>
      unwrapInstance(
        {
          instances: new Map([
            [
              "body",
              createInstance("body", "Body", [
                { type: "id", value: "paragraph" },
              ]),
            ],
            [
              "paragraph",
              createInstance("paragraph", "Paragraph", [
                { type: "id", value: "bold" },
              ]),
            ],
            ["bold", createInstance("bold", "Bold")],
          ]),
          props: new Map(),
        },
        {
          instanceSelector: ["bold", "paragraph", "body"],
        },
        runtimeContext
      )
    ).toThrow("Cannot unwrap textual instance");
  });
});

describe("fillGrid", () => {
  const createIds = (ids: string[]) => {
    let index = 0;
    return () => ids[index++] ?? `extra-${index}`;
  };

  test("fills missing grid cells with runtime-generated instances and styles", () => {
    const result = fillGrid(
      {
        instances: new Map([
          ["grid", createInstance("grid", [{ type: "id", value: "existing" }])],
        ]),
        props: new Map(),
        dataSources: new Map(),
        styleSources: new Map(),
        styleSourceSelections: new Map(),
        styles: new Map(),
      },
      {
        parentInstanceId: "grid",
        totalCells: 3,
        breakpointId: "base",
      },
      { createId: createIds(["cell-1", "style-1", "cell-2", "style-2"]) }
    );

    expect(result.result).toEqual({
      instanceIds: ["cell-1", "cell-2"],
      styleSourceIds: ["style-1", "style-2"],
    });
    expect(result.payload).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "add",
            path: ["cell-1"],
            value: createInstance("cell-1", "Box"),
          },
          {
            op: "add",
            path: ["grid", "children", 1],
            value: { type: "id", value: "cell-1" },
          },
          {
            op: "add",
            path: ["cell-2"],
            value: createInstance("cell-2", "Box"),
          },
          {
            op: "add",
            path: ["grid", "children", 2],
            value: { type: "id", value: "cell-2" },
          },
        ],
      },
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: ["style-1"],
            value: { type: "local", id: "style-1" },
          },
          {
            op: "add",
            path: ["style-2"],
            value: { type: "local", id: "style-2" },
          },
        ],
      },
      {
        namespace: "styleSourceSelections",
        patches: [
          {
            op: "add",
            path: ["cell-1"],
            value: { instanceId: "cell-1", values: ["style-1"] },
          },
          {
            op: "add",
            path: ["cell-2"],
            value: { instanceId: "cell-2", values: ["style-2"] },
          },
        ],
      },
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["style-1:base:display:"],
            value: {
              breakpointId: "base",
              styleSourceId: "style-1",
              property: "display",
              value: { type: "keyword", value: "flex" },
            },
          },
          {
            op: "add",
            path: ["style-1:base:flexDirection:"],
            value: {
              breakpointId: "base",
              styleSourceId: "style-1",
              property: "flexDirection",
              value: { type: "keyword", value: "column" },
            },
          },
          {
            op: "add",
            path: ["style-2:base:display:"],
            value: {
              breakpointId: "base",
              styleSourceId: "style-2",
              property: "display",
              value: { type: "keyword", value: "flex" },
            },
          },
          {
            op: "add",
            path: ["style-2:base:flexDirection:"],
            value: {
              breakpointId: "base",
              styleSourceId: "style-2",
              property: "flexDirection",
              value: { type: "keyword", value: "column" },
            },
          },
        ],
      },
    ]);
  });

  test("does nothing when grid already has enough child instances", () => {
    const result = fillGrid(
      {
        instances: new Map([
          [
            "grid",
            createInstance("grid", [
              { type: "id", value: "cell-1" },
              { type: "id", value: "cell-2" },
            ]),
          ],
        ]),
        props: new Map(),
        dataSources: new Map(),
        styleSources: new Map(),
        styleSourceSelections: new Map(),
        styles: new Map(),
      },
      {
        parentInstanceId: "grid",
        totalCells: 2,
        breakpointId: "base",
      },
      { createId: createIds(["unused"]) }
    );

    expect(result.noop).toEqual(true);
    expect(result.payload).toEqual([]);
  });
});

describe("setInstanceTag", () => {
  test("sets instance tag and deletes legacy tag prop", () => {
    const data = {
      instances: new Map([["box", createInstance("box", "Box")]]),
      props: new Map([
        [
          "tag-prop",
          {
            id: "tag-prop",
            instanceId: "box",
            name: "tag",
            type: "string" as const,
            value: "div",
          },
        ],
      ]),
    };
    const result = setInstanceTag(data, {
      instanceId: "box",
      tag: "section",
      legacyPropName: "tag",
    });

    expect(result.result).toEqual({
      instanceId: "box",
      tag: "section",
    });
    expect(result.payload).toEqual([
      {
        namespace: "props",
        patches: [{ op: "remove", path: ["tag-prop"] }],
      },
      {
        namespace: "instances",
        patches: [
          {
            op: "add",
            path: ["box", "tag"],
            value: "section",
          },
        ],
      },
    ]);
    applyBuilderPatchPayloadMutable(
      (namespace) => data[namespace as keyof typeof data],
      result.payload
    );
    expect(data.instances.get("box")?.tag).toBe("section");
    expect(data.props.has("tag-prop")).toBe(false);
  });

  test("does not mutate unchanged tag", () => {
    const instance = createInstance("box", "Box");
    instance.tag = "section";
    const result = setInstanceTag(
      {
        instances: new Map([["box", instance]]),
        props: new Map(),
      },
      {
        instanceId: "box",
        tag: "section",
      }
    );

    expect(result.noop).toEqual(true);
    expect(result.payload).toEqual([]);
  });
});

describe("setInstanceLabel", () => {
  test("trims and sets instance label", () => {
    const result = setInstanceLabel(
      {
        instances: new Map([["box", createInstance("box", "Box")]]),
      },
      {
        instanceId: "box",
        label: "  Hero card  ",
      }
    );

    expect(result.result).toEqual({
      instanceIds: ["box"],
      label: "Hero card",
    });
    expect(result.payload).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "add",
            path: ["box", "label"],
            value: "Hero card",
          },
        ],
      },
    ]);
  });

  test("mirrors label between slots with the same children signature", () => {
    const matchingSlot = createInstance("matching-slot", "Slot", [
      { type: "id", value: "child" },
    ]);
    matchingSlot.label = "Previous";
    const differentSlot = createInstance("different-slot", "Slot", [
      { type: "text", value: "Different" },
    ]);

    const result = setInstanceLabel(
      {
        instances: new Map([
          [
            "slot",
            createInstance("slot", "Slot", [{ type: "id", value: "child" }]),
          ],
          ["matching-slot", matchingSlot],
          ["different-slot", differentSlot],
        ]),
      },
      {
        instanceId: "slot",
        label: "Shared slot",
      }
    );

    expect(result.result).toEqual({
      instanceIds: ["slot", "matching-slot"],
      label: "Shared slot",
    });
    expect(result.payload).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "add",
            path: ["slot", "label"],
            value: "Shared slot",
          },
          {
            op: "replace",
            path: ["matching-slot", "label"],
            value: "Shared slot",
          },
        ],
      },
    ]);
  });

  test("does not mutate unchanged label", () => {
    const instance = createInstance("box", "Box");
    instance.label = "Hero card";
    const result = setInstanceLabel(
      {
        instances: new Map([["box", instance]]),
      },
      {
        instanceId: "box",
        label: "Hero card",
      }
    );

    expect(result.noop).toEqual(true);
    expect(result.payload).toEqual([]);
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

  expect(
    createInstanceMovePatches({
      instances,
      moves: [{ instanceId: "c", parentInstanceId: "parent", insertIndex: 1 }],
    }).patches
  ).toEqual([
    { op: "remove", path: ["parent", "children", 2] },
    {
      op: "add",
      path: ["parent", "children", 1],
      value: { type: "id", value: "c" },
    },
  ]);
});

test("appends batched same-parent moves in array order", () => {
  const instances = new Map([
    [
      "parent",
      createInstance("parent", elementComponent, [
        { type: "id", value: "x" },
        { type: "id", value: "b" },
        { type: "id", value: "a" },
      ]),
    ],
    ["x", createInstance("x", elementComponent)],
    ["a", createInstance("a", elementComponent)],
    ["b", createInstance("b", elementComponent)],
  ]);
  const payload = createInstanceMovePayload({
    instances,
    moves: [
      { instanceId: "a", parentInstanceId: "parent", position: "end" },
      { instanceId: "b", parentInstanceId: "parent", position: "end" },
    ],
  }).payload;
  applyBuilderPatchPayloadMutable((namespace) => {
    if (namespace === "instances") {
      return instances;
    }
    throw new Error(`Unexpected namespace: ${namespace}`);
  }, payload);

  expect(instances.get("parent")?.children).toEqual([
    { type: "id", value: "x" },
    { type: "id", value: "a" },
    { type: "id", value: "b" },
  ]);
});

test("applies batched cross-parent moves against the evolving tree", () => {
  const instances = new Map([
    [
      "source",
      createInstance("source", elementComponent, [
        { type: "id", value: "a" },
        { type: "id", value: "b" },
      ]),
    ],
    [
      "target",
      createInstance("target", elementComponent, [{ type: "id", value: "x" }]),
    ],
    ["x", createInstance("x", elementComponent)],
    ["a", createInstance("a", elementComponent)],
    ["b", createInstance("b", elementComponent)],
  ]);
  const payload = createInstanceMovePayload({
    instances,
    moves: [
      { instanceId: "a", parentInstanceId: "target", position: "end" },
      { instanceId: "b", parentInstanceId: "target", position: "end" },
    ],
  }).payload;
  applyBuilderPatchPayloadMutable((namespace) => {
    if (namespace === "instances") {
      return instances;
    }
    throw new Error(`Unexpected namespace: ${namespace}`);
  }, payload);

  expect(instances.get("source")?.children).toEqual([]);
  expect(instances.get("target")?.children).toEqual([
    { type: "id", value: "x" },
    { type: "id", value: "a" },
    { type: "id", value: "b" },
  ]);
});

test("rejects ambiguous move positions", () => {
  expect(
    moveInstancesInput.safeParse({
      moves: [
        {
          instanceId: "a",
          parentInstanceId: "parent",
          insertIndex: 1,
          position: "end",
        },
      ],
    }).success
  ).toBe(false);
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

test("move instances preserves structural move when there are no variables to rebind", () => {
  const data = {
    instances: new Map<Instance["id"], Instance>([
      [
        "body",
        createInstance("body", "Body", [
          { type: "id", value: "source" },
          { type: "id", value: "target" },
        ]),
      ],
      ["source", createInstance("source", elementComponent)],
      ["target", createInstance("target", elementComponent)],
    ]),
    props: new Map<Prop["id"], Prop>(),
    dataSources: new Map<DataSource["id"], DataSource>(),
    resources: new Map(),
  };

  const result = moveInstances(data, {
    moves: [{ instanceId: "source", parentInstanceId: "target" }],
  });

  applyBuilderPatchPayloadMutable(
    (namespace) => data[namespace as keyof typeof data],
    result.payload
  );

  expect(data.instances.get("body")?.children).toEqual([
    { type: "id", value: "target" },
  ]);
  expect(data.instances.get("target")?.children).toEqual([
    { type: "id", value: "source" },
  ]);
});

test("move instances rebinds expressions to variables in the new scope", () => {
  const bodyVariable: DataSource = {
    id: "body-variable",
    type: "variable",
    name: "item",
    scopeInstanceId: "body",
    value: { type: "string", value: "body item" },
  };
  const targetVariable: DataSource = {
    id: "target-variable",
    type: "variable",
    name: "item",
    scopeInstanceId: "target-parent",
    value: { type: "string", value: "target item" },
  };
  const data = {
    instances: new Map<Instance["id"], Instance>([
      [
        "body",
        createInstance("body", "Body", [
          { type: "id", value: "source-parent" },
          { type: "id", value: "target-parent" },
        ]),
      ],
      [
        "source-parent",
        createInstance("source-parent", elementComponent, [
          { type: "id", value: "text" },
        ]),
      ],
      ["target-parent", createInstance("target-parent", elementComponent)],
      [
        "text",
        createInstance("text", "Text", [
          { type: "expression", value: encodeDataVariableId(bodyVariable.id) },
        ]),
      ],
    ]),
    props: new Map<Prop["id"], Prop>(),
    dataSources: new Map<DataSource["id"], DataSource>([
      [bodyVariable.id, bodyVariable],
      [targetVariable.id, targetVariable],
    ]),
    resources: new Map(),
  };
  const result = moveInstances(data, {
    moves: [{ instanceId: "text", parentInstanceId: "target-parent" }],
  });

  applyBuilderPatchPayloadMutable(
    (namespace) => data[namespace as keyof typeof data],
    result.payload
  );

  expect(data.instances.get("source-parent")?.children).toEqual([]);
  expect(data.instances.get("target-parent")?.children).toEqual([
    { type: "id", value: "text" },
  ]);
  expect(data.instances.get("text")?.children).toEqual([
    { type: "expression", value: encodeDataVariableId(targetVariable.id) },
  ]);
});

test("updates text editing tree and removes stale descendants", () => {
  const data = {
    instances: new Map<Instance["id"], Instance>([
      [
        "root",
        createInstance("root", elementComponent, [
          { type: "id", value: "bold" },
          { type: "id", value: "old-link" },
        ]),
      ],
      [
        "bold",
        createInstance("bold", elementComponent, [
          { type: "text", value: "Old" },
        ]),
      ],
      [
        "old-link",
        createInstance("old-link", elementComponent, [
          { type: "text", value: "Remove me" },
        ]),
      ],
    ]),
  };
  const result = updateTextTree(
    data,
    {
      rootInstanceId: "root",
      instances: [
        createInstance("root", elementComponent, [
          { type: "text", value: "Hello " },
          { type: "id", value: "bold" },
          { type: "id", value: "temporary-italic" },
        ]),
        createInstance("bold", elementComponent, [
          { type: "text", value: "new" },
        ]),
        createInstance("temporary-italic", elementComponent, [
          { type: "text", value: "world" },
        ]),
      ],
    },
    { createId: () => "new-italic" }
  );

  applyBuilderPatchPayloadMutable(
    (namespace) => data[namespace as keyof typeof data],
    result.payload
  );

  expect(data.instances.get("root")?.children).toEqual([
    { type: "text", value: "Hello " },
    { type: "id", value: "bold" },
    { type: "id", value: "new-italic" },
  ]);
  expect(data.instances.get("bold")?.children).toEqual([
    { type: "text", value: "new" },
  ]);
  expect(data.instances.get("new-italic")?.children).toEqual([
    { type: "text", value: "world" },
  ]);
  expect(result.result.idMap).toEqual({
    "temporary-italic": "new-italic",
  });
  expect(data.instances.has("old-link")).toBe(false);
});

test("removes props from rich-text descendants removed by text editing", () => {
  const data = {
    instances: new Map<Instance["id"], Instance>([
      [
        "root",
        createInstance("root", elementComponent, [
          { type: "id", value: "link" },
        ]),
      ],
      [
        "link",
        createInstance("link", elementComponent, [
          { type: "text", value: "Read more" },
        ]),
      ],
    ]),
    props: new Map<Prop["id"], Prop>([
      [
        "link-href",
        {
          id: "link-href",
          instanceId: "link",
          name: "href",
          type: "string",
          value: "/read-more",
        },
      ],
    ]),
    dataSources: new Map<DataSource["id"], DataSource>(),
    styleSources: new Map<StyleSource["id"], StyleSource>(),
    styleSourceSelections: new Map<
      StyleSourceSelection["instanceId"],
      StyleSourceSelection
    >(),
    styles: new Map<string, StyleDecl>(),
  };
  const result = updateTextTree(
    data,
    {
      rootInstanceId: "root",
      instances: [
        createInstance("root", elementComponent, [
          { type: "text", value: "Read more" },
        ]),
      ],
    },
    runtimeContext
  );

  applyBuilderPatchPayloadMutable(
    (namespace) => data[namespace as keyof typeof data],
    result.payload
  );

  expect(data.instances.has("link")).toBe(false);
  expect(data.props.has("link-href")).toBe(false);
});

test("runtime remaps text editing temporary ids before persisting", () => {
  const data = {
    instances: new Map<Instance["id"], Instance>([
      [
        "root",
        createInstance("root", elementComponent, [
          { type: "id", value: "existing" },
        ]),
      ],
      ["existing", createInstance("existing", elementComponent)],
    ]),
  };
  const ids = ["runtime-1", "runtime-2"];

  const result = updateTextTree(
    data,
    {
      rootInstanceId: "root",
      instances: [
        createInstance("root", elementComponent, [
          { type: "id", value: "existing" },
          { type: "id", value: "client-1" },
        ]),
        createInstance("existing", elementComponent, [
          { type: "text", value: "Old id stays" },
        ]),
        createInstance("client-1", elementComponent, [
          { type: "id", value: "client-2" },
        ]),
        createInstance("client-2", elementComponent, [
          { type: "text", value: "New ids are runtime-owned" },
        ]),
      ],
    },
    { createId: () => ids.shift() ?? "extra-id" }
  );

  applyBuilderPatchPayloadMutable(
    (namespace) => data[namespace as keyof typeof data],
    result.payload
  );

  expect(result.result.idMap).toEqual({
    "client-1": "runtime-1",
    "client-2": "runtime-2",
  });
  expect(data.instances.has("client-1")).toBe(false);
  expect(data.instances.has("client-2")).toBe(false);
  expect(data.instances.get("root")?.children).toEqual([
    { type: "id", value: "existing" },
    { type: "id", value: "runtime-1" },
  ]);
  expect(data.instances.get("runtime-1")?.children).toEqual([
    { type: "id", value: "runtime-2" },
  ]);
});

test("rejects text editing tree ids colliding outside the edited tree", () => {
  const instances = new Map<Instance["id"], Instance>([
    ["root", createInstance("root", elementComponent)],
    ["outside", createInstance("outside", elementComponent)],
  ]);

  expect(
    createTextTreeUpdatePayload({
      instances,
      rootInstanceId: "root",
      updates: [
        createInstance("root", elementComponent, [
          { type: "id", value: "outside" },
        ]),
        createInstance("outside", elementComponent),
      ],
    }).errors
  ).toEqual([{ type: "id-collision", instanceId: "outside" }]);
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

test("preserves shared Slot content when deleting one copied Slot", () => {
  const instances = new Map([
    [
      "parent",
      createInstance("parent", elementComponent, [
        { type: "id", value: "slot" },
        { type: "id", value: "slot-copy" },
      ]),
    ],
    [
      "slot",
      createInstance("slot", "Slot", [
        { type: "id", value: "shared-fragment" },
      ]),
    ],
    [
      "slot-copy",
      createInstance("slot-copy", "Slot", [
        { type: "id", value: "shared-fragment" },
      ]),
    ],
    [
      "shared-fragment",
      createInstance("shared-fragment", elementComponent, [
        { type: "id", value: "content" },
      ]),
    ],
    ["content", createInstance("content", elementComponent)],
  ]);

  const result = createInstanceDeletePayload({
    instances,
    instanceIds: ["slot"],
    props: [],
    dataSources: [],
    styleSources: [],
    styleSourceSelections: [],
    styles: [],
  });

  expect(result.errors).toEqual([]);
  expect(result.instanceIds).toEqual(["slot"]);
  expect(result.payload).toEqual([
    {
      namespace: "instances",
      patches: [
        { op: "remove", path: ["parent", "children", 0] },
        { op: "remove", path: ["slot"] },
      ],
    },
  ]);
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
            path: ["parent", "children"],
            value: [{ type: "id", value: "created" }],
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

test("deletes instances with local style selection cleanup", () => {
  const styleDecl: StyleDecl = {
    styleSourceId: "card-a-style-source",
    breakpointId: "base",
    property: "color",
    value: { type: "keyword", value: "red" },
  };
  const result = deleteInstances(
    {
      pages: createDefaultPages({
        homePageId: "page-id",
        rootInstanceId: "body",
      }),
      instances: new Map([
        [
          "body",
          createInstance("body", "Body", [
            { type: "id", value: "card-a" },
            { type: "id", value: "card-b" },
          ]),
        ],
        [
          "card-a",
          createInstance("card-a", "Box", [
            { type: "id", value: "card-a-text" },
          ]),
        ],
        ["card-a-text", createInstance("card-a-text", "Text")],
        ["card-b", createInstance("card-b", "Box")],
      ]),
      props: new Map([
        [
          "card-a-prop",
          {
            id: "card-a-prop",
            instanceId: "card-a",
            name: "data-state",
            type: "string",
            value: "featured",
          },
        ],
      ]),
      dataSources: new Map([
        [
          "card-data-source",
          {
            id: "card-data-source",
            scopeInstanceId: "card-a",
            name: "cardData",
            type: "resource",
            resourceId: "card-resource",
          },
        ],
      ]),
      styleSources: new Map([
        ["card-a-style-source", { type: "local", id: "card-a-style-source" }],
      ]),
      styleSourceSelections: new Map([
        ["card-a", { instanceId: "card-a", values: ["card-a-style-source"] }],
      ]),
      styles: new Map([["card-a-style", styleDecl]]),
    },
    { instanceIds: ["card-a", "card-b"] }
  );

  expect(result.payload).toEqual(
    expect.arrayContaining([
      {
        namespace: "styleSourceSelections",
        patches: [{ op: "remove", path: ["card-a"] }],
      },
    ])
  );
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

test("lists instances in tree order", () => {
  const instances = new Map([
    ["child-b", createInstance("child-b", elementComponent)],
    [
      "root",
      createInstance("root", elementComponent, [
        { type: "id", value: "child-a" },
        { type: "id", value: "child-b" },
      ]),
    ],
    ["child-a", createInstance("child-a", elementComponent)],
    ["detached", createInstance("detached", elementComponent)],
  ]);

  expect(
    listInstances(
      { instances },
      {
        rootInstanceId: "root",
      }
    ).instances.map((instance) => instance.id)
  ).toEqual(["root", "child-a", "child-b"]);
});
