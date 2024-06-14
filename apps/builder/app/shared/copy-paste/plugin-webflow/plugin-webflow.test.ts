import { test, expect, describe } from "@jest/globals";
import { __testing__ } from "./plugin-webflow";
import { $breakpoints } from "../../nano-states";
import {
  type StyleRule,
  createRegularStyleSheet,
} from "@webstudio-is/css-engine";
import type { WebstudioFragment } from "@webstudio-is/sdk";

const { toWebstudioFragment } = __testing__;

$breakpoints.set(new Map([["0", { id: "0", label: "base" }]]));

const toCss = (fragment: WebstudioFragment) => {
  const sheet = createRegularStyleSheet();

  for (const breakpoint of fragment.breakpoints) {
    sheet.addMediaRule(breakpoint.id, breakpoint);
  }
  const rulesMap = new Map<string, StyleRule>();
  for (const style of fragment.styles) {
    const token = fragment.styleSources.find(
      (source) => source.id === style.styleSourceId
    );
    const name = token && "name" in token ? token.name : "Local";
    let styleRule = rulesMap.get(name);
    if (styleRule === undefined) {
      styleRule = sheet.addStyleRule(
        {
          style: { [style.property]: style.value },
          breakpoint: style.breakpointId,
        },
        name
      );
      rulesMap.set(name, styleRule);
      continue;
    }
    styleRule.styleMap.set(style.property, style.value);
  }
  return sheet.cssText;
};

test("Heading", async () => {
  const fragment = await toWebstudioFragment({
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
      value: expect.any(String),
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
      id: expect.any(String),
      type: "instance",
    },
  ]);
  expect(fragment.props).toEqual([
    {
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "tag",
      type: "string",
      value: "h1",
    },
  ]);
});

test("Link Block, Button, Text Link", async () => {
  const fragment = await toWebstudioFragment({
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
      value: expect.any(String),
    },
  ]);

  expect(fragment.instances).toEqual([
    {
      id: expect.any(String),
      type: "instance",
      component: "Link",
      children: [],
    },
  ]);

  expect(fragment.props).toEqual([
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "href",
      value: "https://webstudio.is",
    },
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "target",
      value: "_blank",
    },
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "tag",
      value: "a",
    },
  ]);
});

test("List and ListItem", async () => {
  const fragment = await toWebstudioFragment({
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
      value: expect.any(String),
    },
  ]);

  expect(fragment.instances).toEqual([
    {
      id: expect.any(String),
      type: "instance",
      component: "ListItem",
      children: [],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "ListItem",
      children: [],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "ListItem",
      children: [],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "List",
      children: [
        { type: "id", value: expect.any(String) },
        { type: "id", value: expect.any(String) },
        { type: "id", value: expect.any(String) },
      ],
    },
  ]);
});

test("Paragraph", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
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
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "tag",
      type: "string",
      value: "p",
    },
  ]);
});

test("Text", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
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
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "tag",
      type: "string",
      value: "div",
    },
  ]);
});

test("Blockquote", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
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
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "tag",
      type: "string",
      value: "blockquote",
    },
  ]);
});

test("Strong", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
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

test("Emphasized", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
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

test("Superscript", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
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

test("Subscript", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
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

test("Section", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("BlockContainer", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("Block", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("V Flex", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("H Flex", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("Quick Stack", async () => {
  const fragment = await toWebstudioFragment({
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
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [
        { type: "id", value: expect.any(String) },
        { type: "id", value: expect.any(String) },
      ],
    },
  ]);
});

test("Grid", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "25ffefdf-c015-5edd-7673-933b41a25328",
          type: "Grid",
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
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [],
    },
  ]);
});

test("Columns", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "08fb88d6-f6ec-5169-f4d4-8dac98df2b58",
          type: "Row",
          tag: "div",
          classes: [],
          children: [
            "08fb88d6-f6ec-5169-f4d4-8dac98df2b59",
            "08fb88d6-f6ec-5169-f4d4-8dac98df2b5a",
          ],
        },
        {
          _id: "08fb88d6-f6ec-5169-f4d4-8dac98df2b59",
          type: "Column",
          tag: "div",
          classes: [],
          children: [],
        },
        {
          _id: "08fb88d6-f6ec-5169-f4d4-8dac98df2b5a",
          type: "Column",
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
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [
        { type: "id", value: expect.any(String) },
        { type: "id", value: expect.any(String) },
      ],
    },
  ]);
});

test("Image", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "3c0b6a7a-830f-4b4a-48c5-4215f9c9389a",
          type: "Image",
          tag: "img",
          classes: [],
          children: [],
          data: {
            attr: {
              src: "https://uploads-ssl.webflow.com/6640ea3496ea68a4a4e3efcf/665dd9f1927826d5caad6ed4_Screenshot%202024-05-29%20at%2023.10.33.png",
              loading: "eager",
              width: "200",
              height: "auto",
              alt: "Test",
            },
          },
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.any(String),
      type: "instance",
      component: "Image",
      children: [],
    },
  ]);

  expect(fragment.props).toEqual([
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "alt",
      value: "Test",
    },
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "loading",
      value: "eager",
    },
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "width",
      value: "200",
    },
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "src",
      value: expect.not.stringMatching("src"),
    },
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "tag",
      value: "img",
    },
  ]);
});

