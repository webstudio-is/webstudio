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
import { encodeDataSourceVariable } from "@webstudio-is/react-sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { registerContainers } from "../sync";
import {
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

enableMapSet();
registerContainers();

registeredComponentMetasStore.set(new Map(Object.entries(baseComponentMetas)));
projectStore.set({ id: "my-project" } as Project);
pagesStore.set({
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
    {
      id: "box2$stateInitial",
      scopeInstanceId: "box2",
      type: "expression",
      name: "stateInitial",
      code: `$ws$dataSource$box1$state === 'initial'`,
    },
  ] satisfies DataSource[]);
  const props: Props = toMap([
    {
      id: "box1$state",
      instanceId: "box1",
      type: "dataSource",
      name: "state",
      value: "box1$state",
    },
    {
      id: "box2$state",
      instanceId: "box2",
      type: "dataSource",
      name: "state",
      value: "box1$state",
    },
    {
      id: "box2$show",
      instanceId: "box2",
      type: "dataSource",
      name: "show",
      value: "box2$stateInitial",
    },
    {
      id: "box2$onChange",
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
    propsStore.set(props);
    dataSourcesStore.set(dataSources);
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
    const [newDataSource1, newDataSource2] = dataSourcesDifference.keys();
    expect(dataSourcesDifference).toEqual(
      toMap([
        {
          ...dataSources.get("box1$state"),
          id: newDataSource1,
          scopeInstanceId: newBox1,
        },
        {
          ...dataSources.get("box2$stateInitial"),
          id: newDataSource2,
          scopeInstanceId: newBox2,
          code: `${encodeDataSourceVariable(newDataSource1)} === 'initial'`,
        },
      ])
    );

    const propsDifference = getMapDifference(props, propsStore.get());
    const [newProp1, newProp2, newProp3, newProp4] = propsDifference.keys();
    expect(propsDifference).toEqual(
      toMap([
        {
          ...props.get("box1$state"),
          id: newProp1,
          instanceId: newBox1,
          value: newDataSource1,
        },
        {
          ...props.get("box2$state"),
          id: newProp2,
          instanceId: newBox2,
          value: newDataSource1,
        },
        {
          ...props.get("box2$show"),
          id: newProp3,
          instanceId: newBox2,
          value: newDataSource2,
        },
        {
          ...props.get("box2$onChange"),
          id: newProp4,
          instanceId: newBox2,
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
          type: "string",
          name: "state",
          value: "initial",
        },
        {
          id: newProp2,
          instanceId: newBox2,
          type: "boolean",
          name: "show",
          value: true,
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

  test.todo(
    "preserve data sources not scoped to new instances within same scope"
  );
});
