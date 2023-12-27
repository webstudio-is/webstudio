import { describe, test, expect } from "@jest/globals";
import { enableMapSet } from "immer";
import type {
  Instance,
  Instances,
  Prop,
  Props,
  DataSource,
  DataSources,
  Page,
} from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import {
  collectionComponent,
  encodeDataSourceVariable,
  coreMetas,
  portalComponent,
} from "@webstudio-is/react-sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { registerContainers } from "../sync";
import {
  $instances,
  $selectedInstanceSelector,
  dataSourcesStore,
  instancesStore,
  pagesStore,
  projectStore,
  propsStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  selectedPageIdStore,
} from "../nano-states";
import { onCopy, onPaste } from "./plugin-instance";

const expectString = expect.any(String) as unknown as string;

enableMapSet();
registerContainers();

registeredComponentMetasStore.set(
  new Map(Object.entries({ ...baseComponentMetas, ...coreMetas }))
);
projectStore.set({ id: "my-project" } as Project);
pagesStore.set({
  meta: {},
  homePage: { id: "home-page", rootInstanceId: "body0" } as Page,
  pages: [],
});
selectedPageIdStore.set("home-page");

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

const getIdValuePair = <T extends { id: string }>(item: T) =>
  [item.id, item] as const;

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map(getIdValuePair));

const getMapDifference = <Type extends Map<unknown, unknown>>(
  left: Type,
  right: Type
): Type => {
  const leftSet = new Set(left.keys());
  const rightSet = new Set(right.keys());
  const difference = new Map() as Type;
  for (const [key, value] of left) {
    if (rightSet.has(key) === false) {
      difference.set(key, value);
    }
  }
  for (const [key, value] of right) {
    if (leftSet.has(key) === false) {
      difference.set(key, value);
    }
  }
  return difference;
};

describe("paste target", () => {
  // body0
  //   box1
  //   box2
  const instances: Instances = toMap([
    createInstance("body0", "Body", [
      { type: "id", value: "box1" },
      { type: "id", value: "box2" },
    ]),
    createInstance("box1", "Box", []),
    createInstance("box2", "Box", []),
  ] satisfies Instance[]);

  test("is inside selected instance", () => {
    instancesStore.set(instances);
    selectedInstanceSelectorStore.set(["box1", "body0"]);
    const clipboardData = onCopy() ?? "";
    selectedInstanceSelectorStore.set(["box2", "body0"]);
    onPaste(clipboardData);

    const instancesDifference = getMapDifference(
      instances,
      instancesStore.get()
    );
    const [newBox1] = instancesDifference.keys();
    expect(instancesStore.get().get("box2")).toEqual(
      createInstance("box2", "Box", [{ type: "id", value: newBox1 }])
    );
    expect(instancesDifference).toEqual(
      toMap([createInstance(newBox1, "Box", [])])
    );
  });

  test("is after selected instance when same as copied", () => {
    instancesStore.set(instances);
    selectedInstanceSelectorStore.set(["box1", "body0"]);
    onPaste(onCopy() ?? "");

    const instancesDifference = getMapDifference(
      instances,
      instancesStore.get()
    );
    const [newBox1] = instancesDifference.keys();
    expect(instancesStore.get().get("body0")).toEqual(
      createInstance("body0", "Body", [
        { type: "id", value: "box1" },
        { type: "id", value: newBox1 },
        { type: "id", value: "box2" },
      ])
    );
    expect(instancesDifference).toEqual(
      toMap([createInstance(newBox1, "Box", [])])
    );
  });
});

