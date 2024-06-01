import { test, expect } from "@jest/globals";
import { __testing__ } from "./plugin-webflow";
import { $breakpoints } from "../nano-states";

const { toWebstudioFragment } = __testing__;

$breakpoints.set(new Map([["0", { id: "0", label: "base" }]]));

test("Heading", () => {
  const fragment = toWebstudioFragment({
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
  expect(fragment.children).toEqual([
    {
      type: "id",
      value: expect.not.stringMatching("instanceId"),
    },
  ]);
  expect(fragment.instances).toEqual([
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
  expect(fragment.props).toEqual([
    {
      id: expect.not.stringMatching("id"),
      instanceId: expect.not.stringMatching("instanceId"),
      name: "tag",
      type: "string",
      value: "h1",
    },
  ]);
});

test("Link Block, Button, Text Link", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "97539676-c2ca-2e8f-55f3-6c4a3104a5c0",
          type: "Link",
          tag: "a",
          classes: [],
          children: [],
          data: {
            link: {
              url: "https://webstudio.is",
              target: "_blank",
            },
          },
        },
      ],
      styles: [],
    },
  });
  expect(fragment.children).toEqual([
    {
      type: "id",
      value: expect.not.stringMatching("instanceId"),
    },
  ]);

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Link",
      children: [],
    },
  ]);

  expect(fragment.props).toEqual([
    {
      type: "string",
      id: expect.not.stringMatching("id"),
      instanceId: expect.not.stringMatching("instanceId"),
      name: "tag",
      value: "a",
    },
    {
      type: "string",
      id: expect.not.stringMatching("id"),
      instanceId: expect.not.stringMatching("instanceId"),
      name: "href",
      value: "https://webstudio.is",
    },
    {
      type: "string",
      id: expect.not.stringMatching("id"),
      instanceId: expect.not.stringMatching("instanceId"),
      name: "target",
      value: "_blank",
    },
  ]);
});

test("List and ListItem", () => {
  const fragment = toWebstudioFragment({
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
  expect(fragment.children).toEqual([
    {
      type: "id",
      value: expect.not.stringMatching("instanceId"),
    },
  ]);

  expect(fragment.instances).toEqual([
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

test("Paragraph", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "dfab64ae-6624-b6db-a909-b85588aa3f8d",
          type: "Paragraph",
          tag: "p",
          classes: [],
          children: ["dfab64ae-6624-b6db-a909-b85588aa3f8e"],
        },
        {
          _id: "dfab64ae-6624-b6db-a909-b85588aa3f8e",
          text: true,
          v: "Text in a paragraph",
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Paragraph",
      children: [
        {
          type: "text",
          value: "Text in a paragraph",
        },
      ],
    },
  ]);
  expect(fragment.props).toEqual([
    {
      id: expect.not.stringMatching("id"),
      instanceId: expect.not.stringMatching("instanceId"),
      name: "tag",
      type: "string",
      value: "p",
    },
  ]);
});

test("Text", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "adea2109-96eb-63e0-c27f-632a7f40bce8",
          type: "Block",
          tag: "div",
          classes: [],
          children: ["adea2109-96eb-63e0-c27f-632a7f40bce9"],
          data: {
            text: true,
          },
        },
        {
          _id: "adea2109-96eb-63e0-c27f-632a7f40bce9",
          text: true,
          v: "This is some text inside of a div block.",
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Text",
      children: [
        {
          type: "text",
          value: "This is some text inside of a div block.",
        },
      ],
    },
  ]);
  expect(fragment.props).toEqual([
    {
      id: expect.not.stringMatching("id"),
      instanceId: expect.not.stringMatching("instanceId"),
      name: "tag",
      type: "string",
      value: "div",
    },
  ]);
});

test("Blockquote", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "Blockquote",
          tag: "blockquote",
          classes: [],
          children: ["25ffefdf-c015-5edd-7673-933b41a25329"],
        },
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25329",
          text: true,
          v: "Block Quote",
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Blockquote",
      children: [
        {
          type: "text",
          value: "Block Quote",
        },
      ],
    },
  ]);
  expect(fragment.props).toEqual([
    {
      id: expect.not.stringMatching("id"),
      instanceId: expect.not.stringMatching("instanceId"),
      name: "tag",
      type: "string",
      value: "blockquote",
    },
  ]);
});

