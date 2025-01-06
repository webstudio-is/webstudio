import { test, expect } from "vitest";
import type { Instance, Instances, WsComponentMeta } from "@webstudio-is/sdk";
import { getIndexesWithinAncestors } from "./instance-utils";

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

test("get indexes within ancestors", () => {
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
    ["TabsList", createMeta({ indexWithinAncestor: "Tabs" })],
    ["TabsTrigger", createMeta({ indexWithinAncestor: "TabsList" })],
    ["TabsContent", createMeta({ indexWithinAncestor: "Tabs" })],
  ]);
  expect(getIndexesWithinAncestors(metas, instances, ["body0"])).toEqual(
    new Map([
      ["tabs1list", 0],
      ["tabs1trigger1", 0],
      ["tabs1trigger2", 1],
      ["tabs1content1", 0],
      ["tabs1content2", 1],
      ["tabs2list", 0],
      ["tabs2trigger1", 0],
      ["tabs2content1", 0],
    ])
  );
});