describe("data sources", () => {
  // body0
  //   box1
  //     box2
  const instances: Instances = toMap([
    createInstance("body0", "Body", [{ type: "id", value: "box1" }]),
    createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
    createInstance("box2", "Box", []),
  ] satisfies Instance[]);
  const dataSources: DataSources = toMap([
    {
      id: "box1$state",
      scopeInstanceId: "box1",
      type: "variable",
      name: "state",
      value: { type: "string", value: "initial" },
    },
  ] satisfies DataSource[]);
  const props: Props = toMap([
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
      id: "box2$onChangeProp",
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
  ] satisfies Prop[]);

  test("are copy pasted when scoped to copied instances", () => {
    instancesStore.set(instances);
    dataSourcesStore.set(dataSources);
    propsStore.set(props);
    selectedInstanceSelectorStore.set(["box1", "body0"]);
    const clipboardData = onCopy() ?? "";
    selectedInstanceSelectorStore.set(["body0"]);
    onPaste(clipboardData);

    const instancesDifference = getMapDifference(
      instances,
      instancesStore.get()
    );
    const [newBox1, newBox2] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      dataSourcesStore.get()
    );
    const [newDataSource1] = dataSourcesDifference.keys();
    expect(dataSourcesDifference).toEqual(
      toMap([
        {
          ...dataSources.get("box1$state"),
          id: newDataSource1,
          scopeInstanceId: newBox1,
        },
      ])
    );

    const propsDifference = getMapDifference(props, propsStore.get());
    const [newProp1, newProp2, newProp3, newProp4] = propsDifference.keys();
    expect(propsDifference).toEqual(
      toMap([
        {
          id: newProp1,
          instanceId: newBox1,
          name: "state",
          type: "expression",
          value: encodeDataSourceVariable(newDataSource1),
        },
        {
          id: newProp2,
          instanceId: newBox2,
          name: "state",
          type: "expression",
          value: encodeDataSourceVariable(newDataSource1),
        },
        {
          id: newProp3,
          instanceId: newBox2,
          name: "show",
          type: "expression",
          value: `${encodeDataSourceVariable(newDataSource1)} === 'initial'`,
        },
        {
          id: newProp4,
          instanceId: newBox2,
          name: "onChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: `${encodeDataSourceVariable(newDataSource1)} = value`,
            },
          ],
        },
      ])
    );
  });

  test("are inlined into props when not scoped to copied instances or depends on not scoped data source", () => {
    instancesStore.set(instances);
    propsStore.set(props);
    dataSourcesStore.set(dataSources);
    selectedInstanceSelectorStore.set(["box2", "box1", "body0"]);
    const clipboardData = onCopy() ?? "";
    selectedInstanceSelectorStore.set(["body0"]);
    onPaste(clipboardData);

    const instancesDifference = getMapDifference(
      instances,
      instancesStore.get()
    );
    const [newBox2] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      dataSourcesStore.get()
    );
    expect(dataSourcesDifference).toEqual(new Map());

    const propsDifference = getMapDifference(props, propsStore.get());
    const [newProp1, newProp2, newProp3] = propsDifference.keys();
    expect(propsDifference).toEqual(
      toMap([
        {
          id: newProp1,
          instanceId: newBox2,
          name: "state",
          type: "expression",
          value: `"initial"`,
        },
        {
          id: newProp2,
          instanceId: newBox2,
          name: "show",
          type: "expression",
          value: `"initial" === 'initial'`,
        },
        {
          id: newProp3,
          instanceId: newBox2,
          type: "action",
          name: "onChange",
          value: [],
        },
      ])
    );
  });

  test("preserve data sources outside of scope when pasted within their scope", () => {
    instancesStore.set(instances);
    propsStore.set(props);
    dataSourcesStore.set(dataSources);
    selectedInstanceSelectorStore.set(["box2", "box1", "body0"]);
    const clipboardData = onCopy() ?? "";
    selectedInstanceSelectorStore.set(["box1", "body0"]);
    onPaste(clipboardData);

    const instancesDifference = getMapDifference(
      instances,
      instancesStore.get()
    );
    const [newBox2] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      dataSourcesStore.get()
    );
    expect(dataSourcesDifference).toEqual(new Map());

    const propsDifference = getMapDifference(props, propsStore.get());
    const [newProp1, newProp2, newProp3] = propsDifference.keys();
    expect(propsDifference).toEqual(
      toMap([
        {
          id: newProp1,
          instanceId: newBox2,
          name: "state",
          type: "expression",
          value: `$ws$dataSource$box1$state`,
        },
        {
          id: newProp2,
          instanceId: newBox2,
          name: "show",
          type: "expression",
          value: `$ws$dataSource$box1$state === 'initial'`,
        },
        {
          id: newProp3,
          instanceId: newBox2,
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
      ])
    );
  });

  test("copy parameter prop with new data source", () => {
    const instances: Instances = toMap([
      createInstance("body", "Body", [{ type: "id", value: "list" }]),
      createInstance("list", collectionComponent, []),
    ] satisfies Instance[]);
    const dataSources: DataSources = toMap([
      {
        id: "itemDataSource",
        scopeInstanceId: "list",
        type: "parameter",
        name: "item",
      },
    ] satisfies DataSource[]);
    const props: Props = toMap([
      {
        id: "dataProp",
        instanceId: "list",
        name: "data",
        type: "json",
        value: [],
      },
      {
        id: "itemProp",
        instanceId: "list",
        name: "item",
        type: "parameter",
        value: "itemDataSource",
      },
    ] satisfies Prop[]);
    instancesStore.set(instances);
    propsStore.set(props);
    dataSourcesStore.set(dataSources);
    selectedInstanceSelectorStore.set(["list", "body"]);
    const clipboardData = onCopy() ?? "";
    selectedInstanceSelectorStore.set(["body"]);
    onPaste(clipboardData);

    const instancesDifference = getMapDifference(
      instances,
      instancesStore.get()
    );
    const [collectionId] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      dataSourcesStore.get()
    );
    const [itemDataSourceId] = dataSourcesDifference.keys();
    expect(dataSourcesDifference).toEqual(
      new Map([
        [
          itemDataSourceId,
          {
            id: itemDataSourceId,
            scopeInstanceId: collectionId,
            type: "parameter",
            name: "item",
          },
        ],
      ])
    );

    const propsDifference = getMapDifference(props, propsStore.get());
    const [dataPropId, itemPropId] = propsDifference.keys();
    expect(propsDifference).toEqual(
      toMap([
        {
          id: dataPropId,
          instanceId: collectionId,
          name: "data",
          type: "json",
          value: [],
        },
        {
          id: itemPropId,
          instanceId: collectionId,
          name: "item",
          type: "parameter",
          value: itemDataSourceId,
        },
      ])
    );
  });
});

