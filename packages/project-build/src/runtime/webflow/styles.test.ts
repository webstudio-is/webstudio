import { describe, expect, test } from "vitest";
import type { Instance, WebstudioFragment } from "@webstudio-is/sdk";
import { addStyles } from "./styles";
import type { WfAsset, WfNode, WfStyle } from "./schema";

const createFragment = (): WebstudioFragment => ({
  children: [],
  instances: [
    {
      type: "instance",
      id: "instance",
      component: "Box",
      children: [],
    },
  ],
  props: [],
  dataSources: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
  assets: [],
  breakpoints: [],
  resources: [],
});

describe("addStyles", () => {
  test("converts Webflow class styles and attaches existing individual tokens", async () => {
    const node: WfNode = {
      _id: "node",
      type: "Block",
      tag: "div",
      children: [],
      classes: ["class-a", "class-b"],
    };
    const wfStyles = new Map<WfStyle["_id"], WfStyle>([
      [
        "class-a",
        {
          _id: "class-a",
          type: "class",
          name: "Card",
          styleLess: "color: red;",
          variants: {
            medium: { styleLess: "color: blue;" },
          },
        },
      ],
      [
        "class-b",
        {
          _id: "class-b",
          type: "class",
          name: "Featured",
          styleLess: "background-color: black;",
        },
      ],
    ]);
    const fragment = createFragment();

    await addStyles({
      wfNodes: new Map([["node", node]]),
      wfStyles,
      wfAssets: new Map<WfAsset["_id"], WfAsset>(),
      doneNodes: new Map<WfNode["_id"], Instance["id"] | false>([
        ["node", "instance"],
      ]),
      fragment,
      generateStyleSourceId: async (name) => `source:${name}`,
      createId: (() => {
        let index = 0;
        return () => `breakpoint:${++index}`;
      })(),
      existingStyleSourceIds: new Set(["source:Card"]),
    });

    expect(fragment.styleSourceSelections).toEqual([
      {
        instanceId: "instance",
        values: ["source:Card", "source:Card.Featured"],
      },
    ]);
    expect(fragment.styleSources).toEqual([
      {
        type: "token",
        id: "source:Card.Featured",
        name: "Card.Featured",
      },
    ]);
    expect(fragment.breakpoints).toEqual([
      { id: "breakpoint:1", label: "base" },
      { id: "breakpoint:2", label: "medium", maxWidth: 991 },
    ]);
    expect(fragment.styles).toEqual([
      expect.objectContaining({
        styleSourceId: "source:Card.Featured",
        breakpointId: "breakpoint:1",
        property: "color",
        value: { type: "keyword", value: "red" },
      }),
      expect.objectContaining({
        styleSourceId: "source:Card.Featured",
        breakpointId: "breakpoint:1",
        property: "backgroundColor",
        value: { type: "keyword", value: "black" },
      }),
      expect.objectContaining({
        styleSourceId: "source:Card.Featured",
        breakpointId: "breakpoint:2",
        property: "color",
        value: { type: "keyword", value: "blue" },
      }),
    ]);
    expect(fragment.instances[0]?.label).toBe("Card.Featured");
  });
});
