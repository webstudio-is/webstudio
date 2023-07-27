import { test, expect } from "@jest/globals";
import type { Instance, Instances } from "@webstudio-is/project-build";
import { getIndexesOfTypeWithinRequiredAncestors } from "./instance-utils";
import type { WsComponentMeta } from ".";

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

const createMeta = (meta?: Partial<WsComponentMeta>) => {
  return { type: "container", label: "", icon: "", ...meta } as const;
};

test("get indexes of type within required ancestors", () => {
  // body0
  //   tabs1
  //     tabs1list
  //       tabs1box
  //         tabs1trigger1
  //         tabs1trigger2
  //     tabs1content1
  //       tabs2
  //         tabs2list
  //           tabs2trigger1
  //         tabs2content1
  //     tabs1content2
  const instances: Instances = toMap([
    createInstance("body0", "Body", [{ type: "id", value: "tabs1" }]),
    // tabs1
    createInstance("tabs1", "Tabs", [
      { type: "id", value: "tabs1list" },
      { type: "id", value: "tabs1content1" },
      { type: "id", value: "tabs1content2" },
    ]),
    createInstance("tabs1list", "TabsList", [
      { type: "id", value: "tabs1box" },
    ]),
    createInstance("tabs1box", "Box", [
      { type: "id", value: "tabs1trigger1" },
      { type: "id", value: "tabs1trigger2" },
    ]),
    createInstance("tabs1trigger1", "TabsTrigger", []),
    createInstance("tabs1trigger2", "TabsTrigger", []),
    createInstance("tabs1content1", "TabsContent", [
      { type: "id", value: "tabs2" },
    ]),
    createInstance("tabs1content2", "TabsContent", []),
    // tabs2
    createInstance("tabs2", "Tabs", [
      { type: "id", value: "tabs2list" },
      { type: "id", value: "tabs2content1" },
    ]),
    createInstance("tabs2list", "TabsList", [
      { type: "id", value: "tabs2trigger1" },
    ]),
    createInstance("tabs2trigger1", "TabsTrigger", []),
    createInstance("tabs2content1", "TabsContent", []),
  ] satisfies Instance[]);
  const metas = new Map<Instance["component"], WsComponentMeta>([
    ["Body", createMeta()],
    ["Box", createMeta()],
    ["Tabs", createMeta()],
    ["TabsList", createMeta({ requiredAncestors: ["Tabs"] })],
    ["TabsTrigger", createMeta({ requiredAncestors: ["TabsList"] })],
    ["TabsContent", createMeta({ requiredAncestors: ["Tabs"] })],
  ]);
  expect(
    getIndexesOfTypeWithinRequiredAncestors(metas, instances, ["body0"])
  ).toEqual(
    new Map([
      ["Tabs:tabs1list", 0],
      ["TabsList:tabs1trigger1", 0],
      ["TabsList:tabs1trigger2", 1],
      ["Tabs:tabs1content1", 0],
      ["Tabs:tabs1content2", 1],
      ["Tabs:tabs2list", 0],
      ["TabsList:tabs2trigger1", 0],
      ["Tabs:tabs2content1", 0],
    ])
  );
});
