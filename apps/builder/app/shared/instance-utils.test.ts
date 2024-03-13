import { enableMapSet } from "immer";
import { describe, test, expect, beforeEach } from "@jest/globals";
import {
  encodeDataSourceVariable,
  portalComponent,
  collectionComponent,
  type WsComponentMeta,
} from "@webstudio-is/react-sdk";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import type {
  Asset,
  Breakpoint,
  DataSource,
  Instance,
  Instances,
  Prop,
  Resource,
  StyleDecl,
  StyleDeclKey,
  StyleSource,
  WebstudioData,
} from "@webstudio-is/sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  computeInstancesConstraints,
  findClosestDroppableComponentIndex,
  findClosestDroppableTarget,
  findClosestEditableInstanceSelector,
  insertTemplateData,
  type InsertConstraints,
  deleteInstanceMutable,
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
  reparentInstance,
  getWebstudioData,
  insertInstanceChildrenMutable,
} from "./instance-utils";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $styleSourceSelections,
  $styleSources,
  $styles,
  $registeredComponentMetas,
  $resources,
} from "./nano-states";
import { registerContainers } from "./sync";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";

enableMapSet();
registerContainers();

$pages.set(createDefaultPages({ rootInstanceId: "", systemDataSourceId: "" }));

const defaultMetasMap = new Map(Object.entries(defaultMetas));
$registeredComponentMetas.set(defaultMetasMap);

const createFakeComponentMetas = (
  itemMeta: Partial<WsComponentMeta>,
  anotherItemMeta?: Partial<WsComponentMeta>
): Map<string, WsComponentMeta> => {
  const base = {
    label: "",
    Icon: () => null,
  };
  const configs = {
    Item: { ...base, type: "container", ...itemMeta },
    AnotherItem: { ...base, type: "container", ...anotherItemMeta },
    Bold: { ...base, type: "rich-text-child" },
    Text: { ...base, type: "container" },
    Form: { ...base, type: "container" },
    Box: { ...base, type: "container" },
    Div: { ...base, type: "container" },
    Body: { ...base, type: "container" },
  } as const;
  return new Map(Object.entries(configs)) as Map<string, WsComponentMeta>;
};

const getIdValuePair = <T extends { id: string }>(item: T) =>
  [item.id, item] as const;

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map(getIdValuePair));

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

const createInstancePair = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): [Instance["id"], Instance] => {
  return [id, { type: "instance", id, component, children }];
};

const createStyleDecl = (
  styleSourceId: string,
  breakpointId: string,
  property: StyleProperty,
  value: StyleValue | string
): StyleDecl => ({
  styleSourceId,
  breakpointId,
  property,
  value: typeof value === "string" ? { type: "unparsed", value } : value,
});

const createStyleDeclPair = (
  styleSourceId: string,
  breakpointId: string,
  property: StyleProperty,
  value: StyleValue | string
): [StyleDeclKey, StyleDecl] => [
  `${styleSourceId}:${breakpointId}:${property}:`,
  createStyleDecl(styleSourceId, breakpointId, property, value),
];

const createProp = (instanceId: string, id: string, name: string): Prop => ({
  id,
  instanceId,
  name,
  type: "string",
  value: id,
});

const createImageAsset = (id: string, name = "", projectId = ""): Asset => {
  return {
    id,
    type: "image",
    format: "",
    name,
    description: "",
    projectId,
    createdAt: "",
    size: 0,
    meta: { width: 0, height: 0 },
  };
};

const createFontAsset = (id: string, family: string): Asset => {
  return {
    id,
    type: "font",
    format: "woff",
    name: "",
    description: "",
    projectId: "",
    createdAt: "",
    size: 0,
    meta: { style: "normal", family, variationAxes: {} },
  };
};

const emptyInsertConstraints: InsertConstraints = {
  requiredAncestors: new Set(),
  invalidAncestors: new Set(),
};

describe("find closest editable instance selector", () => {
  test("searches closest container", () => {
    const instances: Instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "box" }]),
      createInstance("box", "Box", [
        { type: "text", value: "some text" },
        { type: "id", value: "bold" },
      ]),
      createInstance("bold", "Bold", [{ type: "text", value: "some-bold" }]),
    ]);
    expect(
      findClosestEditableInstanceSelector(
        ["bold", "box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(["box", "body"]);
    expect(
      findClosestEditableInstanceSelector(
        ["box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(["box", "body"]);
  });

  test("skips when container has anything except rich-text-child or text", () => {
    const instances: Instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "box" }]),
      createInstance("box", "Box", [
        { type: "text", value: "some text" },
        { type: "id", value: "bold" },
        { type: "id", value: "child-box" },
      ]),
      createInstance("bold", "Bold", [{ type: "text", value: "some-bold" }]),
      createInstance("child-box", "Box", [
        { type: "text", value: "child-box" },
      ]),
    ]);
    expect(
      findClosestEditableInstanceSelector(
        ["bold", "box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(undefined);
  });

  test("considers empty container as editable", () => {
    const instances: Instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "body" }]),
      createInstance("box", "Box", []),
    ]);
    expect(
      findClosestEditableInstanceSelector(
        ["box", "body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(["box", "body"]);
  });

  test("prevent editing Body instance", () => {
    const instances: Instances = toMap([createInstance("body", "Body", [])]);
    expect(
      findClosestEditableInstanceSelector(
        ["body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(undefined);
  });
});

describe("compute instances constraints", () => {
  const base = {
    type: "container",
    label: "",
    icon: "",
  } as const;

  test("combine required ancestors excluding already resolved ones", () => {
    const metas = new Map<string, WsComponentMeta>([
      ["Button", { ...base, requiredAncestors: ["Form"] }],
      ["Checkbox", { ...base, requiredAncestors: ["Form", "Label"] }],
      ["Label", { ...base, requiredAncestors: ["Body"] }],
    ]);
    // button
    // label
    //   checkbox
    const instances = new Map<Instance["id"], Instance>([
      createInstancePair("button", "Button", []),
      createInstancePair("label", "Label", [{ type: "id", value: "checkbox" }]),
      createInstancePair("checkbox", "Checkbox", []),
    ]);
    expect(
      computeInstancesConstraints(metas, instances, ["button", "label"])
    ).toEqual({
      requiredAncestors: new Set(["Body", "Form"]),
      invalidAncestors: new Set(),
    });
  });

  test("combine invalid ancestors of all instances", () => {
    const metas = new Map<string, WsComponentMeta>([
      ["Button", { ...base, invalidAncestors: ["Button"] }],
      ["Form", { ...base, invalidAncestors: ["Button", "Form"] }],
    ]);
    // form
    //   button
    const instances = new Map<Instance["id"], Instance>([
      createInstancePair("form", "Form", [{ type: "id", value: "button" }]),
      createInstancePair("button", "Button", []),
    ]);
    expect(computeInstancesConstraints(metas, instances, ["form"])).toEqual({
      requiredAncestors: new Set(),
      invalidAncestors: new Set(["Button", "Form"]),
    });
  });
});

describe("find closest droppable component index", () => {
  test("finds container", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({}),
        ["Box", "Body"],
        emptyInsertConstraints
      )
    ).toEqual(0);
  });

  test("skips non containers", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({}),
        ["Bold", "Italic", "Text", "Box", "Body"],
        emptyInsertConstraints
      )
    ).toEqual(2);
  });

  test("considers invalid ancestors", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({}),
        ["Box", "Item", "Body"],
        {
          requiredAncestors: new Set(),
          invalidAncestors: new Set(["Item"]),
        }
      )
    ).toEqual(2);
  });

  test("requires some ancestor", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({}),
        ["Box", "Body"],
        {
          requiredAncestors: new Set(["Form"]),
          invalidAncestors: new Set(),
        }
      )
    ).toEqual(-1);
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({}),
        ["Box", "Form", "Body"],
        {
          requiredAncestors: new Set(["Form"]),
          invalidAncestors: new Set(),
        }
      )
    ).toEqual(0);
  });

  test("considers both required and invalid ancestors", () => {
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({}),
        ["Div", "Box", "Form", "Body"],
        {
          requiredAncestors: new Set(["Form"]),
          invalidAncestors: new Set(["Box"]),
        }
      )
    ).toEqual(2);
    expect(
      findClosestDroppableComponentIndex(
        createFakeComponentMetas({}),
        ["Div", "Form", "Box", "Body"],
        {
          requiredAncestors: new Set(["Form"]),
          invalidAncestors: new Set(["Box"]),
        }
      )
    ).toEqual(-1);
  });
});

