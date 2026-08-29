import { expect, test } from "vitest";
import { $, renderData, ws } from "@webstudio-is/template";
import {
  findChildReferenceIndex,
  findTreeInstanceIds,
  findTreeInstanceIdsExcludingBlockTemplates,
  findTreeInstanceIdsExcludingSubtrees,
  findTreeInstanceIdsExcludingSlotDescendants,
  findParentInstanceReference,
  getHtmlTagsFromProps,
  getHtmlTagFromInstance,
  getIndexesWithinAncestors,
  getInstanceName,
  parseComponentName,
} from "./instances-utils";
import type { WsComponentMeta } from "./schema/component-meta";
import type { Instance } from "./schema/instances";
import type { Prop, Props } from "./schema/props";

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

test("find tree instances excluding complete subtrees", () => {
  const { instances } = renderData(
    <$.Body ws:id="root">
      <$.Box ws:id="hidden">
        <$.Box ws:id="hidden-child"></$.Box>
      </$.Box>
      <$.Box ws:id="visible"></$.Box>
    </$.Body>
  );

  expect(
    findTreeInstanceIdsExcludingSubtrees(instances, "root", new Set(["hidden"]))
  ).toEqual(new Set(["root", "visible"]));
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

test("finds rendered tree instances without traversing block templates", () => {
  const instances = new Map<Instance["id"], Instance>([
    [
      "block",
      {
        type: "instance",
        id: "block",
        component: "ws:block",
        children: [
          { type: "id", value: "templates" },
          { type: "id", value: "body" },
        ],
      },
    ],
    [
      "templates",
      {
        type: "instance",
        id: "templates",
        component: "ws:block-template",
        children: [{ type: "id", value: "template" }],
      },
    ],
    [
      "template",
      {
        type: "instance",
        id: "template",
        component: "ws:element",
        children: [],
      },
    ],
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "ws:element",
        children: [{ type: "id", value: "block" }],
      },
    ],
  ]);

  expect(
    findTreeInstanceIdsExcludingBlockTemplates(instances, "block")
  ).toEqual(new Set(["block", "body"]));
});

test("include not existing/virtual instance", () => {
  const { instances } = renderData(<$.Body ws:id="1"></$.Body>);
  expect(findTreeInstanceIds(instances, ":root")).toEqual(new Set([":root"]));
  expect(
    findTreeInstanceIdsExcludingSlotDescendants(instances, ":root")
  ).toEqual(new Set([":root"]));
});

test("finds the direct parent instance reference", () => {
  const instances = new Map<Instance["id"], Instance>([
    [
      "parent",
      {
        type: "instance",
        id: "parent",
        component: "Box",
        children: [
          { type: "text", value: "before" },
          { type: "id", value: "child" },
        ],
      },
    ],
    [
      "child",
      {
        type: "instance",
        id: "child",
        component: "Box",
        children: [],
      },
    ],
  ]);

  expect(findParentInstanceReference(instances, "child")).toEqual({
    instance: instances.get("parent"),
    childIndex: 1,
  });
  expect(findParentInstanceReference(instances, "missing")).toBeUndefined();
});

test("finds child reference index", () => {
  expect(
    findChildReferenceIndex(
      [
        { type: "text", value: "before" },
        { type: "id", value: "child" },
        { type: "text", value: "after" },
      ],
      "child"
    )
  ).toBe(1);
  expect(
    findChildReferenceIndex([{ type: "text", value: "only" }], "child")
  ).toBe(-1);
});

test("extract short name and namespace from component name", () => {
  expect(parseComponentName("Box")).toEqual([undefined, "Box"]);
  expect(parseComponentName("radix:Box")).toEqual(["radix", "Box"]);
});

test("gets the instance name from user label, element tag, or component", () => {
  expect(
    getInstanceName({
      instance: { component: "Box", label: "Hero Card" },
      metas: new Map([["Box", { label: "Box" }]]),
    })
  ).toBe("Hero Card");
  expect(
    getInstanceName({
      instance: { component: "ws:element", tag: "article" },
      metas: new Map([["ws:element", { label: "Element" }]]),
    })
  ).toBe("<article>");
  expect(
    getInstanceName({
      instance: { component: "custom:HeroCard" },
    })
  ).toBe("HeroCard");
});