test("when paste into copied instance insert after it", () => {
  $instances.set(
    toMap([
      createInstance("body", "Body", [{ type: "id", value: "box" }]),
      createInstance("box", "Box", []),
    ])
  );
  $selectedInstanceSelector.set(["box", "body"]);
  const clipboardData = onCopy() ?? "";
  onPaste(clipboardData);

  expect($instances.get()).toEqual(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "box" },
        { type: "id", value: expectString },
      ]),
      createInstance("box", "Box", []),
      createInstance(expectString, "Box", []),
    ])
  );
});

test("prevent pasting portal into own descendents", () => {
  const instances = toMap([
    createInstance("body", "Body", [{ type: "id", value: "portal" }]),
    createInstance("portal", portalComponent, [
      { type: "id", value: "fragment" },
    ]),
    createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
    createInstance("box", "Box", []),
  ]);
  $instances.set(instances);
  $selectedInstanceSelector.set(["portal", "body"]);
  const clipboardData = onCopy() ?? "";
  $selectedInstanceSelector.set(["box", "fragment", "portal", "body"]);
  onPaste(clipboardData);
  expect($instances.get()).toEqual(instances);
});

test("prevent pasting portal into copy of it", () => {
  const instances = toMap([
    createInstance("body", "Body", [
      { type: "id", value: "portal1" },
      { type: "id", value: "portal2" },
    ]),
    createInstance("portal1", portalComponent, [
      { type: "id", value: "fragment" },
    ]),
    createInstance("portal2", portalComponent, [
      { type: "id", value: "fragment" },
    ]),
    createInstance("fragment", "Fragment", []),
  ]);
  $instances.set(instances);
  $selectedInstanceSelector.set(["portal1", "body"]);
  const clipboardData = onCopy() ?? "";
  $selectedInstanceSelector.set(["portal2", "body"]);
  onPaste(clipboardData);
  expect($instances.get()).toEqual(instances);
});

