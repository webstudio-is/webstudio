import { enableMapSet } from "immer";
import { describe, test, expect } from "@jest/globals";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import type { Instance, Instances } from "@webstudio-is/project-build";
import {
  computeInstancesConstraints,
  findClosestDroppableComponentIndex,
  findClosestDroppableTarget,
  findClosestEditableInstanceSelector,
  insertTemplateData,
  type InsertConstraints,
} from "./instance-utils";
import {
  instancesStore,
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

const createInstancePair = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): [Instance["id"], Instance] => {
  return [id, { type: "instance", id, component, children }];
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