test("HtmlEmbed", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "88131b38-7a58-8085-38d2-dc51c5ce887e",
          type: "HtmlEmbed",
          tag: "div",
          classes: [],
          children: [],
          v: "some html",
        },
      ],
      styles: [],
    },
  });
  expect(fragment.instances).toEqual([
    {
      component: "HtmlEmbed",
      id: expect.any(String),
      type: "instance",
      children: [],
    },
  ]);

  expect(fragment.props).toEqual([
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "code",
      value: "some html",
    },
    {
      type: "boolean",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "clientOnly",
      value: true,
    },
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "tag",
      value: "div",
    },
  ]);
});

test("CodeBlock", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "f06b6679-6414-3592-a6e3-b59196420d7f",
          type: "CodeBlock",
          tag: "div",
          classes: [],
          children: [],
          data: {
            code: "test",
            language: "javascript",
          },
        },
      ],
      styles: [],
    },
  });
  expect(fragment.instances).toEqual([
    {
      component: "CodeText",
      id: expect.any(String),
      type: "instance",
      children: [],
    },
  ]);

  expect(fragment.props).toEqual([
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "lang",
      value: "javascript",
    },
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "code",
      value: "test",
    },
    {
      type: "string",
      id: expect.any(String),
      instanceId: expect.any(String),
      name: "tag",
      value: "div",
    },
  ]);
});

test("RichText", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "58c7368a-83e4-a9c2-e1c9-7244f0473095",
          type: "RichText",
          tag: "div",
          classes: [],
          children: [
            "363e1f05-6da0-65bc-baeb-2a4d6eec67ba",
            "2bf568d0-971f-5925-e6dd-0dd1cc2bc521",
          ],
        },
        {
          _id: "363e1f05-6da0-65bc-baeb-2a4d6eec67ba",
          type: "Heading",
          tag: "h1",
          classes: [],
          children: ["6fe8587d-c2d7-b346-cdef-9e29bb6efd50"],
        },
        {
          _id: "6fe8587d-c2d7-b346-cdef-9e29bb6efd50",
          text: true,
          v: "Heading 1",
        },
        {
          _id: "2bf568d0-971f-5925-e6dd-0dd1cc2bc521",
          type: "Paragraph",
          tag: "p",
          classes: [],
          children: [
            "2a2d8880-03e0-ee0a-cec1-416751acb3e5",
            "14d2b6a0-e2f6-94dd-b593-9d546eee84bf",
            "e9ce86ec-be82-769e-82fb-247480c8d6ba",
            "6c795406-de48-6d53-7d1c-d0ec4756e9d9",
            "528588c5-3733-e1c3-136a-baaf24fcba33",
            "95183c77-8fe7-d0ea-9685-b930608dc373",
            "0f25b98b-6549-5d4e-5e11-7e56558b21e1",
          ],
        },
        {
          _id: "2a2d8880-03e0-ee0a-cec1-416751acb3e5",
          text: true,
          v: "Lorem ",
        },
        {
          _id: "14d2b6a0-e2f6-94dd-b593-9d546eee84bf",
          type: "Link",
          tag: "a",
          classes: [],
          children: ["67af720f-cc2b-567e-d3df-05feef3870ce"],
          data: {
            button: false,
            block: "",
            link: {
              url: "http://google.com",
            },
          },
        },
        {
          _id: "67af720f-cc2b-567e-d3df-05feef3870ce",
          type: "Emphasized",
          tag: "em",
          classes: [],
          children: ["db8be0af-8c03-0785-3b84-f9ae7f4418f5"],
        },
        {
          _id: "db8be0af-8c03-0785-3b84-f9ae7f4418f5",
          text: true,
          v: "ipsum",
        },
        {
          _id: "e9ce86ec-be82-769e-82fb-247480c8d6ba",
          text: true,
          v: " dolor sit ",
        },
        {
          _id: "528588c5-3733-e1c3-136a-baaf24fcba33",
          text: true,
          v: ", ",
        },
        {
          _id: "95183c77-8fe7-d0ea-9685-b930608dc373",
          type: "Strong",
          tag: "strong",
          classes: [],
          children: ["e5bbc823-9dad-bfb7-d448-2e4d9af0be84"],
        },
        {
          _id: "e5bbc823-9dad-bfb7-d448-2e4d9af0be84",
          text: true,
          v: "consectetur",
        },
        {
          _id: "0f25b98b-6549-5d4e-5e11-7e56558b21e1",
          text: true,
          v: " ",
        },
      ],
      styles: [],
    },
  });

  expect(fragment.instances).toEqual([
    {
      id: expect.any(String),
      type: "instance",
      component: "Heading",
      children: [
        {
          type: "text",
          value: "Heading 1",
        },
      ],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "Italic",
      children: [
        {
          type: "text",
          value: "ipsum",
        },
      ],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "Link",
      children: [
        {
          type: "id",
          value: expect.any(String),
        },
      ],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "Bold",
      children: [
        {
          type: "text",
          value: "consectetur",
        },
      ],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "Paragraph",
      children: [
        {
          type: "text",
          value: "Lorem ",
        },
        {
          type: "id",
          value: expect.any(String),
        },
        {
          type: "text",
          value: " dolor sit ",
        },
        {
          type: "text",
          value: ", ",
        },
        {
          type: "id",
          value: expect.any(String),
        },
        {
          type: "text",
          value: " ",
        },
      ],
    },
    {
      id: expect.any(String),
      type: "instance",
      component: "Box",
      children: [
        {
          type: "id",
          value: expect.any(String),
        },
        {
          type: "id",
          value: expect.any(String),
        },
      ],
    },
  ]);
});