describe("find closest droppable target", () => {
  const createInstancePair = (
    id: Instance["id"],
    component: string,
    children: Instance["children"]
  ): [Instance["id"], Instance] => {
    return [id, { type: "instance", id, component, children }];
  };

  test("puts in the end if closest instance is container", () => {
    const instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [{ type: "id", value: "paragraph" }]),
      createInstancePair("paragraph", "Paragraph", [
        { type: "id", value: "bold" },
      ]),
    ]);
    expect(
      findClosestDroppableTarget(
        defaultMetasMap,
        instances,
        ["box", "body"],
        emptyInsertConstraints
      )
    ).toEqual({
      parentSelector: ["box", "body"],
      position: "end",
    });
  });

  test("puts in the end of root instance", () => {
    const instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [{ type: "id", value: "paragraph" }]),
    ]);
    expect(
      findClosestDroppableTarget(
        defaultMetasMap,
        instances,
        ["body"],
        emptyInsertConstraints
      )
    ).toEqual({
      parentSelector: ["body"],
      position: "end",
    });
  });

  test("finds closest container and puts after its child within selection", () => {
    const instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "paragraph" }]),
      createInstancePair("paragraph", "Paragraph", [
        { type: "id", value: "bold" },
      ]),
      createInstancePair("bold", "Bold", []),
    ]);
    expect(
      findClosestDroppableTarget(
        defaultMetasMap,
        instances,
        ["bold", "paragraph", "body"],
        emptyInsertConstraints
      )
    ).toEqual({
      parentSelector: ["paragraph", "body"],
      position: 1,
    });
  });
});

describe("insert instance children", () => {
  test("insert instance children into empty target", () => {
    const instances = toMap([createInstance("body", "Body", [])]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["body"],
      position: "end",
    });
    expect(data.instances).toEqual(
      toMap([createInstance("body", "Body", [{ type: "id", value: "box" }])])
    );
  });

  test("insert instance children into the end of target", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "text" }]),
    ]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["body"],
      position: "end",
    });
    expect(data.instances).toEqual(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "text" },
          { type: "id", value: "box" },
        ]),
      ])
    );
  });

  test("insert instance children into the start of target", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "text" }]),
    ]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["body"],
      position: 0,
    });
    expect(data.instances).toEqual(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "box" },
          { type: "id", value: "text" },
        ]),
      ])
    );
  });

  test("insert instance children at the start of text", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "text" }]),
      createInstance("text", "Text", [{ type: "text", value: "text" }]),
    ]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["text", "body"],
      position: 0,
    });
    const [_bodyId, _textId, spanId] = data.instances.keys();
    expect(data.instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "text" }]),
        createInstance("text", "Text", [
          { type: "id", value: "box" },
          { type: "id", value: spanId },
        ]),
        createInstance(spanId, "Text", [{ type: "text", value: "text" }]),
      ])
    );
    expect(data.props).toEqual(
      toMap<Prop>([
        {
          id: expect.any(String) as unknown as string,
          instanceId: spanId,
          name: "tag",
          type: "string",
          value: "span",
        },
      ])
    );
  });

  test("insert instance children at the end of text", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "text" }]),
      createInstance("text", "Text", [{ type: "text", value: "text" }]),
    ]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["text", "body"],
      position: "end",
    });
    const [_bodyId, _textId, spanId] = data.instances.keys();
    expect(data.instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "text" }]),
        createInstance("text", "Text", [
          { type: "id", value: spanId },
          { type: "id", value: "box" },
        ]),
        createInstance(spanId, "Text", [{ type: "text", value: "text" }]),
      ])
    );
    expect(data.props).toEqual(
      toMap<Prop>([
        {
          id: expect.any(String) as unknown as string,
          instanceId: spanId,
          name: "tag",
          type: "string",
          value: "span",
        },
      ])
    );
  });

  test("insert instance children between text children", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "text" }]),
      createInstance("text", "Text", [
        { type: "id", value: "bold" },
        { type: "text", value: "text" },
        { type: "id", value: "italic" },
      ]),
      createInstance("bold", "Bold", [{ type: "text", value: "bold" }]),
      createInstance("italic", "Italic", [{ type: "text", value: "italic" }]),
    ]);
    const data = getWebstudioDataStub({ instances });
    insertInstanceChildrenMutable(data, [{ type: "id", value: "box" }], {
      parentSelector: ["text", "body"],
      position: 1,
    });
    const [_bodyId, _textId, _boldId, _italicId, leftSpanId, rightSpanId] =
      data.instances.keys();
    expect(data.instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "text" }]),
        createInstance("text", "Text", [
          { type: "id", value: leftSpanId },
          { type: "id", value: "box" },
          { type: "id", value: rightSpanId },
        ]),
        createInstance("bold", "Bold", [{ type: "text", value: "bold" }]),
        createInstance("italic", "Italic", [{ type: "text", value: "italic" }]),
        createInstance(leftSpanId, "Text", [{ type: "id", value: "bold" }]),
        createInstance(rightSpanId, "Text", [
          { type: "text", value: "text" },
          { type: "id", value: "italic" },
        ]),
      ])
    );
    expect(data.props).toEqual(
      toMap<Prop>([
        {
          id: expect.any(String) as unknown as string,
          instanceId: leftSpanId,
          name: "tag",
          type: "string",
          value: "span",
        },
        {
          id: expect.any(String) as unknown as string,
          instanceId: rightSpanId,
          name: "tag",
          type: "string",
          value: "span",
        },
      ])
    );
  });
});

