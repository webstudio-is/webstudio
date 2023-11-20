import { enableMapSet } from "immer";
import { describe, test, expect } from "@jest/globals";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import type {
  Asset,
  Instance,
  Instances,
  Prop,
  StyleDecl,
  StyleDeclKey,
} from "@webstudio-is/sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  computeInstancesConstraints,
  findClosestDroppableComponentIndex,
  findClosestDroppableTarget,
  findClosestEditableInstanceSelector,
  insertTemplateData,
  type InsertConstraints,
  deleteInstance,
  getInstancesSlice,
} from "./instance-utils";
import {
  assetsStore,
  breakpointsStore,
  dataSourcesStore,
  instancesStore,
  propsStore,
  registeredComponentMetasStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  stylesStore,
} from "./nano-states";
import { registerContainers } from "./sync";

enableMapSet();
registerContainers();

const defaultMetasMap = new Map(Object.entries(defaultMetas));

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

const createImageAsset = (id: string): Asset => {
  return {
    id,
    type: "image",
    format: "",
    name: "",
    description: "",
    projectId: "",
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
    const instances: Instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [
        { type: "text", value: "some text" },
        { type: "id", value: "bold" },
      ]),
      createInstancePair("bold", "Bold", [
        { type: "text", value: "some-bold" },
      ]),
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
    const instances: Instances = new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box" }]),
      createInstancePair("box", "Box", [
        { type: "text", value: "some text" },
        { type: "id", value: "bold" },
        { type: "id", value: "child-box" },
      ]),
      createInstancePair("bold", "Bold", [
        { type: "text", value: "some-bold" },
      ]),
      createInstancePair("child-box", "Box", [
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
    const instances: Instances = new Map([
      createInstancePair("body", "Body", []),
    ]);
    expect(
      findClosestEditableInstanceSelector(
        ["body"],
        instances,
        createFakeComponentMetas({})
      )
    ).toEqual(["body"]);
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
    expect(
      findClosestDroppableTarget(
        defaultMetasMap,
        instances,
        ["not-existing", "body"],
        emptyInsertConstraints
      )
    ).toEqual(undefined);
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

test("insert template data with only new style sources", () => {
  instancesStore.set(new Map([createInstancePair("body", "Body", [])]));
  styleSourceSelectionsStore.set(new Map());
  styleSourcesStore.set(
    new Map([["1", { type: "token", id: "1", name: "Zero" }]])
  );
  stylesStore.set(
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
    },
    { parentSelector: ["body"], position: "end" }
  );
  expect(styleSourceSelectionsStore.get()).toEqual(
    new Map([["box1", { instanceId: "box1", values: ["1", "2"] }]])
  );
  expect(styleSourcesStore.get()).toEqual(
    new Map([
      ["1", { type: "token", id: "1", name: "Zero" }],
      ["2", { type: "token", id: "2", name: "Two" }],
    ])
  );
  expect(stylesStore.get()).toEqual(
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

test("delete instance with its children", () => {
  // body
  //   box1
  //     box11
  //   box2
  instancesStore.set(
    new Map([
      createInstancePair("body", "Body", [
        { type: "id", value: "box1" },
        { type: "id", value: "box2" },
      ]),
      createInstancePair("box1", "Box", [{ type: "id", value: "box11" }]),
      createInstancePair("box11", "Box", []),
      createInstancePair("box2", "Box", []),
    ])
  );
  registeredComponentMetasStore.set(createFakeComponentMetas({}));
  deleteInstance(["box1", "body"]);
  expect(instancesStore.get()).toEqual(
    new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box2" }]),
      createInstancePair("box2", "Box", []),
    ])
  );
});

test("prevent deleting root instance", () => {
  // body
  //   box1
  instancesStore.set(
    new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box1" }]),
      createInstancePair("box1", "Box", []),
    ])
  );
  registeredComponentMetasStore.set(createFakeComponentMetas({}));
  deleteInstance(["body"]);
  expect(instancesStore.get()).toEqual(
    new Map([
      createInstancePair("body", "Body", [{ type: "id", value: "box1" }]),
      createInstancePair("box1", "Box", []),
    ])
  );
});

describe("get instances slice", () => {
  test("collect the instance by id and all its descendants including portal instances", () => {
    // body
    //   bodyChild1
    //     slot
    //       slotChild
    //   bodyChild2
    instancesStore.set(
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
    const { instances } = getInstancesSlice("bodyChild1");

    expect(instances).toEqual([
      createInstance("bodyChild1", "Box", [{ type: "id", value: "slot" }]),
      createInstance("slot", "Slot", [{ type: "id", value: "slotChild" }]),
      createInstance("slotChild", "Box", []),
    ]);
  });

  test("collect all styles and breakpoints bound to instances slice", () => {
    // body
    //   box1
    //     box2
    instancesStore.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    styleSourceSelectionsStore.set(
      new Map([
        ["body", { instanceId: "box1", values: ["localBody", "token1"] }],
        ["box1", { instanceId: "box1", values: ["localBox1", "token2"] }],
        ["box2", { instanceId: "box2", values: ["localBox2", "token2"] }],
      ])
    );
    styleSourcesStore.set(
      new Map([
        ["localBody", { id: "localBody", type: "local" }],
        ["localBox1", { id: "localBox1", type: "local" }],
        ["localBox2", { id: "localBox2", type: "local" }],
        ["token1", { id: "token1", type: "token", name: "token1" }],
        ["token2", { id: "token2", type: "token", name: "token2" }],
      ])
    );
    stylesStore.set(
      new Map([
        createStyleDeclPair("localBody1", "base", "color", "red"),
        createStyleDeclPair("localBox1", "base", "color", "green"),
        createStyleDeclPair("localBox2", "base", "color", "blue"),
        createStyleDeclPair("token1", "base", "color", "yellow"),
        createStyleDeclPair("token2", "base", "color", "orange"),
      ])
    );
    breakpointsStore.set(
      new Map([
        ["base", { id: "base", label: "base" }],
        ["big", { id: "big", label: "big", minWidth: 768 }],
      ])
    );
    const { styleSources, styleSourceSelections, styles, breakpoints } =
      getInstancesSlice("box1");

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

  test("collect all props bound to instances slice", () => {
    // body
    //   box1
    //     box2
    instancesStore.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    propsStore.set(
      toMap([
        createProp("body", "bodyProp", "data-body"),
        createProp("box1", "box1Prop", "data-box1"),
        createProp("box2", "box2Prop", "data-box2"),
      ])
    );
    const { props } = getInstancesSlice("box1");

    expect(props).toEqual([
      createProp("box1", "box1Prop", "data-box1"),
      createProp("box2", "box2Prop", "data-box2"),
    ]);
  });

  test("collect assets from props and styles withiin instances slice", () => {
    // body
    //   box1
    //     box2
    instancesStore.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    propsStore.set(
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
    styleSourceSelectionsStore.set(
      new Map([
        ["body", { instanceId: "box1", values: ["localBody"] }],
        ["box1", { instanceId: "box1", values: ["localBox1"] }],
      ])
    );
    styleSourcesStore.set(
      new Map([
        ["localBody", { id: "localBody", type: "local" }],
        ["localBox1", { id: "localBox1", type: "local" }],
      ])
    );
    stylesStore.set(
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
    breakpointsStore.set(new Map([["base", { id: "base", label: "base" }]]));
    assetsStore.set(
      toMap([
        createImageAsset("asset1"),
        createImageAsset("asset2"),
        createImageAsset("asset3"),
        createImageAsset("asset4"),
        createFontAsset("asset5", "font1"),
        createFontAsset("asset6", "font2"),
      ])
    );
    const { assets } = getInstancesSlice("box1");

    expect(assets).toEqual([
      createImageAsset("asset2"),
      createImageAsset("asset4"),
      createFontAsset("asset6", "font2"),
    ]);
  });

  test("collect data sources used in expressions within instances", () => {
    // body
    //   box1
    //     box2
    instancesStore.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    dataSourcesStore.set(
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
    propsStore.set(
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
    const { props, dataSources } = getInstancesSlice("box2");

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
    instancesStore.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    dataSourcesStore.set(
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
    propsStore.set(
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
    const { props, dataSources } = getInstancesSlice("box2");

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
});
