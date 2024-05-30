import { test, expect } from "@jest/globals";
import { __testing__ } from "./plugin-webflow";
import { $breakpoints } from "../nano-states";

const { toInstanceData } = __testing__;

$breakpoints.set(new Map([["0", { id: "0", label: "base" }]]));

test("Heading Node", () => {
  const expected = toInstanceData({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "97d91be2-3bba-d340-0f13-a84e975b7497",
          type: "Heading",
          tag: "h1",
          children: ["97d91be2-3bba-d340-0f13-a84e975b7498"],
          classes: [],
        },
        {
          _id: "97d91be2-3bba-d340-0f13-a84e975b7498",
          v: "Turtle in the sea",
          text: true,
        },
      ],
      styles: [],
    },
  });
  expect(expected.children).toEqual([
    {
      type: "id",
      value: expect.not.stringMatching("instanceId"),
    },
  ]);
  expect(expected.instances).toEqual([
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
  ]);
  expect(expected.props).toEqual([
    {
      id: expect.not.stringMatching("id"),
      instanceId: expect.not.stringMatching("instanceId"),
      name: "tag",
      type: "string",
      value: "h1",
    },
  ]);
});

test("List and ListItem", () => {
  const expected = toInstanceData({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "7e11a800-c8e2-9b14-37cf-09a9e94754ad",
          type: "List",
          tag: "ul",
          classes: [],
          children: [
            "7e11a800-c8e2-9b14-37cf-09a9e94754ae",
            "7e11a800-c8e2-9b14-37cf-09a9e94754af",
            "7e11a800-c8e2-9b14-37cf-09a9e94754b0",
          ],
        },
        {
          _id: "7e11a800-c8e2-9b14-37cf-09a9e94754ae",
          type: "ListItem",
          tag: "li",
          classes: [],
          children: [],
        },
        {
          _id: "7e11a800-c8e2-9b14-37cf-09a9e94754af",
          type: "ListItem",
          tag: "li",
          classes: [],
          children: [],
        },
        {
          _id: "7e11a800-c8e2-9b14-37cf-09a9e94754b0",
          type: "ListItem",
          tag: "li",
          classes: [],
          children: [],
        },
      ],
      styles: [],
    },
  });
  expect(expected.children).toEqual([
    {
      type: "id",
      value: expect.not.stringMatching("instanceId"),
    },
  ]);

  expect(expected.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "ListItem",
      children: [],
    },
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "ListItem",
      children: [],
    },
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "ListItem",
      children: [],
    },
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "List",
      children: [
        { type: "id", value: expect.not.stringMatching("instanceId") },
        { type: "id", value: expect.not.stringMatching("instanceId") },
        { type: "id", value: expect.not.stringMatching("instanceId") },
      ],
    },
  ]);
});

test("Heading with styles", () => {
  const expected = toInstanceData({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "97d91be2-3bba-d340-0f13-a84e975b7497",
          type: "Heading",
          tag: "h1",
          classes: [
            "2891ad3d-89de-2434-bedd-51ef56dff4c4",
            "a7bff598-b719-1edb-067b-a90a54d68605",
          ],
          children: ["97d91be2-3bba-d340-0f13-a84e975b7498"],
        },
        {
          _id: "97d91be2-3bba-d340-0f13-a84e975b7498",
          text: true,
          v: "Turtle in the sea",
        },
      ],
      styles: [
        {
          _id: "a7bff598-b719-1edb-067b-a90a54d68605",
          type: "class",
          name: "Heading",
          styleLess: "color: hsla(0, 80.00%, 47.78%, 1.00);",
        },
      ],
    },
  });
  expect(expected.styleSources).toEqual([
    {
      type: "token",
      id: expect.not.stringMatching("styleSourceId"),
      name: "Heading",
    },
  ]);
  expect(expected.styleSourceSelections).toEqual([
    {
      instanceId: expect.not.stringMatching("instanceId"),
      values: [expect.not.stringMatching("styleSourceId")],
    },
  ]);
  expect(expected.styles).toEqual([
    {
      styleSourceId: expect.not.stringMatching("styleSourceId"),
      breakpointId: "0",
      property: "color",
      value: { type: "rgb", alpha: 1, r: 219, g: 24, b: 24 },
    },
  ]);
});
