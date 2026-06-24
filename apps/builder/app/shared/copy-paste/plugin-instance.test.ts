import { describe, test, expect } from "vitest";
import { enableMapSet } from "immer";
import type {
  Instance,
  Instances,
  Prop,
  Props,
  DataSource,
  DataSources,
  Resource,
  Resources,
} from "@webstudio-is/sdk";
import {
  encodeDataSourceVariable,
  collectionComponent,
  coreMetas,
  elementComponent,
  portalComponent,
} from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { registerContainers } from "../sync/sync-stores";
import { $registeredComponentMetas } from "../nano-states";
import { $instances } from "~/shared/sync/data-stores";
import {
  $dataSources,
  $pages,
  $project,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { instanceText } from "./plugin-instance";
import { createDefaultPages } from "@webstudio-is/project-build";
import { selectInstance } from "~/shared/nano-states";
import { $selectedPageId } from "../nano-states/pages";
import * as instanceMutationUtils from "../instance-utils/mutation";
import {
  expectSlotTreeIntegrity,
  expectSlotsShareFragment,
} from "../slot-test-utils";

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
  })
);
$selectedPageId.set("home-page");

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

describe("copy and cut guards", () => {
  test("does not copy without a selected instance", () => {
    selectInstance(undefined);

    expect(instanceText.onCopy?.()).toBeUndefined();
  });

  test("does not cut without a selected instance", () => {
    selectInstance(undefined);

    expect(instanceText.onCut?.()).toBeUndefined();
  });

  test("does not copy or cut the selected root instance", () => {
    const instances: Instances = toMap([
      createInstance("body0", "Body", [{ type: "id", value: "box1" }]),
      createInstance("box1", "Box", []),
    ] satisfies Instance[]);
    $instances.set(instances);
    selectInstance(["body0"]);

    expect(instanceText.onCopy?.()).toBeUndefined();
    expect(instanceText.onCut?.()).toBeUndefined();
    expect($instances.get()).toEqual(instances);
  });
});

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

  test("is inside selected instance", async () => {
    $instances.set(instances);
    selectInstance(["box1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["box2", "body0"]);
    await instanceText.onPaste?.(clipboardData);

    const instancesDifference = getMapDifference(instances, $instances.get());
    const [newBox1] = instancesDifference.keys();
    expect($instances.get().get("box2")).toEqual(
      createInstance("box2", "Box", [{ type: "id", value: newBox1 }])
    );
    expect(instancesDifference).toEqual(
      toMap([createInstance(newBox1, "Box", [])])
    );
  });

  test("is after selected instance when same as copied", async () => {
    $instances.set(instances);
    selectInstance(["box1", "body0"]);
    await instanceText.onPaste?.(instanceText.onCopy?.() ?? "");

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

  test("pastes into shared slot content", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "source" },
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("source", "Box", []),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["source", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["slot1", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("pastes into legacy shared slot content", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "source" },
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("source", "Box", []),
        createInstance("slot1", "Slot", [{ type: "id", value: "box" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["source", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["slot1", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("pastes after selected shared slot child in shared slot content", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "fragment", "slot1", "body0"]);

    await instanceText.onPaste?.(instanceText.onCopy?.() ?? "");

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("pastes after selected legacy shared slot child in shared slot content", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("slot2", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("box", "Box", []),
        createInstance("heading", "Heading", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "slot1", "body0"]);

    await instanceText.onPaste?.(instanceText.onCopy?.() ?? "");

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
      { type: "id", value: "heading" },
    ]);
    expectSlotTreeIntegrity($instances.get());
  });

  test("pastes after selected nested shared slot child in shared slot content", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "div" }]),
        createInstance("div", "Box", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "div", "fragment", "slot1", "body0"]);

    await instanceText.onPaste?.(instanceText.onCopy?.() ?? "");

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("pastes into nested shared slot container", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "source" },
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("source", "Box", []),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "div" }]),
        createInstance("div", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["source", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["div", "fragment", "slot1", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("copies shared slot child and pastes independent copy outside", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
          { type: "id", value: "target" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
        createInstance("target", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "fragment", "slot1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["target", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    const pastedBoxId = $instances.get().get("target")?.children[0]?.value;
    expect(pastedBoxId).toEqual(expect.any(String));
    expect(pastedBoxId).not.toBe("box");
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
    expect($instances.get().get(pastedBoxId ?? "")?.children).toEqual([]);
  });

  test("copies legacy shared slot child and pastes independent copy outside", async () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
          { type: "id", value: "target" },
        ]),
        createInstance("slot1", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("slot2", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("box", "Box", []),
        createInstance("heading", "Heading", []),
        createInstance("target", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "slot1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["target", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    const pastedBoxId = $instances.get().get("target")?.children[0]?.value;
    expect(pastedBoxId).toEqual(expect.any(String));
    expect(pastedBoxId).not.toBe("box");
    expect($instances.get().get(pastedBoxId ?? "")?.component).toBe("Box");

    selectInstance(["box", "slot1", "body0"]);
    instanceMutationUtils.convertInstance(elementComponent, "section");

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    expect($instances.get().get("box")?.component).toBe(elementComponent);
    expect($instances.get().get("box")?.tag).toBe("section");
    expect($instances.get().get(pastedBoxId ?? "")?.component).toBe("Box");
  });

  test("copies nested shared slot child with scoped data and pastes independent copy outside", async () => {
    const dataSources: DataSources = toMap([
      {
        id: "boxVariable",
        scopeInstanceId: "box",
        type: "variable",
        name: "Box Variable",
        value: { type: "string", value: "value" },
      },
    ] satisfies DataSource[]);
    const props: Props = toMap([
      {
        id: "boxExpressionProp",
        instanceId: "box",
        name: "children",
        type: "expression",
        value: "$ws$dataSource$boxVariable",
      },
      {
        id: "boxResourceProp",
        instanceId: "box",
        name: "resource",
        type: "resource",
        value: "boxResource",
      },
    ] satisfies Prop[]);
    const resources: Resources = toMap([
      {
        id: "boxResource",
        name: "Box Resource",
        method: "get",
        url: "$ws$dataSource$boxVariable",
        headers: [
          {
            name: "authorization",
            value: "$ws$dataSource$boxVariable",
          },
        ],
        searchParams: [
          {
            name: "query",
            value: "$ws$dataSource$boxVariable",
          },
        ],
      },
    ] satisfies Resource[]);
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
          { type: "id", value: "target" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "div" }]),
        createInstance("div", "Box", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
        createInstance("target", "Box", []),
      ] satisfies Instance[])
    );
    $dataSources.set(dataSources);
    $props.set(props);
    $resources.set(resources);
    selectInstance(["box", "div", "fragment", "slot1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["target", "body0"]);

    await instanceText.onPaste?.(clipboardData);

    const pastedBoxId = $instances.get().get("target")?.children[0]?.value;
    const dataSourcesDifference = getMapDifference(
      dataSources,
      $dataSources.get()
    );
    const [newDataSourceId] = dataSourcesDifference.keys();
    const propsDifference = getMapDifference(props, $props.get());
    const resourcesDifference = getMapDifference(resources, $resources.get());
    const [newResourceId] = resourcesDifference.keys();
    expect(pastedBoxId).toEqual(expect.any(String));
    expect(pastedBoxId).not.toBe("box");
    expect(dataSourcesDifference).toEqual(
      toMap([
        {
          ...dataSources.get("boxVariable"),
          id: newDataSourceId,
          scopeInstanceId: pastedBoxId,
        },
      ])
    );
    expect(Array.from(propsDifference.values())).toEqual(
      expect.arrayContaining([
        {
          id: expectString,
          instanceId: pastedBoxId,
          name: "children",
          type: "expression",
          value: encodeDataSourceVariable(newDataSourceId),
        },
        {
          id: expectString,
          instanceId: pastedBoxId,
          name: "resource",
          type: "resource",
          value: newResourceId,
        },
      ])
    );
    expect(resourcesDifference).toEqual(
      toMap([
        {
          id: newResourceId,
          name: "Box Resource",
          method: "get",
          url: encodeDataSourceVariable(newDataSourceId),
          headers: [
            {
              name: "authorization",
              value: encodeDataSourceVariable(newDataSourceId),
            },
          ],
          searchParams: [
            {
              name: "query",
              value: encodeDataSourceVariable(newDataSourceId),
            },
          ],
        },
      ])
    );
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
  });

  test("cuts shared slot child from all slot occurrences", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "fragment", "slot1", "body0"]);

    expect(instanceText.onCut?.()).toBeDefined();

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([]);
    expect($instances.get().has("box")).toBe(false);
  });

  test("cuts legacy shared slot child from all slot occurrences", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("slot2", "Slot", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("box", "Box", []),
        createInstance("heading", "Heading", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "slot1", "body0"]);

    expect(instanceText.onCut?.()).toBeDefined();

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
    expect($instances.get().has("box")).toBe(false);
  });

  test("cuts nested shared slot child from all slot occurrences", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [{ type: "id", value: "div" }]),
        createInstance("div", "Box", [{ type: "id", value: "box" }]),
        createInstance("box", "Box", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "div", "fragment", "slot1", "body0"]);

    expect(instanceText.onCut?.()).toBeDefined();

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([]);
    expect($instances.get().has("box")).toBe(false);
  });

  test("cuts shared slot child and preserves shared siblings", () => {
    $instances.set(
      toMap([
        createInstance("body0", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
        createInstance("slot1", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("slot2", "Slot", [{ type: "id", value: "fragment" }]),
        createInstance("fragment", "Fragment", [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
        ]),
        createInstance("box", "Box", []),
        createInstance("heading", "Heading", []),
      ] satisfies Instance[])
    );
    selectInstance(["box", "fragment", "slot1", "body0"]);

    expect(instanceText.onCut?.()).toBeDefined();

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
    expect($instances.get().has("box")).toBe(false);
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

  test("are copy pasted when scoped to copied instances", async () => {
    $instances.set(instances);
    $dataSources.set(dataSources);
    $props.set(props);
    selectInstance(["box1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["body0"]);
    await instanceText.onPaste?.(clipboardData);

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

  test("preserve data sources outside of scope when pasted within their scope", async () => {
    $instances.set(instances);
    $props.set(props);
    $dataSources.set(dataSources);
    selectInstance(["box2", "box1", "body0"]);
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["box1", "body0"]);
    await instanceText.onPaste?.(clipboardData);

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

  test("copy parameter prop with new data source", async () => {
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
    const clipboardData = instanceText.onCopy?.() ?? "";
    selectInstance(["body"]);
    await instanceText.onPaste?.(clipboardData);

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

test("when paste into copied instance insert after it", async () => {
  $instances.set(
    toMap([
      createInstance("body", "Body", [{ type: "id", value: "box" }]),
      createInstance("box", "Box", []),
    ])
  );
  selectInstance(["box", "body"]);
  const clipboardData = instanceText.onCopy?.() ?? "";
  await instanceText.onPaste?.(clipboardData);

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

test("prevent pasting portal into own descendants", async () => {
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
  const clipboardData = instanceText.onCopy?.() ?? "";
  selectInstance(["fragment", "portal", "body"]);
  await instanceText.onPaste?.(clipboardData);
  expect($instances.get()).toEqual(instances);
});

test("prevent pasting portal into copy of it", async () => {
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
  selectInstance(["box", "body"]);
  const clipboardData = instanceText.onCopy?.() ?? "";
  selectInstance(["portal", "body"]);
  await instanceText.onPaste?.(clipboardData);
  expect($instances.get()).toEqual(instances);
});

test("insert portal into its sibling", async () => {
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
  const clipboardData = instanceText.onCopy?.() ?? "";
  selectInstance(["sibling", "body"]);
  await instanceText.onPaste?.(clipboardData);

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

test("insert into portal fragment when portal is a target", async () => {
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
  const clipboardData = instanceText.onCopy?.() ?? "";
  selectInstance(["portal", "body"]);

  // fragment not exists
  const prevInstances = $instances.get();
  await instanceText.onPaste?.(clipboardData);
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
  await instanceText.onPaste?.(clipboardData);
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