describe("Custom attributes", () => {
  test("Basic", async () => {
    const fragment = await toWebstudioFragment({
      type: "@webflow/XscpData",
      payload: {
        nodes: [
          {
            _id: "249f235e-91b6-bd0f-bc42-00993479e637",
            type: "Heading",
            tag: "h1",
            classes: [],
            children: [],
            data: {
              xattr: [
                {
                  name: "at",
                  value: "b",
                },
              ],
            },
          },
        ],
        styles: [],
      },
    });
    expect(fragment.props).toEqual([
      {
        type: "string",
        id: expect.any(String),
        instanceId: expect.any(String),
        name: "tag",
        value: "h1",
      },
      {
        type: "string",
        id: expect.any(String),
        instanceId: expect.any(String),
        name: "at",
        value: "b",
      },
    ]);
  });
});

describe("Styles", () => {
  test("Single class", async () => {
    const fragment = await toWebstudioFragment({
      type: "@webflow/XscpData",
      payload: {
        nodes: [
          {
            _id: "97d91be2-3bba-d340-0f13-a84e975b7497",
            type: "Heading",
            tag: "h1",
            classes: ["a7bff598-b719-1edb-067b-a90a54d68605"],
            children: [],
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
        id: expect.any(String),
        name: "h1",
      },
      {
        type: "token",
        id: expect.any(String),
        name: "Heading",
      },
    ]);
    expect(fragment.styleSourceSelections).toEqual([
      {
        instanceId: expect.any(String),
        values: [expect.any(String), expect.any(String)],
      },
    ]);

    expect(toCss(fragment)).toMatchInlineSnapshot(`
      "@media all {
        h1 {
          margin-right: 0;
          margin-left: 0;
          margin-bottom: 10px;
          font-weight: bold;
          margin-top: 20px;
          font-size: 38px;
          line-height: 44px
        }
        Heading {
          color: rgba(219, 24, 24, 1)
        }
      }"
    `);
  });

  test("Combo class", async () => {
    const fragment = await toWebstudioFragment({
      type: "@webflow/XscpData",
      payload: {
        nodes: [
          {
            _id: "5f7ab979-89b3-c705-6ab9-35f77dfb209f",
            type: "Link",
            tag: "a",
            classes: [
              "194e7d07-469d-6ffa-3925-1f51bdad7e44",
              "194e7d07-469d-6ffa-3925-1f51bdad7e46",
            ],
            children: [],
            data: {
              link: {
                url: "#",
              },
            },
          },
        ],
        styles: [
          {
            _id: "194e7d07-469d-6ffa-3925-1f51bdad7e44",
            type: "class",
            name: "button",
            styleLess: "text-align: center;",
            children: ["194e7d07-469d-6ffa-3925-1f51bdad7e46"],
          },
          {
            _id: "194e7d07-469d-6ffa-3925-1f51bdad7e46",
            type: "class",
            name: "is-secondary",
            comb: "&",
            styleLess: "background-color: transparent; ",
            createdBy: "6075409192d886a671499223",
          },
        ],
      },
    });

    expect(fragment.styleSources).toEqual([
      {
        type: "token",
        id: expect.any(String),
        name: "a",
      },
      {
        type: "token",
        id: expect.any(String),
        name: "button",
      },
      {
        type: "token",
        id: expect.any(String),
        name: "is-secondary",
      },
    ]);
    expect(fragment.styleSourceSelections).toEqual([
      {
        instanceId: expect.any(String),
        values: [expect.any(String), expect.any(String), expect.any(String)],
      },
    ]);

    expect(toCss(fragment)).toMatchInlineSnapshot(`
      "@media all {
        a {
          background-color: rgba(0, 0, 0, 0);
          outline-width: 0;
          outline-style: initial;
          outline-color: initial
        }
        button {
          text-align: center
        }
        is-secondary {
          background-color: transparent
        }
      }"
    `);
  });
});
