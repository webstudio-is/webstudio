import { describe, expect, test } from "vitest";
import type { Instance, WebstudioFragment } from "@webstudio-is/sdk";
import { addInstanceAndProperties } from "./instances-properties";
import type { WfNode } from "./schema";

const createFragment = (): WebstudioFragment => ({
  children: [],
  instances: [],
  props: [],
  dataSources: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
  assets: [],
  breakpoints: [],
  resources: [],
});

const createId = () => {
  let index = 0;
  return () => {
    index += 1;
    return `id-${index}`;
  };
};

describe("addInstanceAndProperties", () => {
  test("converts nested Webflow nodes into Webstudio instances and props", () => {
    const nodes: WfNode[] = [
      {
        _id: "root",
        type: "Block",
        tag: "section",
        classes: [],
        children: ["heading", "text"],
        data: {
          attr: { id: "hero" },
          xattr: [{ name: "data-kind", value: "marketing" }],
        },
      },
      {
        _id: "heading",
        type: "Heading",
        tag: "h1",
        classes: [],
        children: ["heading-text"],
      },
      {
        _id: "heading-text",
        text: true,
        v: "Build faster",
      },
      {
        _id: "text",
        text: true,
        v: " with Webstudio",
      },
    ];
    const wfNodes = new Map(nodes.map((node) => [node._id, node]));
    const doneNodes = new Map<WfNode["_id"], Instance["id"] | false>();
    const fragment = createFragment();

    const rootInstanceId = addInstanceAndProperties(
      nodes[0],
      doneNodes,
      wfNodes,
      fragment,
      createId()
    );

    expect(rootInstanceId).toBe("id-1");
    expect(fragment.instances).toEqual([
      {
        type: "instance",
        id: "id-3",
        component: "Heading",
        tag: "h1",
        children: [{ type: "text", value: "Build faster" }],
      },
      {
        type: "instance",
        id: "id-1",
        component: "Box",
        tag: "section",
        children: [
          { type: "id", value: "id-3" },
          { type: "text", value: " with Webstudio" },
        ],
      },
    ]);
    expect(fragment.props).toEqual([
      {
        type: "string",
        id: "id-2",
        instanceId: "id-1",
        name: "id",
        value: "hero",
      },
      {
        type: "string",
        id: "id-4",
        instanceId: "id-1",
        name: "data-kind",
        value: "marketing",
      },
    ]);
    expect(doneNodes).toEqual(
      new Map([
        ["heading-text", "id-3"],
        ["heading", "id-3"],
        ["text", "id-1"],
        ["root", "id-1"],
      ])
    );
  });

  test("skips unsupported form message nodes and their children", () => {
    const nodes: WfNode[] = [
      {
        _id: "message",
        type: "FormSuccessMessage",
        tag: "div",
        classes: [],
        children: ["message-text"],
      },
      {
        _id: "message-text",
        text: true,
        v: "Success",
      },
    ];
    const wfNodes = new Map(nodes.map((node) => [node._id, node]));
    const doneNodes = new Map<WfNode["_id"], Instance["id"] | false>();
    const fragment = createFragment();

    const result = addInstanceAndProperties(
      nodes[0],
      doneNodes,
      wfNodes,
      fragment,
      createId()
    );

    expect(result).toBeUndefined();
    expect(fragment.instances).toEqual([]);
    expect(doneNodes).toEqual(
      new Map([
        ["message", false],
        ["message-text", false],
      ])
    );
  });
});
