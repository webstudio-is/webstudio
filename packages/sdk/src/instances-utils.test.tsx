import { expect, test } from "vitest";
import { $, renderData, ws } from "@webstudio-is/template";
import {
  findTreeInstanceIds,
  findTreeInstanceIdsExcludingSlotDescendants,
  getIndexesWithinAncestors,
  parseComponentName,
} from "./instances-utils";
import type { WsComponentMeta } from "./schema/component-meta";
import type { Instance } from "./schema/instances";

const createMeta = (meta?: Partial<WsComponentMeta>) => {
  return { type: "container", label: "", icon: "", ...meta } as const;
};

test("find all tree instances", () => {
  const { instances } = renderData(
    <$.Body ws:id="1">
      <$.Box ws:id="2"></$.Box>
      <$.Box ws:id="3">
        <$.Box ws:id="4"></$.Box>
        <$.Box ws:id="5"></$.Box>
      </$.Box>
    </$.Body>
  );
  expect(findTreeInstanceIds(instances, "3")).toEqual(new Set(["3", "4", "5"]));
});

test("find all tree instances excluding slot descendants", () => {
  const { instances } = renderData(
    <$.Body ws:id="body">
      <$.Box ws:id="box1">
        <$.Slot ws:id="slot">
          <$.Box ws:id="slotbox1"></$.Box>
          <$.Box ws:id="slotbox2"></$.Box>
        </$.Slot>
        <$.Box ws:id="box2"></$.Box>
      </$.Box>
      <$.Box ws:id="box3"></$.Box>
    </$.Body>
  );
  expect(
    findTreeInstanceIdsExcludingSlotDescendants(instances, "box1")
  ).toEqual(new Set(["box1", "slot", "box2"]));
});

test("include not existing/virtual instance", () => {
  const { instances } = renderData(<$.Body ws:id="1"></$.Body>);
  expect(findTreeInstanceIds(instances, ":root")).toEqual(new Set([":root"]));
  expect(
    findTreeInstanceIdsExcludingSlotDescendants(instances, ":root")
  ).toEqual(new Set([":root"]));
});

test("extract short name and namespace from component name", () => {
  expect(parseComponentName("Box")).toEqual([undefined, "Box"]);
  expect(parseComponentName("radix:Box")).toEqual(["radix", "Box"]);
});

test("get indexes within ancestors", () => {
  const { instances } = renderData(
    <$.Body ws:id="body0">
      <$.Tabs ws:id="tabs1">
        <$.TabsList ws:id="tabs1list">
          <$.Box>
            <$.TabsTrigger ws:id="tabs1trigger1"></$.TabsTrigger>
            <$.TabsTrigger ws:id="tabs1trigger2"></$.TabsTrigger>
          </$.Box>
        </$.TabsList>
        <$.TabsContent ws:id="tabs1content1"></$.TabsContent>
        <$.TabsContent ws:id="tabs1content2">
          <$.Tabs ws:id="tabs2">
            <$.TabsList ws:id="tabs2list">
              <$.TabsTrigger ws:id="tabs2trigger1"></$.TabsTrigger>
            </$.TabsList>
            <$.TabsContent ws:id="tabs2content1"></$.TabsContent>
          </$.Tabs>
        </$.TabsContent>
      </$.Tabs>
    </$.Body>
  );
  const metas = new Map<Instance["component"], WsComponentMeta>([
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
      // reset nested ones
      ["tabs2list", 0],
      ["tabs2trigger1", 0],
      ["tabs2content1", 0],
    ])
  );
});

test("ignore ws:block-template when compute indexes within ancestors", () => {
  const BlockTemplate = ws["block-template"];
  const { instances } = renderData(
    <$.Body ws:id="body0">
      <$.Tabs>
        <BlockTemplate>
          <$.TabsTrigger ws:id="trigger1"></$.TabsTrigger>
        </BlockTemplate>
        <$.TabsTrigger ws:id="trigger2"></$.TabsTrigger>
        <$.TabsTrigger ws:id="trigger3"></$.TabsTrigger>
      </$.Tabs>
    </$.Body>
  );
  const metas = new Map<Instance["component"], WsComponentMeta>([
    ["TabsTrigger", createMeta({ indexWithinAncestor: "Tabs" })],
  ]);
  expect(getIndexesWithinAncestors(metas, instances, ["body0"])).toEqual(
    new Map([
      ["trigger2", 0],
      ["trigger3", 1],
      // reset the one inside of block template
      ["trigger1", 0],
    ])
  );
});