test("get html tag from instance", () => {
  const metas = new Map<Instance["component"], WsComponentMeta>([
    ["Box", { presetStyle: { section: [] } }],
    ["XmlNode", { presetStyle: { div: [] } }],
  ]);
  const { instances, props } = renderData(
    <$.Body ws:id="body">
      <$.Box ws:id="meta"></$.Box>
      <$.Box ws:id="prop" ws:tag="article"></$.Box>
      <$.Box ws:id="instance" ws:tag="nav"></$.Box>
      <$.XmlNode ws:id="xml" tag="svg"></$.XmlNode>
    </$.Body>
  );

  expect(
    getHtmlTagFromInstance({
      instance: instances.get("meta") as Instance,
      metas,
      props,
    })
  ).toEqual("section");
  expect(
    getHtmlTagFromInstance({
      instance: instances.get("prop") as Instance,
      metas,
      props,
      htmlTagsByInstanceId: getHtmlTagsFromProps(props),
    })
  ).toEqual("article");
  expect(
    getHtmlTagFromInstance({
      instance: {
        ...(instances.get("instance") as Instance),
        tag: "nav",
      },
      metas,
      props,
    })
  ).toEqual("nav");
  expect(
    getHtmlTagFromInstance({
      instance: instances.get("xml") as Instance,
      metas,
      props,
    })
  ).toBeUndefined();
});

test("gets html tags from props", () => {
  const { props } = renderData(
    <$.Body ws:id="body">
      <$.XmlNode ws:id="xml" tag="svg"></$.XmlNode>
    </$.Body>
  );
  props.set("tag-prop", {
    id: "tag-prop",
    instanceId: "box",
    name: "tag",
    type: "string",
    value: "article",
  });

  expect(getHtmlTagsFromProps(props)).toEqual(
    new Map([
      ["box", "article"],
      ["xml", "svg"],
    ])
  );
});

test("get html tag from instance reads mutable props maps", () => {
  const metas = new Map<Instance["component"], WsComponentMeta>([
    ["Box", { presetStyle: { section: [] } }],
  ]);
  const { instances, props } = renderData(
    <$.Body ws:id="body">
      <$.Box ws:id="box"></$.Box>
    </$.Body>
  );
  const instance = instances.get("box") as Instance;
  props.set("tag-prop", {
    id: "tag-prop",
    instanceId: "box",
    name: "tag",
    type: "string",
    value: "article",
  });

  expect(getHtmlTagFromInstance({ instance, metas, props })).toEqual("article");

  props.set("tag-prop", {
    id: "tag-prop",
    instanceId: "box",
    name: "tag",
    type: "string",
    value: "aside",
  });

  expect(getHtmlTagFromInstance({ instance, metas, props })).toEqual("aside");
});

test("get html tag from instance skips props when instance tag is set", () => {
  const metas = new Map<Instance["component"], WsComponentMeta>([
    ["Box", { presetStyle: { section: [] } }],
  ]);
  const props = new (class extends Map<string, Prop> {
    values(): MapIterator<Prop> {
      throw new Error("props should not be scanned");
    }
  })() as Props;

  expect(
    getHtmlTagFromInstance({
      instance: {
        id: "box",
        type: "instance",
        component: "Box",
        tag: "nav",
        children: [],
      },
      metas,
      props,
    })
  ).toEqual("nav");
});

test("get html tag from instance skips props when provided tag map has no tag", () => {
  const metas = new Map<Instance["component"], WsComponentMeta>([
    ["Box", { presetStyle: { section: [] } }],
  ]);
  const props = new (class extends Map<string, Prop> {
    values(): MapIterator<Prop> {
      throw new Error("props should not be scanned");
    }
  })() as Props;

  expect(
    getHtmlTagFromInstance({
      instance: {
        id: "box",
        type: "instance",
        component: "Box",
        children: [],
      },
      metas,
      props,
      htmlTagsByInstanceId: new Map(),
    })
  ).toEqual("section");
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
    ["TabsList", { indexWithinAncestor: "Tabs" }],
    ["TabsTrigger", { indexWithinAncestor: "TabsList" }],
    ["TabsContent", { indexWithinAncestor: "Tabs" }],
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
    ["TabsTrigger", { indexWithinAncestor: "Tabs" }],
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