test("insert template data with instances", () => {
  $instances.set(toMap([createInstance("body", "Body", [])]));
  $styleSourceSelections.set(new Map());
  $styleSources.set(toMap([{ type: "token", id: "1", name: "Zero" }]));
  $styles.set(
    new Map([
      [
        "1:base:color:",
        {
          breakpointId: "base",
          styleSourceId: "1",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    ])
  );
  insertTemplateData(
    {
      children: [{ type: "id", value: "box" }],
      instances: [createInstance("box", "Box", [])],
      props: [],
      dataSources: [],
      styleSourceSelections: [],
      styleSources: [],
      styles: [],
      assets: [],
      resources: [],
      breakpoints: [],
    },
    { parentSelector: ["body"], position: "end" }
  );
  expect($instances.get()).toEqual(
    toMap<Instance>([
      createInstance("body", "Body", [{ type: "id", value: "box" }]),
      createInstance("box", "Box", []),
    ])
  );
});

test("insert template data with only new style sources", () => {
  $instances.set(new Map([createInstancePair("body", "Body", [])]));
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map([["1", { type: "token", id: "1", name: "Zero" }]]));
  $styles.set(
    new Map([
      [
        "1:base:color:",
        {
          breakpointId: "base",
          styleSourceId: "1",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    ])
  );
  insertTemplateData(
    {
      children: [{ type: "id", value: "box1" }],
      instances: [
        { type: "instance", id: "box1", component: "Box", children: [] },
      ],
      props: [],
      dataSources: [],
      styleSourceSelections: [{ instanceId: "box1", values: ["1", "2"] }],
      styleSources: [
        { type: "token", id: "1", name: "One" },
        { type: "token", id: "2", name: "Two" },
      ],
      styles: [
        {
          breakpointId: "base",
          styleSourceId: "1",
          property: "color",
          value: { type: "keyword", value: "black" },
        },
        {
          breakpointId: "base",
          styleSourceId: "1",
          property: "backgroundColor",
          value: { type: "keyword", value: "purple" },
        },
        {
          breakpointId: "base",
          styleSourceId: "2",
          property: "color",
          value: { type: "keyword", value: "green" },
        },
      ],
      assets: [],
      resources: [],
      breakpoints: [],
    },
    { parentSelector: ["body"], position: "end" }
  );
  expect($styleSourceSelections.get()).toEqual(
    new Map([["box1", { instanceId: "box1", values: ["1", "2"] }]])
  );
  expect($styleSources.get()).toEqual(
    new Map([
      ["1", { type: "token", id: "1", name: "Zero" }],
      ["2", { type: "token", id: "2", name: "Two" }],
    ])
  );
  expect($styles.get()).toEqual(
    new Map([
      [
        "1:base:color:",
        {
          breakpointId: "base",
          styleSourceId: "1",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
      [
        "2:base:color:",
        {
          breakpointId: "base",
          styleSourceId: "2",
          property: "color",
          value: { type: "keyword", value: "green" },
        },
      ],
    ])
  );
});

describe("reparent instance", () => {
  test("between instances", () => {
    // body
    //   box
    //     text
    //   button
    $instances.set(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "box" },
          { type: "id", value: "button" },
        ]),
        createInstance("box", "Box", [{ type: "id", value: "text" }]),
        createInstance("button", "Button", []),
        createInstance("text", "Text", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["text", "box", "body"], {
      parentSelector: ["body"],
      position: 1,
    });
    const instances = $instances.get();
    const newTextId = instances.get("body")?.children[1].value as string;
    // body
    //   box
    //   text
    //   button
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "box" },
          { type: "id", value: newTextId },
          { type: "id", value: "button" },
        ]),
        createInstance("box", "Box", []),
        createInstance("button", "Button", []),
        createInstance(newTextId, "Text", []),
      ])
    );
  });

  test("to the end", () => {
    // body
    //   box
    //     text
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", [{ type: "id", value: "text" }]),
        createInstance("text", "Text", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["text", "box", "body"], {
      parentSelector: ["body"],
      position: "end",
    });
    const instances = $instances.get();
    const newTextId = instances.get("body")?.children[1].value as string;
    // body
    //   box
    //   text
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "box" },
          { type: "id", value: newTextId },
        ]),
        createInstance("box", "Box", []),
        createInstance(newTextId, "Text", []),
      ])
    );
  });

  test("wrap with fragment when reparent into empty portal", () => {
    // body
    //   portal
    //   box
    $instances.set(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "portal" },
          { type: "id", value: "box" },
        ]),
        createInstance("portal", portalComponent, []),
        createInstance("box", "Box", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["box", "body"], {
      parentSelector: ["portal", "body"],
      position: "end",
    });
    const instances = $instances.get();
    const newFragmentId = instances.get("portal")?.children[0].value as string;
    const newBoxId = instances.get(newFragmentId)?.children[0].value as string;
    // body
    //   portal
    //     fragment
    //       box
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "portal" }]),
        createInstance("portal", portalComponent, [
          { type: "id", value: newFragmentId },
        ]),
        createInstance(newFragmentId, "Fragment", [
          { type: "id", value: newBoxId },
        ]),
        createInstance(newBoxId, "Box", []),
      ])
    );
  });

  test("reuse existing fragment when reparent into portal", () => {
    // body
    //   portal
    //     fragment
    //   box
    $instances.set(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "portal" },
          { type: "id", value: "box" },
        ]),
        createInstance("portal", portalComponent, [
          { type: "id", value: "fragment" },
        ]),
        createInstance("fragment", "Fragment", []),
        createInstance("box", "Box", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["box", "body"], {
      parentSelector: ["portal", "body"],
      position: "end",
    });
    const instances = $instances.get();
    const newBoxId = instances.get("fragment")?.children[0].value as string;
    // body
    //   portal
    //     fragment
    //       box
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "portal" }]),
        createInstance("portal", portalComponent, [
          { type: "id", value: "fragment" },
        ]),
        createInstance("fragment", "Fragment", [
          { type: "id", value: newBoxId },
        ]),
        createInstance(newBoxId, "Box", []),
      ])
    );
  });

  test("prevent portal reparenting into own children to avoid infinite loop", () => {
    // body
    //   portal
    //     fragment
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "portal" }]),
        createInstance("portal", portalComponent, [
          { type: "id", value: "fragment" },
        ]),
        createInstance("fragment", "Fragment", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["portal", "body"], {
      parentSelector: ["fragment", "portal", "body"],
      position: "end",
    });
    const instances = $instances.get();
    // body
    //   portal
    //     fragment
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "portal" }]),
        createInstance("portal", portalComponent, [
          { type: "id", value: "fragment" },
        ]),
        createInstance("fragment", "Fragment", []),
      ])
    );
  });

  test("from collection item", () => {
    // body
    //   list
    //     box
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "list" }]),
        createInstance("list", collectionComponent, [
          { type: "id", value: "box" },
        ]),
        createInstance("box", "Box", []),
      ])
    );
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    reparentInstance(["box", "list[0]", "list", "body"], {
      parentSelector: ["body"],
      position: "end",
    });
    const instances = $instances.get();
    const newBoxId = instances.get("body")?.children[1].value as string;
    // body
    //   list
    //   box
    expect(instances).toEqual(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "list" },
          { type: "id", value: newBoxId },
        ]),
        createInstance("list", collectionComponent, []),
        createInstance(newBoxId, "Box", []),
      ])
    );
  });
});

const getWebstudioDataStub = (
  data?: Partial<WebstudioData>
): WebstudioData => ({
  pages: createDefaultPages({ rootInstanceId: "", systemDataSourceId: "" }),
  assets: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  instances: new Map(),
  props: new Map(),
  breakpoints: new Map(),
  styleSourceSelections: new Map(),
  styleSources: new Map(),
  styles: new Map(),
  ...data,
});

describe("delete instance", () => {
  test("delete instance with its children", () => {
    // body
    //   box1
    //     box11
    //   box2
    const instances = new Map([
      createInstancePair("body", "Body", [
        { type: "id", value: "box1" },
        { type: "id", value: "box2" },
      ]),
      createInstancePair("box1", "Box", [{ type: "id", value: "box11" }]),
      createInstancePair("box11", "Box", []),
      createInstancePair("box2", "Box", []),
    ]);
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    const data = getWebstudioDataStub({ instances });
    deleteInstanceMutable(data, ["box1", "body"]);
    expect(data.instances).toEqual(
      new Map([
        createInstancePair("body", "Body", [{ type: "id", value: "box2" }]),
        createInstancePair("box2", "Box", []),
      ])
    );
  });

  test("prevent deleting root instance", () => {
    // body
    //   box1
    const instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box1" }]),
      createInstancePair("box1", "Box", []),
    ]);
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    const data = getWebstudioDataStub({ instances });
    deleteInstanceMutable(data, ["body"]);
    expect(data.instances).toEqual(
      new Map([
        createInstancePair("body", "Body", [{ type: "id", value: "box1" }]),
        createInstancePair("box1", "Box", []),
      ])
    );
  });

  test("delete instance from collection item", () => {
    // body
    //   list
    //     box
    const instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "list" }]),
      createInstancePair("list", collectionComponent, [
        { type: "id", value: "box" },
      ]),
      createInstancePair("box", "Box", []),
    ]);
    $registeredComponentMetas.set(createFakeComponentMetas({}));
    const data = getWebstudioDataStub({ instances });
    deleteInstanceMutable(data, ["box", "list[0]", "list", "body"]);
    expect(data.instances).toEqual(
      new Map([
        createInstancePair("body", "Body", [{ type: "id", value: "list" }]),
        createInstancePair("list", collectionComponent, []),
      ])
    );
  });

  test("delete resource along with variable", () => {
    const instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "box" }]),
      createInstance("box", "Box", []),
    ]);
    const resources = toMap<Resource>([
      {
        id: "resourceId",
        name: "My Resource",
        url: `""`,
        method: "get",
        headers: [],
      },
    ]);
    const dataSources = toMap<DataSource>([
      {
        id: "resourceVariableId",
        scopeInstanceId: "box",
        name: "My Resource Variable",
        type: "resource",
        resourceId: "resourceId",
      },
    ]);
    $registeredComponentMetas.set(createFakeComponentMetas({}));

    const data = getWebstudioDataStub({ instances, resources, dataSources });
    deleteInstanceMutable(data, ["box", "body"]);

    expect(data.instances).toEqual(toMap([createInstance("body", "Body", [])]));
    expect(data.dataSources).toEqual(new Map());
    expect(data.resources).toEqual(new Map());
  });
});

