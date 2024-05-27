import { test, expect } from "@jest/globals";
import { __testing__ } from "./plugin-webflow";
import { $breakpoints } from "../nano-states";

const { toInstanceData } = __testing__;

$breakpoints.set(new Map([["0", { id: "0", label: "base" }]]));

test("Heading", () => {
  const expected = toInstanceData({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "97d91be2-3bba-d340-0f13-a84e975b7497",
          type: "Heading",
          tag: "h1",
          children: ["97d91be2-3bba-d340-0f13-a84e975b7498"],
        },
        {
          _id: "97d91be2-3bba-d340-0f13-a84e975b7498",
          v: "Turtle in the sea",
          text: true,
        },
      ],
    },
  });
  expect(expected).toEqual({
    assets: [],
    breakpoints: [],
    children: [
      {
        type: "id",
        value: expect.not.stringMatching("pageId"),
      },
    ],
    dataSources: [],
    instances: [
      {
        children: [
          {
            type: "text",
            value: "Turtle in the sea",
          },
        ],
        component: "Heading",
        id: expect.not.stringMatching("id"),
        type: "instance",
      },
    ],
    props: [
      {
        id: expect.not.stringMatching("id"),
        instanceId: expect.not.stringMatching("instanceId"),
        name: "tag",
        type: "string",
        value: "h1",
      },
    ],
    resources: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
  });
});
