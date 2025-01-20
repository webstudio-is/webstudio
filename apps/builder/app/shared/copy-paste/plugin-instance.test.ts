import { describe, test, expect } from "vitest";
import { enableMapSet } from "immer";
import type {
  Instance,
  Instances,
  Prop,
  Props,
  DataSource,
  DataSources,
} from "@webstudio-is/sdk";
import {
  encodeDataSourceVariable,
  collectionComponent,
  coreMetas,
  portalComponent,
} from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { registerContainers } from "../sync";
import {
  $instances,
  $dataSources,
  $pages,
  $project,
  $props,
  $registeredComponentMetas,
} from "../nano-states";
import { onCopy, onCut, onPaste } from "./plugin-instance";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $awareness, selectInstance } from "../awareness";

const expectString = expect.any(String) as unknown as string;

enableMapSet();
registerContainers();

$registeredComponentMetas.set(
  new Map(Object.entries({ ...baseComponentMetas, ...coreMetas }))
);
$project.set({ id: "my-project" } as Project);
$pages.set(
  createDefaultPages({
    homePageId: "home-page",
    rootInstanceId: "body0",
    systemDataSourceId: "",
  })
);
$awareness.set({ pageId: "home-page" });

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
    $instances.set(instances);
    selectInstance(["box1", "body0"]);
    const clipboardData = onCopy() ?? "";
    selectInstance(["box2", "body0"]);
    onPaste(clipboardData);

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [newBox1] = instancesDifference.keys();
    expect($instances.get().get("box2")).toEqual(
      createInstance("box2", "Box", [{ type: "id", value: newBox1 }])
    );
    expect(instancesDifference).toEqual(
      toMap([createInstance(newBox1, "Box", [])])
    );
  });

  test("is after selected instance when same as copied", () => {
    $instances.set(instances);
    selectInstance(["box1", "body0"]);
    onPaste(onCopy() ?? "");

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [newBox1] = instancesDifference.keys();
    expect($instances.get().get("body0")).toEqual(
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
    $instances.set(instances);
    $dataSources.set(dataSources);
    $props.set(props);
    selectInstance(["box1", "body0"]);
    const clipboardData = onCopy() ?? "";
    selectInstance(["body0"]);
    onPaste(clipboardData);

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [newBox1, newBox2] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      $dataSources.get()
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

    const propsDifference = getMapDifference(props, $props.get());
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
    $instances.set(instances);
    $props.set(props);
    $dataSources.set(dataSources);
    selectInstance(["box2", "box1", "body0"]);
    const clipboardData = onCopy() ?? "";
    selectInstance(["body0"]);
    onPaste(clipboardData);

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [newBox2] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      $dataSources.get()
    );
    expect(dataSourcesDifference).toEqual(new Map());

    const propsDifference = getMapDifference(props, $props.get());
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
    $instances.set(instances);
    $props.set(props);
    $dataSources.set(dataSources);
    selectInstance(["box2", "box1", "body0"]);
    const clipboardData = onCopy() ?? "";
    selectInstance(["box1", "body0"]);
    onPaste(clipboardData);

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [newBox2] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      $dataSources.get()
    );
    expect(dataSourcesDifference).toEqual(new Map());

    const propsDifference = getMapDifference(props, $props.get());
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
    $instances.set(instances);
    $props.set(props);
    $dataSources.set(dataSources);
    selectInstance(["list", "body"]);
    const clipboardData = onCopy() ?? "";
    selectInstance(["body"]);
    onPaste(clipboardData);

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [collectionId] = instancesDifference.keys();

    const dataSourcesDifference = getMapDifference(
      dataSources,
      $dataSources.get()
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

    const propsDifference = getMapDifference(props, $props.get());
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
  selectInstance(["box", "body"]);
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

test("prevent pasting portal into own descendants", () => {
  const instances = toMap([
    createInstance("body", "Body", [{ type: "id", value: "portal" }]),
    createInstance("portal", portalComponent, [
      { type: "id", value: "fragment" },
    ]),
    createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
    createInstance("box", "Box", []),
  ]);
  $instances.set(instances);
  selectInstance(["portal", "body"]);
  const clipboardData = onCopy() ?? "";
  selectInstance(["box", "fragment", "portal", "body"]);
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
  selectInstance(["portal1", "body"]);
  const clipboardData = onCopy() ?? "";
  selectInstance(["portal2", "body"]);
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
  selectInstance(["portal", "body"]);
  const clipboardData = onCopy() ?? "";
  selectInstance(["sibling", "body"]);
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
  selectInstance(["box", "body"]);
  const clipboardData = onCopy() ?? "";
  selectInstance(["portal", "body"]);

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

test("inline data source not available in portal when copy paste inside the portal", () => {
  const instances = toMap([
    createInstance("body", "Body", [
      { type: "id", value: "box" },
      { type: "id", value: "portal" },
    ]),
    createInstance("box", "Box", []),
    createInstance("portal", portalComponent, [
      { type: "id", value: "fragment" },
    ]),
    createInstance("fragment", "Fragment", []),
  ]);
  $instances.set(instances);
  const dataSources = toMap<DataSource>([
    {
      id: "variableId",
      scopeInstanceId: "body",
      name: "variableName",
      type: "variable",
      value: { type: "string", value: "value" },
    },
  ]);
  $dataSources.set(dataSources);
  const props = toMap<Prop>([
    {
      id: "propId",
      instanceId: "box",
      name: "data-value",
      type: "expression",
      value: "$ws$dataSource$variableId",
    },
  ]);
  $props.set(props);
  selectInstance(["box", "body"]);
  const clipboardData = onCut() ?? "";
  selectInstance(["fragment", "portal", "body"]);
  onPaste(clipboardData);
  expect($instances.get()).toEqual(
    toMap([
      createInstance("body", "Body", [{ type: "id", value: "portal" }]),
      createInstance("portal", portalComponent, [
        { type: "id", value: "fragment" },
      ]),
      createInstance("fragment", "Fragment", [
        { type: "id", value: expectString },
      ]),
      createInstance(expectString, "Box", []),
    ])
  );
  expect($dataSources.get()).toEqual(dataSources);
  expect($props.get()).toEqual(
    toMap<Prop>([
      {
        id: expectString,
        instanceId: expectString,
        name: "data-value",
        type: "expression",
        value: `"value"`,
      },
    ])
  );
});