test("insert portal into its sibling", () => {
  $instances.set(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "portal" },
        { type: "id", value: "sibling" },
      ]),
      createInstance("portal", portalComponent, [
        { type: "id", value: "fragment" },
      ]),
      createInstance("fragment", "Fragment", []),
      createInstance("sibling", "Box", []),
    ])
  );
  $selectedInstanceSelector.set(["portal", "body"]);
  const clipboardData = onCopy() ?? "";
  $selectedInstanceSelector.set(["sibling", "body"]);
  onPaste(clipboardData);

  expect($instances.get()).toEqual(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "portal" },
        { type: "id", value: "sibling" },
      ]),
      createInstance("portal", portalComponent, [
        { type: "id", value: "fragment" },
      ]),
      createInstance("fragment", "Fragment", []),
      createInstance("sibling", "Box", [{ type: "id", value: expectString }]),
      createInstance(expectString, portalComponent, [
        { type: "id", value: "fragment" },
      ]),
    ])
  );
});

test("insert into portal fragment when portal is a target", () => {
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
  $selectedInstanceSelector.set(["box", "body"]);
  const clipboardData = onCopy() ?? "";
  $selectedInstanceSelector.set(["portal", "body"]);

  // fragment not exists
  const prevInstances = $instances.get();
  onPaste(clipboardData);
  const [boxId, fragmentId] = getMapDifference(
    prevInstances,
    $instances.get()
  ).keys();
  expect($instances.get()).toEqual(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "portal" },
        { type: "id", value: "box" },
      ]),
      createInstance("portal", portalComponent, [
        { type: "id", value: fragmentId },
      ]),
      createInstance(fragmentId, "Fragment", [{ type: "id", value: boxId }]),
      createInstance("box", "Box", []),
      createInstance(boxId, "Box", []),
    ])
  );

  // fragment already exists
  onPaste(clipboardData);
  expect($instances.get()).toEqual(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "portal" },
        { type: "id", value: "box" },
      ]),
      createInstance("portal", portalComponent, [
        { type: "id", value: fragmentId },
      ]),
      createInstance(fragmentId, "Fragment", [
        { type: "id", value: boxId },
        { type: "id", value: expectString },
      ]),
      createInstance("box", "Box", []),
      createInstance(boxId, "Box", []),
      createInstance(expectString, "Box", []),
    ])
  );
});

test("wrap siblings with span when instance is rich text container", () => {
  $instances.set(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "text" },
        { type: "id", value: "box" },
      ]),
      createInstance("text", "Text", [{ type: "text", value: "My Text" }]),
      createInstance("box", "Box", []),
    ])
  );
  $selectedInstanceSelector.set(["box", "body"]);
  const clipboardData = onCopy() ?? "";
  $selectedInstanceSelector.set(["text", "body"]);

  const prevInstances = $instances.get();
  onPaste(clipboardData);
  const [boxId, spanId] = getMapDifference(
    prevInstances,
    $instances.get()
  ).keys();
  expect($instances.get()).toEqual(
    toMap([
      createInstance("body", "Body", [
        { type: "id", value: "text" },
        { type: "id", value: "box" },
      ]),
      createInstance("text", "Text", [
        { type: "id", value: spanId },
        { type: "id", value: boxId },
      ]),
      createInstance("box", "Box", []),
      createInstance(boxId, "Box", []),
      createInstance(spanId, "Text", [{ type: "text", value: "My Text" }]),
    ])
  );
});