describe("extract webstudio fragment", () => {
  test("collect the instance by id and all its descendants including portal instances", () => {
    // body
    //   bodyChild1
    //     slot
    //       slotChild
    //   bodyChild2
    $instances.set(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "bodyChild1" },
          { type: "id", value: "bodyChild2" },
        ]),
        createInstance("bodyChild1", "Box", [{ type: "id", value: "slot" }]),
        createInstance("slot", "Slot", [{ type: "id", value: "slotChild" }]),
        createInstance("slotChild", "Box", []),
        createInstance("bodyChild2", "Box", []),
      ])
    );
    const { instances } = extractWebstudioFragment(
      getWebstudioData(),
      "bodyChild1"
    );

    expect(instances).toEqual([
      createInstance("bodyChild1", "Box", [{ type: "id", value: "slot" }]),
      createInstance("slot", "Slot", [{ type: "id", value: "slotChild" }]),
      createInstance("slotChild", "Box", []),
    ]);
  });

  test("collect all styles and breakpoints bound to fragment instances", () => {
    // body
    //   box1
    //     box2
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    $styleSourceSelections.set(
      new Map([
        ["body", { instanceId: "box1", values: ["localBody", "token1"] }],
        ["box1", { instanceId: "box1", values: ["localBox1", "token2"] }],
        ["box2", { instanceId: "box2", values: ["localBox2", "token2"] }],
      ])
    );
    $styleSources.set(
      new Map([
        ["localBody", { id: "localBody", type: "local" }],
        ["localBox1", { id: "localBox1", type: "local" }],
        ["localBox2", { id: "localBox2", type: "local" }],
        ["token1", { id: "token1", type: "token", name: "token1" }],
        ["token2", { id: "token2", type: "token", name: "token2" }],
      ])
    );
    $styles.set(
      new Map([
        createStyleDeclPair("localBody1", "base", "color", "red"),
        createStyleDeclPair("localBox1", "base", "color", "green"),
        createStyleDeclPair("localBox2", "base", "color", "blue"),
        createStyleDeclPair("token1", "base", "color", "yellow"),
        createStyleDeclPair("token2", "base", "color", "orange"),
      ])
    );
    $breakpoints.set(
      new Map([
        ["base", { id: "base", label: "base" }],
        ["big", { id: "big", label: "big", minWidth: 768 }],
      ])
    );
    const { styleSources, styleSourceSelections, styles, breakpoints } =
      extractWebstudioFragment(getWebstudioData(), "box1");

    // exclude localBody and token1 bound to body
    expect(styleSources).toEqual([
      { id: "localBox1", type: "local" },
      { id: "token2", type: "token", name: "token2" },
      { id: "localBox2", type: "local" },
    ]);
    expect(styleSourceSelections).toEqual([
      { instanceId: "box1", values: ["localBox1", "token2"] },
      { instanceId: "box2", values: ["localBox2", "token2"] },
    ]);
    expect(styles).toEqual([
      createStyleDecl("localBox1", "base", "color", "green"),
      createStyleDecl("localBox2", "base", "color", "blue"),
      createStyleDecl("token2", "base", "color", "orange"),
    ]);
    expect(breakpoints).toEqual([{ id: "base", label: "base" }]);
  });

  test("collect all props bound to fragment instances", () => {
    // body
    //   box1
    //     box2
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    $props.set(
      toMap([
        createProp("body", "bodyProp", "data-body"),
        createProp("box1", "box1Prop", "data-box1"),
        createProp("box2", "box2Prop", "data-box2"),
      ])
    );
    const { props } = extractWebstudioFragment(getWebstudioData(), "box1");

    expect(props).toEqual([
      createProp("box1", "box1Prop", "data-box1"),
      createProp("box2", "box2Prop", "data-box2"),
    ]);
  });

  test("collect assets from props and styles withiin fragment instances", () => {
    // body
    //   box1
    //     box2
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    $props.set(
      new Map([
        [
          "bodyProp",
          {
            id: "bodyProp",
            instanceId: "body",
            name: "data-body",
            type: "asset",
            value: "asset1",
          },
        ],
        [
          "box1Prop",
          {
            id: "box1Prop",
            instanceId: "box1",
            name: "data-box1",
            type: "asset",
            value: "asset2",
          },
        ],
      ])
    );
    $styleSourceSelections.set(
      new Map([
        ["body", { instanceId: "box1", values: ["localBody"] }],
        ["box1", { instanceId: "box1", values: ["localBox1"] }],
      ])
    );
    $styleSources.set(
      new Map([
        ["localBody", { id: "localBody", type: "local" }],
        ["localBox1", { id: "localBox1", type: "local" }],
      ])
    );
    $styles.set(
      new Map([
        createStyleDeclPair("localBody1", "base", "fontFamily", {
          type: "fontFamily",
          value: ["font1"],
        }),
        createStyleDeclPair("localBody1", "base", "backgroundImage", {
          type: "image",
          value: { type: "asset", value: "asset3" },
        }),
        createStyleDeclPair("localBox1", "base", "fontFamily", {
          type: "fontFamily",
          value: ["font2"],
        }),
        createStyleDeclPair("localBox1", "base", "color", {
          type: "image",
          value: { type: "asset", value: "asset4" },
        }),
      ])
    );
    $breakpoints.set(new Map([["base", { id: "base", label: "base" }]]));
    $assets.set(
      toMap([
        createImageAsset("asset1"),
        createImageAsset("asset2"),
        createImageAsset("asset3"),
        createImageAsset("asset4"),
        createFontAsset("asset5", "font1"),
        createFontAsset("asset6", "font2"),
      ])
    );
    const { assets } = extractWebstudioFragment(getWebstudioData(), "box1");

    expect(assets).toEqual([
      createImageAsset("asset2"),
      createImageAsset("asset4"),
      createFontAsset("asset6", "font2"),
    ]);
  });

  test("collect data sources used in expression props within instances", () => {
    // body
    //   box1
    //     box2
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    $dataSources.set(
      toMap([
        {
          id: "box1$state",
          scopeInstanceId: "box1",
          type: "variable",
          name: "state",
          value: { type: "string", value: "initial" },
        },
      ])
    );
    $props.set(
      toMap([
        {
          id: "box1$stateProp",
          instanceId: "box1",
          name: "state",
          type: "expression",
          value: "$ws$dataSource$box1$state",
        },
        {
          id: "box2$stateProp",
          instanceId: "box2",
          name: "state",
          type: "expression",
          value: "$ws$dataSource$box1$state",
        },
        {
          id: "box2$showProp",
          instanceId: "box2",
          name: "show",
          type: "expression",
          value: `$ws$dataSource$box1$state === 'initial'`,
        },
        {
          id: "box2$trueProp",
          instanceId: "box2",
          name: "bool-prop",
          type: "expression",
          value: `true`,
        },
      ])
    );
    const { props, dataSources } = extractWebstudioFragment(
      getWebstudioData(),
      "box2"
    );

    expect(dataSources).toEqual([
      {
        id: "box1$state",
        scopeInstanceId: "box1",
        type: "variable",
        name: "state",
        value: { type: "string", value: "initial" },
      },
    ]);
    expect(props).toEqual([
      {
        id: "box2$stateProp",
        instanceId: "box2",
        name: "state",
        type: "expression",
        value: "$ws$dataSource$box1$state",
      },
      {
        id: "box2$showProp",
        instanceId: "box2",
        name: "show",
        type: "expression",
        value: `$ws$dataSource$box1$state === 'initial'`,
      },
      {
        id: "box2$trueProp",
        instanceId: "box2",
        name: "bool-prop",
        type: "expression",
        value: `true`,
      },
    ]);
  });

  test("collect data sources used in actions within instances", () => {
    // body
    //   box1
    //     box2
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    $dataSources.set(
      toMap([
        {
          id: "box1$state",
          scopeInstanceId: "box1",
          type: "variable",
          name: "state",
          value: { type: "string", value: "initial" },
        },
        {
          id: "box2$state",
          scopeInstanceId: "box2",
          type: "variable",
          name: "state",
          value: { type: "string", value: "initial" },
        },
      ])
    );
    $props.set(
      toMap([
        {
          id: "box2$onChange1",
          instanceId: "box2",
          type: "action",
          name: "onChange",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: `$ws$dataSource$box1$state = value`,
            },
          ],
        },
        {
          id: "box2$onChange2",
          instanceId: "box2",
          type: "action",
          name: "onChange",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: `$ws$dataSource$box2$state = value`,
            },
          ],
        },
      ])
    );
    const { props, dataSources } = extractWebstudioFragment(
      getWebstudioData(),
      "box2"
    );

    expect(dataSources).toEqual([
      {
        id: "box1$state",
        scopeInstanceId: "box1",
        type: "variable",
        name: "state",
        value: { type: "string", value: "initial" },
      },
      {
        id: "box2$state",
        scopeInstanceId: "box2",
        type: "variable",
        name: "state",
        value: { type: "string", value: "initial" },
      },
    ]);
    expect(props).toEqual([
      {
        id: "box2$onChange1",
        instanceId: "box2",
        type: "action",
        name: "onChange",
        value: [
          {
            args: ["value"],
            code: "$ws$dataSource$box1$state = value",
            type: "execute",
          },
        ],
      },
      {
        id: "box2$onChange2",
        instanceId: "box2",
        type: "action",
        name: "onChange",
        value: [
          {
            type: "execute",
            args: ["value"],
            code: `$ws$dataSource$box2$state = value`,
          },
        ],
      },
    ]);
  });

  test("collect data sources used in expression children within instances", () => {
    // body
    //   box
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", [
          {
            type: "expression",
            value: "$ws$dataSource$body + $ws$dataSource$box",
          },
        ]),
      ])
    );
    $dataSources.set(
      toMap([
        {
          id: "body",
          scopeInstanceId: "body",
          type: "variable",
          name: "body",
          value: { type: "string", value: "body" },
        },
        {
          id: "bodyUnused",
          scopeInstanceId: "body",
          type: "variable",
          name: "bodyUnused",
          value: { type: "string", value: "bodyUnused" },
        },
        {
          id: "box",
          scopeInstanceId: "box",
          type: "variable",
          name: "box",
          value: { type: "string", value: "box" },
        },
      ])
    );
    const { dataSources } = extractWebstudioFragment(getWebstudioData(), "box");

    expect(dataSources).toEqual([
      {
        id: "body",
        scopeInstanceId: "body",
        type: "variable",
        name: "body",
        value: { type: "string", value: "body" },
      },
      {
        id: "box",
        scopeInstanceId: "box",
        type: "variable",
        name: "box",
        value: { type: "string", value: "box" },
      },
    ]);
  });

  test("collect resources within instances", () => {
    // body
    //   box1
    //   box2
    $instances.set(
      toMap([
        createInstance("body", "Body", [
          { type: "id", value: "box1" },
          { type: "id", value: "box2" },
        ]),
        createInstance("box1", "Box", []),
        createInstance("box2", "Box", []),
      ])
    );
    $resources.set(
      toMap([
        {
          id: "resource1",
          name: "resource1",
          url: `""`,
          method: "get",
          headers: [],
        },
        {
          id: "resource2",
          name: "resource2",
          url: `""`,
          method: "get",
          headers: [],
        },
        {
          id: "resource3",
          name: "resource3",
          url: `""`,
          method: "get",
          headers: [],
        },
      ])
    );
    $dataSources.set(
      toMap([
        {
          id: "body$state",
          scopeInstanceId: "box1",
          name: "data1",
          type: "resource",
          resourceId: "resource1",
        },
        {
          id: "box1$state",
          scopeInstanceId: "box1",
          name: "data2",
          type: "resource",
          resourceId: "resource2",
        },
        {
          id: "box2$state",
          scopeInstanceId: "box2",
          type: "resource",
          name: "data3",
          resourceId: "resource3",
        },
      ])
    );
    const { resources, dataSources } = extractWebstudioFragment(
      getWebstudioData(),
      "box1"
    );

    expect(resources).toEqual([
      {
        id: "resource1",
        name: "resource1",
        url: `""`,
        method: "get",
        headers: [],
      },
      {
        id: "resource2",
        name: "resource2",
        url: `""`,
        method: "get",
        headers: [],
      },
    ]);
    expect(dataSources).toEqual([
      {
        id: "body$state",
        scopeInstanceId: "box1",
        name: "data1",
        type: "resource",
        resourceId: "resource1",
      },
      {
        id: "box1$state",
        scopeInstanceId: "box1",
        name: "data2",
        type: "resource",
        resourceId: "resource2",
      },
    ]);
  });

  test("collect data sources used in resources", () => {
    // body
    //   box
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ])
    );
    $resources.set(
      toMap([
        {
          id: "resourceId",
          name: "resourceName",
          url: `$ws$dataSource$bodyUrl`,
          method: "post",
          headers: [
            {
              name: "Authorization",
              value: `"Token " + $ws$dataSource$bodyToken`,
            },
          ],
          body: `$ws$dataSource$boxBody`,
        },
      ])
    );
    $dataSources.set(
      toMap([
        {
          id: "boxData",
          scopeInstanceId: "box",
          name: "data",
          type: "resource",
          resourceId: "resourceId",
        },
        {
          id: "boxBody",
          scopeInstanceId: "box",
          name: "token",
          type: "variable",
          value: { type: "string", value: "body" },
        },
        {
          id: "bodyUrl",
          scopeInstanceId: "body",
          name: "url",
          type: "variable",
          value: { type: "string", value: "url" },
        },
        {
          id: "bodyToken",
          scopeInstanceId: "body",
          name: "token",
          type: "variable",
          value: { type: "string", value: "token" },
        },
        {
          id: "bodyAnotherUrl",
          scopeInstanceId: "body",
          name: "anotherUrl",
          type: "variable",
          value: { type: "string", value: "anotherUrl" },
        },
      ])
    );
    const { resources, dataSources } = extractWebstudioFragment(
      getWebstudioData(),
      "box"
    );

    expect(resources).toEqual([
      {
        id: "resourceId",
        name: "resourceName",
        url: `$ws$dataSource$bodyUrl`,
        method: "post",
        headers: [
          {
            name: "Authorization",
            value: `"Token " + $ws$dataSource$bodyToken`,
          },
        ],
        body: `$ws$dataSource$boxBody`,
      },
    ]);
    expect(dataSources).toEqual([
      {
        id: "boxData",
        scopeInstanceId: "box",
        name: "data",
        type: "resource",
        resourceId: "resourceId",
      },
      {
        id: "boxBody",
        scopeInstanceId: "box",
        name: "token",
        type: "variable",
        value: { type: "string", value: "body" },
      },
      {
        id: "bodyUrl",
        scopeInstanceId: "body",
        name: "url",
        type: "variable",
        value: { type: "string", value: "url" },
      },
      {
        id: "bodyToken",
        scopeInstanceId: "body",
        name: "token",
        type: "variable",
        value: { type: "string", value: "token" },
      },
    ]);
  });
});