test("Strong", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "Strong",
          tag: "strong",
          classes: [],
          children: ["25ffefdf-c015-5edd-7673-933b41a25329"],
        },
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25329",
          text: true,
          v: "Bold Text",
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Bold",
      children: [
        {
          type: "text",
          value: "Bold Text",
        },
      ],
    },
  ]);
});

test("Emphasized", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "Emphasized",
          tag: "em",
          classes: [],
          children: ["25ffefdf-c015-5edd-7673-933b41a25329"],
        },
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25329",
          text: true,
          v: "Emphasis",
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Italic",
      children: [
        {
          type: "text",
          value: "Emphasis",
        },
      ],
    },
  ]);
});

test("Superscript", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "Superscript",
          tag: "sup",
          classes: [],
          children: ["25ffefdf-c015-5edd-7673-933b41a25329"],
        },
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25329",
          text: true,
          v: "Superscript",
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Superscript",
      children: [
        {
          type: "text",
          value: "Superscript",
        },
      ],
    },
  ]);
});

test("Subscript", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "Subscript",
          tag: "sub",
          classes: [],
          children: ["25ffefdf-c015-5edd-7673-933b41a25329"],
        },
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25329",
          text: true,
          v: "Subscript",
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Subscript",
      children: [
        {
          type: "text",
          value: "Subscript",
        },
      ],
    },
  ]);
});

test("Section", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "Section",
          tag: "section",
          classes: [],
          children: ["25ffefdf-c015-5edd-7673-933b41a25329"],
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("BlockContainer", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "BlockContainer",
          tag: "div",
          classes: [],
          children: [],
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("Block", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "Block",
          tag: "div",
          classes: [],
          children: [],
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("V Flex", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "VFlex",
          tag: "div",
          classes: [],
          children: [],
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("H Flex", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "HFlex",
          tag: "div",
          classes: [],
          children: [],
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("Quick Stack", () => {
  const fragment = toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "91782272-bf55-194d-ce85-9ddc69c51dee",
          type: "Layout",
          tag: "div",
          classes: [],
          children: [
            "91782272-bf55-194d-ce85-9ddc69c51def",
            "91782272-bf55-194d-ce85-9ddc69c51df0",
          ],
          data: {
            style: {
              base: {
                main: {
                  noPseudo: {
                    gridTemplateColumns: "1fr 1fr",
                    gridTemplateRows: "auto",
                  },
                },
              },
            },
          },
        },
        {
          _id: "91782272-bf55-194d-ce85-9ddc69c51def",
          type: "Cell",
          tag: "div",
          classes: [],
          children: [],
        },
        {
          _id: "91782272-bf55-194d-ce85-9ddc69c51df0",
          type: "Cell",
          tag: "div",
          classes: [],
          children: [],
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Box",
      children: [],
    },
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Box",
      children: [],
    },
    {
      id: expect.not.stringMatching("instanceId"),
      type: "instance",
      component: "Box",
      children: [
        { type: "id", value: expect.not.stringMatching("instanceId") },
        { type: "id", value: expect.not.stringMatching("instanceId") },
      ],
    },
  ]);
});

test("Basic styles with a class", () => {
  const fragment = toWebstudioFragment({
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
  expect(fragment.styleSources).toEqual([
    {
      type: "token",
      id: expect.not.stringMatching("styleSourceId"),
      name: "Heading",
    },
  ]);
  expect(fragment.styleSourceSelections).toEqual([
    {
      instanceId: expect.not.stringMatching("instanceId"),
      values: [expect.not.stringMatching("styleSourceId")],
    },
  ]);
  expect(fragment.styles).toEqual([
    {
      styleSourceId: expect.not.stringMatching("styleSourceId"),
      breakpointId: "0",
      property: "color",
      value: { type: "rgb", alpha: 1, r: 219, g: 24, b: 24 },
    },
  ]);
});