describe("insert webstudio fragment copy", () => {
  const emptyFragment = {
    children: [],
    instances: [
      {
        id: "body",
        type: "instance",
        component: "Body",
        children: [],
      } satisfies Instance,
    ],
    styleSourceSelections: [],
    styleSources: [],
    breakpoints: [],
    styles: [],
    dataSources: [],
    resources: [],
    props: [],
    assets: [],
  };

  $project.set({ id: "current_project" } as Project);

  beforeEach(() => {
    $assets.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $instances.set(new Map());
    $props.set(new Map());
    $dataSources.set(new Map());
  });

  test("insert assets with same ids if missing", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        assets: [createImageAsset("asset1", "name", "another_project")],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.assets.values())).toEqual([
      createImageAsset("asset1", "name", "current_project"),
    ]);

    data.assets = toMap([
      createImageAsset("asset1", "changed_name", "current_project"),
    ]);
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        assets: [
          createImageAsset("asset1", "name", "another_project"),
          createImageAsset("asset2", "another_name", "another_project"),
        ],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.assets.values())).toEqual([
      // preserve any user changes
      createImageAsset("asset1", "changed_name", "current_project"),
      // add new assets while preserving old ones
      createImageAsset("asset2", "another_name", "current_project"),
    ]);
  });

  test("merge breakpoints with existing ones", () => {
    const breakpoints = toMap<Breakpoint>([
      { id: "existing_base", label: "base" },
      { id: "existing_small", label: "small", minWidth: 768 },
    ]);
    const data = getWebstudioDataStub({ breakpoints });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [
          { id: "new_base", label: "Base" },
          {
            id: "new_small",
            label: "Small",
            minWidth: 768,
          },
          {
            id: "new_large",
            label: "Large",
            minWidth: 1200,
          },
        ],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.breakpoints.values())).toEqual([
      { id: "existing_base", label: "base" },
      { id: "existing_small", label: "small", minWidth: 768 },
      { id: "new_large", label: "Large", minWidth: 1200 },
    ]);
  });

  test("insert missing tokens and use merged breakpoint ids", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "oldLabel" },
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "new_base", label: "Base" }],
        styleSources: [
          { id: "token1", type: "token", name: "newLabel" },
          { id: "token2", type: "token", name: "myToken" },
        ],
        styles: [
          {
            styleSourceId: "token1",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "token2",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "green" },
          },
        ],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "token1", type: "token", name: "oldLabel" },
      { id: "token2", type: "token", name: "myToken" },
    ]);
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: "token2",
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "green" },
      },
    ]);
  });

  test("insert instances", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "box",
            component: "Box",
            children: [],
          },
        ],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.instances.keys())).toEqual([
      expect.not.stringMatching("box"),
    ]);
  });

  test("insert instances with portals", () => {
    // portal
    //   fragment
    //     box
    const instancesWithPortals: Instance[] = [
      {
        type: "instance",
        id: "portal",
        component: portalComponent,
        children: [{ type: "id", value: "fragment" }],
      },
      {
        type: "instance",
        id: "fragment",
        component: "Fragment",
        children: [{ type: "id", value: "box" }],
      },
      {
        type: "instance",
        id: "box",
        component: "Box",
        children: [{ type: "text", value: "First" }],
      },
    ];
    const data = getWebstudioDataStub();

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: instancesWithPortals,
      },
      availableDataSources: new Set(),
    });

    expect(Array.from(data.instances.values())).toEqual([
      {
        type: "instance",
        id: "fragment",
        component: "Fragment",
        children: [{ type: "id", value: "box" }],
      },
      {
        type: "instance",
        id: "box",
        component: "Box",
        children: [{ type: "text", value: "First" }],
      },
      {
        type: "instance",
        id: expect.not.stringMatching("portal"),
        component: portalComponent,
        children: [{ type: "id", value: "fragment" }],
      },
    ]);

    // change portal content and make sure it does not break
    // when stale portal with same id is inserted
    data.instances.delete("box");
    data.instances.set("fragment", {
      type: "instance",
      id: "fragment",
      component: "Fragment",
      children: [],
    });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: instancesWithPortals,
      },
      availableDataSources: new Set(),
    });

    expect(Array.from(data.instances.values())).toEqual([
      {
        type: "instance",
        id: "fragment",
        component: "Fragment",
        children: [],
      },
      {
        type: "instance",
        id: expect.not.stringMatching("portal"),
        component: portalComponent,
        children: [{ type: "id", value: "fragment" }],
      },
      {
        type: "instance",
        id: expect.not.stringMatching("portal"),
        component: portalComponent,
        children: [{ type: "id", value: "fragment" }],
      },
    ]);
  });

  test("insert props with new ids", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        props: [
          {
            id: "prop1",
            instanceId: "body",
            name: "myProp1",
            type: "string",
            value: "",
          },
        ],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.props.values())).toEqual([
      {
        id: expect.not.stringMatching("prop1"),
        instanceId: expect.not.stringMatching("body"),
        name: "myProp1",
        type: "string",
        value: "",
      },
    ]);
  });

  test("insert props from portals with old ids", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        // portal
        //   fragment
        instances: [
          {
            type: "instance",
            id: "portal",
            component: portalComponent,
            children: [{ type: "id", value: "fragment" }],
          },
          {
            type: "instance",
            id: "fragment",
            component: "Fragment",
            children: [],
          },
        ],
        props: [
          {
            id: "prop1",
            instanceId: "fragment",
            name: "myProp1",
            type: "string",
            value: "",
          },
        ],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.props.values())).toEqual([
      {
        id: "prop1",
        instanceId: "fragment",
        name: "myProp1",
        type: "string",
        value: "",
      },
    ]);
  });

  test("insert data sources with new ids", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        dataSources: [
          {
            id: "variableId",
            scopeInstanceId: "body",
            type: "variable",
            name: "myVariable",
            value: { type: "string", value: "" },
          },
        ],
        instances: [
          createInstance("body", "Body", [
            { type: "expression", value: "$ws$dataSource$variableId" },
          ]),
        ],
        props: [
          {
            id: "expressionId",
            instanceId: "body",
            name: "myProp1",
            type: "expression",
            value: "$ws$dataSource$variableId",
          },
          {
            id: "actionId",
            instanceId: "body",
            name: "myProp2",
            type: "action",
            value: [
              {
                type: "execute",
                args: [],
                code: `$ws$dataSource$variableId = ""`,
              },
            ],
          },
          {
            id: "parameterId",
            instanceId: "body",
            name: "myProp3",
            type: "parameter",
            value: "variableId",
          },
        ],
      },
      availableDataSources: new Set(),
    });
    const [newVariableId] = data.dataSources.keys();
    const [newInstanceId] = data.instances.keys();
    expect(newVariableId).not.toEqual("variableId");
    expect(Array.from(data.dataSources.values())).toEqual([
      {
        id: newVariableId,
        scopeInstanceId: newInstanceId,
        type: "variable",
        name: "myVariable",
        value: { type: "string", value: "" },
      },
    ]);
    expect(Array.from(data.instances.values())).toEqual([
      createInstance(newInstanceId, "Body", [
        { type: "expression", value: encodeDataSourceVariable(newVariableId) },
      ]),
    ]);
    expect(Array.from(data.props.values())).toEqual([
      {
        id: expect.not.stringMatching("expressionId"),
        instanceId: newInstanceId,
        name: "myProp1",
        type: "expression",
        value: encodeDataSourceVariable(newVariableId),
      },
      {
        id: expect.not.stringMatching("actionId"),
        instanceId: newInstanceId,
        name: "myProp2",
        type: "action",
        value: [
          {
            type: "execute",
            args: [],
            code: `${encodeDataSourceVariable(newVariableId)} = ""`,
          },
        ],
      },
      {
        id: expect.not.stringMatching("parameterId"),
        instanceId: newInstanceId,
        name: "myProp3",
        type: "parameter",
        value: newVariableId,
      },
    ]);
  });

  test("inline data sources when not available in scope", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        dataSources: [
          {
            id: "outsideVariableId",
            scopeInstanceId: "outsideInstanceId",
            type: "variable",
            name: "myOutsideVariable",
            value: { type: "string", value: "outside" },
          },
          {
            id: "insideVariableId",
            scopeInstanceId: "insideInstanceId",
            type: "variable",
            name: "myInsideVariable",
            value: { type: "string", value: "inside" },
          },
        ],
        instances: [
          createInstance("body", "Body", [
            {
              type: "expression",
              value:
                "$ws$dataSource$outsideVariableId + $ws$dataSource$insideVariableId",
            },
          ]),
        ],
        props: [
          {
            id: "expressionId",
            instanceId: "body",
            name: "myProp1",
            type: "expression",
            value:
              "$ws$dataSource$outsideVariableId + $ws$dataSource$insideVariableId",
          },
          {
            id: "actionId",
            instanceId: "body",
            name: "myProp2",
            type: "action",
            value: [
              {
                type: "execute",
                args: [],
                code: `$ws$dataSource$outsideVariableId = "outside"`,
              },
              {
                type: "execute",
                args: [],
                code: `$ws$dataSource$insideVariableId = "inside"`,
              },
            ],
          },
        ],
      },
      availableDataSources: new Set(["insideVariableId"]),
    });
    const [newInstanceId] = data.instances.keys();
    expect(data.dataSources).toEqual(new Map());
    expect(Array.from(data.instances.values())).toEqual([
      createInstance(newInstanceId, "Body", [
        {
          type: "expression",
          value: `"outside" + $ws$dataSource$insideVariableId`,
        },
      ]),
    ]);
    expect(Array.from(data.props.values())).toEqual([
      {
        id: expect.not.stringMatching("expressionId"),
        instanceId: newInstanceId,
        name: "myProp1",
        type: "expression",
        value: `"outside" + $ws$dataSource$insideVariableId`,
      },
      {
        id: expect.not.stringMatching("actionId"),
        instanceId: newInstanceId,
        name: "myProp2",
        type: "action",
        value: [
          {
            type: "execute",
            args: [],
            code: `$ws$dataSource$insideVariableId = "inside"`,
          },
        ],
      },
    ]);
  });

  test("insert data sources from portals with old ids", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        // portal
        //   fragment
        instances: [
          {
            type: "instance",
            id: "portal",
            component: portalComponent,
            children: [{ type: "id", value: "fragment" }],
          },
          {
            type: "instance",
            id: "fragment",
            component: "Fragment",
            children: [
              { type: "expression", value: "$ws$dataSource$variableId" },
            ],
          },
        ],
        dataSources: [
          {
            id: "variableId",
            scopeInstanceId: "fragment",
            type: "variable",
            name: "myVariable",
            value: { type: "string", value: "" },
          },
        ],
        props: [
          {
            id: "expressionId",
            instanceId: "fragment",
            name: "myProp1",
            type: "expression",
            value: "$ws$dataSource$variableId",
          },
          {
            id: "actionId",
            instanceId: "fragment",
            name: "myProp2",
            type: "action",
            value: [
              {
                type: "execute",
                args: [],
                code: `$ws$dataSource$variableId = ""`,
              },
            ],
          },
          {
            id: "parameterId",
            instanceId: "fragment",
            name: "myProp3",
            type: "parameter",
            value: "variableId",
          },
        ],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.dataSources.values())).toEqual([
      {
        id: "variableId",
        scopeInstanceId: "fragment",
        type: "variable",
        name: "myVariable",
        value: { type: "string", value: "" },
      },
    ]);
    expect(data.instances.get("fragment")).toEqual({
      type: "instance",
      id: "fragment",
      component: "Fragment",
      children: [{ type: "expression", value: "$ws$dataSource$variableId" }],
    });
    expect(Array.from(data.props.values())).toEqual([
      {
        id: "expressionId",
        instanceId: "fragment",
        name: "myProp1",
        type: "expression",
        value: `$ws$dataSource$variableId`,
      },
      {
        id: "actionId",
        instanceId: "fragment",
        name: "myProp2",
        type: "action",
        value: [
          {
            type: "execute",
            args: [],
            code: `$ws$dataSource$variableId = ""`,
          },
        ],
      },
      {
        id: "parameterId",
        instanceId: "fragment",
        name: "myProp3",
        type: "parameter",
        value: `variableId`,
      },
    ]);
  });

  test("inline data sources from portals when not available in scope", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        // portal
        //   fragment
        instances: [
          createInstance("portal", portalComponent, [
            { type: "id", value: "fragment" },
          ]),
          createInstance("fragment", "Fragment", [
            {
              type: "expression",
              value:
                "$ws$dataSource$outsideVariableId + $ws$dataSource$insideVariableId",
            },
          ]),
        ],
        dataSources: [
          {
            id: "outsideVariableId",
            scopeInstanceId: "outsideInstanceId",
            type: "variable",
            name: "myOutsideVariable",
            value: { type: "string", value: "outside" },
          },
          {
            id: "insideVariableId",
            scopeInstanceId: "insideInstanceId",
            type: "variable",
            name: "myInsideVariable",
            value: { type: "string", value: "inside" },
          },
        ],
        props: [
          {
            id: "expressionId",
            instanceId: "fragment",
            name: "myProp1",
            type: "expression",
            value:
              "$ws$dataSource$outsideVariableId + $ws$dataSource$insideVariableId",
          },
          {
            id: "actionId",
            instanceId: "fragment",
            name: "myProp2",
            type: "action",
            value: [
              {
                type: "execute",
                args: [],
                code: `$ws$dataSource$outsideVariableId = "outside"`,
              },
              {
                type: "execute",
                args: [],
                code: `$ws$dataSource$insideVariableId = "inside"`,
              },
            ],
          },
        ],
      },
      availableDataSources: new Set(["insideVariableId"]),
    });
    expect(data.dataSources).toEqual(new Map());
    expect(data.instances.get("fragment")).toEqual(
      createInstance("fragment", "Fragment", [
        {
          type: "expression",
          value: `"outside" + $ws$dataSource$insideVariableId`,
        },
      ])
    );
    expect(Array.from(data.props.values())).toEqual([
      {
        id: "expressionId",
        instanceId: "fragment",
        name: "myProp1",
        type: "expression",
        value: `"outside" + $ws$dataSource$insideVariableId`,
      },
      {
        id: "actionId",
        instanceId: "fragment",
        name: "myProp2",
        type: "action",
        value: [
          {
            type: "execute",
            args: [],
            code: `$ws$dataSource$insideVariableId = "inside"`,
          },
        ],
      },
    ]);
  });

  test("insert local styles with new ids and use merged breakpoint ids", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const data = getWebstudioDataStub({ breakpoints });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "box",
            component: "Box",
            children: [],
          },
        ],
        breakpoints: [{ id: "new_base", label: "Base" }],
        styleSourceSelections: [
          { instanceId: "box", values: ["localId", "tokenId"] },
          { instanceId: "unknown", values: [] },
        ],
        styleSources: [{ id: "localId", type: "local" }],
        styles: [
          {
            styleSourceId: "localId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "tokenId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "green" },
          },
        ],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.styleSourceSelections.values())).toEqual([
      {
        instanceId: expect.not.stringMatching("box"),
        values: [expect.not.stringMatching("localId"), "tokenId"],
      },
    ]);
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: expect.not.stringMatching("localId"), type: "local" },
    ]);
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: expect.not.stringMatching("localId"),
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("insert local styles from portal and use merged breakpoint ids", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const data = getWebstudioDataStub({ breakpoints });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        // portal
        //   fragment
        instances: [
          {
            type: "instance",
            id: "portal",
            component: portalComponent,
            children: [{ type: "id", value: "fragment" }],
          },
          {
            type: "instance",
            id: "fragment",
            component: "Fragment",
            children: [{ type: "id", value: "box" }],
          },
        ],
        breakpoints: [{ id: "new_base", label: "Base" }],
        styleSourceSelections: [
          { instanceId: "fragment", values: ["localId", "tokenId"] },
          { instanceId: "unknown", values: [] },
        ],
        styleSources: [{ id: "localId", type: "local" }],
        styles: [
          {
            styleSourceId: "localId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "tokenId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "green" },
          },
        ],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.styleSourceSelections.values())).toEqual([
      { instanceId: "fragment", values: ["localId", "tokenId"] },
    ]);
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "localId", type: "local" },
    ]);
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: "localId",
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("insert resources with new ids", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        resources: [
          {
            id: "resourceId",
            name: "",
            url: `$ws$dataSource$paramVariableId`,
            method: "post",
            headers: [
              { name: "auth", value: "$ws$dataSource$paramVariableId" },
            ],
            body: `$ws$dataSource$paramVariableId`,
          },
        ],
        dataSources: [
          {
            id: "paramVariableId",
            scopeInstanceId: "body",
            name: "myParam",
            type: "variable",
            value: { type: "string", value: "myParam" },
          },
          {
            id: "resourceVariableId",
            scopeInstanceId: "body",
            name: "myResource",
            type: "resource",
            resourceId: "resourceId",
          },
        ],
      },
      availableDataSources: new Set(),
    });
    const [newInstanceId] = data.instances.keys();
    const [newParamId, newResourceVariableId] = data.dataSources.keys();
    const [newResourceId] = data.resources.keys();
    expect(newResourceId).not.toEqual("resourceId");
    expect(Array.from(data.dataSources.values())).toEqual([
      {
        id: newParamId,
        scopeInstanceId: newInstanceId,
        name: "myParam",
        type: "variable",
        value: { type: "string", value: "myParam" },
      },
      {
        id: newResourceVariableId,
        scopeInstanceId: newInstanceId,
        name: "myResource",
        type: "resource",
        resourceId: newResourceId,
      },
    ]);
    expect(Array.from(data.resources.values())).toEqual([
      {
        id: newResourceId,
        name: "",
        url: encodeDataSourceVariable(newParamId),
        method: "post",
        headers: [
          { name: "auth", value: encodeDataSourceVariable(newParamId) },
        ],
        body: encodeDataSourceVariable(newParamId),
      },
    ]);
  });

  test("inline data sources into resources when not available in the scope", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        resources: [
          {
            id: "resourceId",
            name: "",
            url: `$ws$dataSource$paramVariableId`,
            method: "post",
            headers: [
              { name: "auth", value: "$ws$dataSource$paramVariableId" },
            ],
            body: `$ws$dataSource$paramVariableId`,
          },
        ],
        dataSources: [
          {
            id: "paramVariableId",
            scopeInstanceId: "outside",
            name: "myParam",
            type: "variable",
            value: { type: "string", value: "myParam" },
          },
          {
            id: "variableId",
            scopeInstanceId: "body",
            name: "myResource",
            type: "resource",
            resourceId: "resourceId",
          },
        ],
      },
      availableDataSources: new Set(),
    });
    const [newResourceId] = data.resources.keys();
    expect(Array.from(data.resources.values())).toEqual([
      {
        id: newResourceId,
        name: "",
        url: `"myParam"`,
        method: "post",
        headers: [{ name: "auth", value: `"myParam"` }],
        body: `"myParam"`,
      },
    ]);
  });

  test("inline resource variables when not available in scope", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        resources: [
          {
            id: "resourceId",
            name: "",
            url: `""`,
            method: "get",
            headers: [],
          },
        ],
        dataSources: [
          {
            id: "variableId",
            scopeInstanceId: "outside",
            name: "myResource",
            type: "resource",
            resourceId: "resourceId",
          },
        ],
        props: [
          {
            id: "expressionId",
            instanceId: "body",
            name: "myProp",
            type: "expression",
            value: "$ws$dataSource$variableId",
          },
        ],
      },
      availableDataSources: new Set(),
    });
    const [newInstanceId] = data.instances.keys();
    expect(Array.from(data.props.values())).toEqual([
      {
        id: expect.not.stringMatching("expressionId"),
        instanceId: newInstanceId,
        name: "myProp",
        type: "expression",
        value: "{}",
      },
    ]);
  });

  test("insert resources from portals with old ids", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        // portal
        //   fragment
        instances: [
          createInstance("portal", portalComponent, [
            { type: "id", value: "fragment" },
          ]),
          createInstance("fragment", "Fragment", []),
        ],
        resources: [
          {
            id: "resourceId",
            name: "",
            url: `""`,
            method: "get",
            headers: [],
          },
        ],
        dataSources: [
          {
            id: "variableId",
            scopeInstanceId: "fragment",
            name: "myVariable",
            type: "resource",
            resourceId: "resourceId",
          },
        ],
      },
      availableDataSources: new Set(),
    });
    expect(Array.from(data.dataSources.values())).toEqual([
      {
        id: "variableId",
        scopeInstanceId: "fragment",
        name: "myVariable",
        type: "resource",
        resourceId: "resourceId",
      },
    ]);
    expect(Array.from(data.resources.values())).toEqual([
      {
        id: "resourceId",
        name: "",
        url: `""`,
        method: "get",
        headers: [],
      },
    ]);
  });

  test("inline data sources into resources from portals when not available in scope", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        // portal
        //   fragment
        instances: [
          createInstance("portal", portalComponent, [
            { type: "id", value: "fragment" },
          ]),
          createInstance("fragment", "Fragment", []),
        ],
        resources: [
          {
            id: "resourceId",
            name: "",
            url: `$ws$dataSource$paramVariableId`,
            method: "post",
            headers: [
              { name: "auth", value: "$ws$dataSource$paramVariableId" },
            ],
            body: `$ws$dataSource$paramVariableId`,
          },
        ],
        dataSources: [
          {
            id: "paramVariableId",
            scopeInstanceId: "outside",
            name: "myParam",
            type: "variable",
            value: { type: "string", value: "myParam" },
          },
          {
            id: "variableId",
            scopeInstanceId: "fragment",
            name: "myResource",
            type: "resource",
            resourceId: "resourceId",
          },
        ],
      },
      availableDataSources: new Set(),
    });
    const [newResourceId] = data.resources.keys();
    expect(Array.from(data.resources.values())).toEqual([
      {
        id: newResourceId,
        name: "",
        url: `"myParam"`,
        method: "post",
        headers: [{ name: "auth", value: `"myParam"` }],
        body: `"myParam"`,
      },
    ]);
  });
});
