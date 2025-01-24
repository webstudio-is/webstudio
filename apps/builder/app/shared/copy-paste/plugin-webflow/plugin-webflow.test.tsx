import type { JSX } from "react";
import { test, expect, describe, beforeEach } from "vitest";
import { nanoid } from "nanoid";
import {
  type NestingRule,
  createRegularStyleSheet,
} from "@webstudio-is/css-engine";
import {
  initialBreakpoints,
  type WebstudioFragment,
  type Instance,
} from "@webstudio-is/sdk";
import { $, renderData } from "@webstudio-is/template";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import { __testing__ } from "./plugin-webflow";
import {
  $breakpoints,
  $project,
  $registeredComponentMetas,
  $styleSources,
  $styles,
} from "../../nano-states";
import invariant from "tiny-invariant";
import { WfData } from "./schema";

const { toWebstudioFragment } = __testing__;

const equalFragment = (fragment: WebstudioFragment, jsx: JSX.Element) => {
  const fragmentInstances = new Map();
  fragment.instances.forEach((instance: Instance) => {
    const newId = expect.any(String) as unknown as string;
    fragmentInstances.set(newId, {
      ...instance,
      id: newId,
      children: instance.children.map((child) => {
        if (child.type === "text") {
          return child;
        }
        return { type: "id", value: expect.any(String) as unknown as string };
      }),
    });
  });

  const expected = renderData(jsx);

  const expectedInstances = new Map();
  for (const instance of expected.instances.values()) {
    expectedInstances.set(instance.id, instance);
  }
  const fragmentProps = new Map();
  for (const prop of fragment.props) {
    prop.id = expect.any(String) as unknown as string;
    prop.instanceId = expect.any(String) as unknown as string;
    fragmentProps.set(prop.id, prop);
  }
  const expectedProps = new Map();
  for (const prop of expected.props.values()) {
    prop.id = expect.any(String) as unknown as string;
    prop.instanceId = expect.any(String) as unknown as string;
    expectedProps.set(prop.id, prop);
  }
  //console.dir(fragmentInstances, { depth: null });
  //console.dir(expectedInstances, { depth: null });
  //console.dir(expectedProps, { depth: null });
  expect(fragmentInstances).toEqual(expectedInstances);
  expect(fragmentProps).toEqual(expectedProps);
};

const toCss = (fragment: WebstudioFragment) => {
  const sheet = createRegularStyleSheet();
  for (const breakpoint of fragment.breakpoints) {
    sheet.addMediaRule(breakpoint.id, breakpoint);
  }
  const ruleByStyleSourceId = new Map<string, NestingRule>();
  for (const styleDecl of fragment.styleSources) {
    const name = styleDecl.type === "token" ? styleDecl.name : "Local";
    const rule = sheet.addNestingRule(name);
    ruleByStyleSourceId.set(styleDecl.id, rule);
  }
  for (const styleDecl of fragment.styles) {
    const rule = ruleByStyleSourceId.get(styleDecl.styleSourceId);
    rule?.setDeclaration({
      breakpoint: styleDecl.breakpointId,
      selector: styleDecl.state ?? "",
      property: styleDecl.property,
      value: styleDecl.value,
    });
  }
  return sheet.cssText;
};

beforeEach(() => {
  const defaultMetasMap = new Map(Object.entries(defaultMetas));
  $registeredComponentMetas.set(defaultMetasMap);
  $project.set({
    id: "test",
    createdAt: "",
    domain: "",
    title: "",
    userId: "",
    isDeleted: false,
    previewImageAsset: null,
    marketplaceApprovalStatus: "PENDING",
    latestStaticBuild: null,
    domainsVirtual: [],
    latestBuildVirtual: null,
    previewImageAssetId: null,
  });

  $breakpoints.set(
    new Map(
      initialBreakpoints.map((breakpoint) => {
        const id = nanoid();
        return [id, { ...breakpoint, id }];
      })
    )
  );
});

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
      assets: [],
    },
  });

  equalFragment(fragment, <$.Heading tag="h1">Turtle in the sea</$.Heading>);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      h1 {
        margin-top: 20px;
        margin-right: 0;
        margin-bottom: 10px;
        margin-left: 0;
        font-size: 38px;
        font-weight: bold;
        line-height: 44px
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Link href="https://webstudio.is" target="_blank" />
  );
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      a {
        background-color: rgba(0, 0, 0, 0)
      }
      a:active {
        outline: 0 none currentcolor
      }
      a:hover {
        outline: 0 none currentcolor
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.List>
      <$.ListItem />
      <$.ListItem />
      <$.ListItem />
    </$.List>
  );

  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      ul {
        margin-top: 0;
        margin-bottom: 10px;
        padding-left: 40px
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(fragment, <$.Paragraph>Text in a paragraph</$.Paragraph>);

  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      p {
        margin-top: 0;
        margin-bottom: 10px
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Text>This is some text inside of a div block.</$.Text>
  );

  expect(toCss(fragment)).toMatchInlineSnapshot(`""`);
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
      assets: [],
    },
  });

  equalFragment(fragment, <$.Blockquote>Block Quote</$.Blockquote>);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      blockquote {
        margin-top: 0;
        margin-right: 0;
        margin-bottom: 10px;
        margin-left: 0;
        padding-top: 10px;
        padding-right: 20px;
        padding-bottom: 10px;
        padding-left: 20px;
        font-size: 18px;
        line-height: 22px;
        border-left: 5px solid rgba(226, 226, 226, 1)
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(fragment, <$.Bold>Bold Text</$.Bold>);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      strong {
        font-weight: bold
      }
    }"
  `);
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
      assets: [],
    },
  });
  equalFragment(fragment, <$.Italic>Emphasis</$.Italic>);
  expect(toCss(fragment)).toMatchInlineSnapshot(`""`);
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
      assets: [],
    },
  });

  equalFragment(fragment, <$.Superscript>Superscript</$.Superscript>);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      sup {
        vertical-align: baseline;
        font-size: 75%;
        line-height: 0;
        position: relative;
        top: -0.5em
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(fragment, <$.Subscript>Subscript</$.Subscript>);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      sub {
        vertical-align: baseline;
        font-size: 75%;
        line-height: 0;
        position: relative;
        bottom: -0.25em
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(fragment, <$.Box tag="section" />);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      section {
        display: block
      }
    }"
  `);
});

test("Figure", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "7c6bc1fd-128d-514b-167b-605a910e435c",
          type: "Block",
          tag: "figure",
          classes: [],
          children: [],
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(fragment, <$.Box tag="figure" />);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      figure {
        display: block;
        margin-top: 0;
        margin-right: 0;
        margin-bottom: 10px;
        margin-left: 0
      }
    }"
  `);
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
      assets: [],
    },
  });
  equalFragment(fragment, <$.Box />);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-layout-blockcontainer {
        max-width: 940px;
        margin-left: auto;
        margin-right: auto;
        display: block
      }
      w-container {
        max-width: 940px;
        margin-left: auto;
        margin-right: auto
      }
      w-container:after {
        content: " ";
        grid-row-start: 1;
        grid-column-start: 1;
        grid-row-end: 2;
        grid-column-end: 2;
        display: table;
        clear: both
      }
      w-container:before {
        content: " ";
        grid-row-start: 1;
        grid-column-start: 1;
        grid-row-end: 2;
        grid-column-end: 2;
        display: table
      }
    }
    @media all and (max-width: 991px) {
      w-layout-blockcontainer {
        max-width: 728px
      }
      w-container {
        max-width: 728px
      }
    }
    @media all and (max-width: 767px) {
      w-layout-blockcontainer {
        max-width: none
      }
    }
    @media all and (max-width: 479px) {
      w-container {
        max-width: none
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(fragment, <$.Box />);
  expect(toCss(fragment)).toMatchInlineSnapshot(`""`);
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
      assets: [],
    },
  });
  equalFragment(fragment, <$.Box />);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-layout-vflex {
        flex-direction: column;
        align-items: flex-start;
        display: flex
      }
    }"
  `);
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
      assets: [],
    },
  });
  equalFragment(fragment, <$.Box />);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-layout-hflex {
        flex-direction: row;
        align-items: flex-start;
        display: flex
      }
    }"
  `);
});

test("QuickStack with instance styles", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "aeb3895f-67c9-b5a0-69b4-7960b893ec04",
          type: "Layout",
          tag: "div",
          classes: [],
          children: [
            "ca264069-ff87-c2e5-7dc0-a4c0ec0e9146",
            "ec30cdfd-1a60-eeb0-1bfa-1df6f1956ed5",
          ],
          data: {
            style: {
              base: {
                main: {
                  noPseudo: {
                    gridTemplateColumns: "1fr 1fr",
                    gridTemplateRows: "auto",
                    order: 1,
                  },
                },
              },
            },
          },
        },
        {
          _id: "ca264069-ff87-c2e5-7dc0-a4c0ec0e9146",
          type: "Cell",
          tag: "div",
          classes: [],
          children: [],
        },
        {
          _id: "ec30cdfd-1a60-eeb0-1bfa-1df6f1956ed5",
          type: "Cell",
          tag: "div",
          classes: [],
          children: [],
        },
      ],
      styles: [],
      assets: [],
    },
  });
  equalFragment(
    fragment,
    <$.Box>
      <$.Box />
      <$.Box />
    </$.Box>
  );
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-layout-layout {
        row-gap: 20px;
        column-gap: 20px;
        grid-auto-columns: 1fr;
        justify-content: center;
        padding: 20px
      }
      wf-layout-layout {
        display: grid
      }
      Local {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto;
        order: 1
      }
      w-layout-cell {
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
        display: flex
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(fragment, <$.Box />);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-layout-grid {
        row-gap: 16px;
        column-gap: 16px;
        grid-template-rows: auto auto;
        grid-template-columns: 1fr 1fr;
        grid-auto-columns: 1fr;
        display: grid
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Box>
      <$.Box />
      <$.Box />
    </$.Box>
  );
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-row:after {
        content: " ";
        grid-row-start: 1;
        grid-column-start: 1;
        grid-row-end: 2;
        grid-column-end: 2;
        display: table;
        clear: both
      }
      w-row:before {
        content: " ";
        grid-row-start: 1;
        grid-column-start: 1;
        grid-row-end: 2;
        grid-column-end: 2;
        display: table
      }
      w-col {
        float: left;
        width: 100%;
        min-height: 1px;
        padding-left: 10px;
        padding-right: 10px;
        position: relative
      }
    }
    @media all and (max-width: 767px) {
      w-row {
        margin-left: 0;
        margin-right: 0
      }
      w-col {
        width: 100%;
        left: auto;
        right: auto
      }
    }
    @media all and (max-width: 479px) {
      w-col {
        width: 100%
      }
    }"
  `);
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
              src: "https://test.com/image.jpg",
              loading: "eager",
              width: "200",
              height: "auto",
              alt: "Test",
            },
          },
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Image
      alt="Test"
      loading="eager"
      width="200"
      src="https://test.com/image.jpg"
    />
  );
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      img {
        vertical-align: middle;
        max-width: 100%;
        display: inline-block;
        border: 0 none currentcolor
      }
    }"
  `);
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
      assets: [],
    },
  });
  equalFragment(fragment, <$.HtmlEmbed code="some html" clientOnly={true} />);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-embed {
        display: block
      }
      w-embed:after {
        content: " ";
        grid-row-start: 1;
        grid-column-start: 1;
        grid-row-end: 2;
        grid-column-end: 2;
        display: table;
        clear: both
      }
      w-embed:before {
        content: " ";
        grid-row-start: 1;
        grid-column-start: 1;
        grid-row-end: 2;
        grid-column-end: 2;
        display: table
      }
    }"
  `);
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
      assets: [],
    },
  });

  equalFragment(fragment, <$.CodeText lang="javascript" code="test" />);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-code-block {
        margin-top: unset;
        margin-right: unset;
        margin-bottom: unset;
        margin-left: unset
      }
    }"
  `);
});

test("RichText", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "33178bae-2d99-7d1f-ffa5-101356769dad",
          type: "RichText",
          tag: "div",
          classes: [],
          children: [
            "8418336b-918d-3160-1d76-8c9de474cb43",
            "63929533-a4de-17c6-3b13-351aa16c6e10",
            "7724e6e0-9e3c-4526-35a9-f11dcd628c35",
            "d760a6fd-5da7-7d24-4f4c-24e68a651758",
            "49c71aa2-c61b-4823-dfdb-dc3badea814b",
            "28784747-282c-fe17-a81b-c36c9212b78e",
            "6e4c4ff0-0ebe-1de0-d94d-6f18f08f0762",
            "88e7fd8c-98ff-49f7-aff1-3286e2e0e211",
            "63202791-9c33-bc97-b49e-71a2af805488",
            "b386cecd-1697-e7e8-6c7b-66f36261fec2",
            "98b880aa-7ba5-c754-8069-b83cb198ec32",
            "2e3bf379-e9ee-182c-9f92-1e1409ba1dd7",
            "43d15a61-5f5d-d4bd-4a8c-04b80371e808",
            "676d66b8-3df9-45a5-b2a4-62b75b623443",
            "57268510-0593-b1df-7786-f1f3b3d02830",
            "cd959e82-0fe8-a4a7-6b9f-c5fab19aa6ec",
            "10389bae-2b31-83d5-919f-45fc50689288",
          ],
        },
        {
          _id: "8418336b-918d-3160-1d76-8c9de474cb43",
          type: "Heading",
          tag: "h1",
          classes: [],
          children: ["c1759a8a-6657-5c74-4e95-33c8a721caab"],
        },
        {
          _id: "c1759a8a-6657-5c74-4e95-33c8a721caab",
          text: true,
          v: "Heading 1",
        },
        {
          _id: "63929533-a4de-17c6-3b13-351aa16c6e10",
          type: "Heading",
          tag: "h2",
          classes: [],
          children: ["d04d84bb-f382-5af4-482a-e6a0aaab168b"],
        },
        {
          _id: "d04d84bb-f382-5af4-482a-e6a0aaab168b",
          text: true,
          v: "Heading 2",
        },
        {
          _id: "7724e6e0-9e3c-4526-35a9-f11dcd628c35",
          type: "Heading",
          tag: "h3",
          classes: [],
          children: ["409d9647-ea51-e048-2bfd-cbbee2efb0c6"],
        },
        {
          _id: "409d9647-ea51-e048-2bfd-cbbee2efb0c6",
          text: true,
          v: "Heading 3",
        },
        {
          _id: "d760a6fd-5da7-7d24-4f4c-24e68a651758",
          type: "Heading",
          tag: "h4",
          classes: [],
          children: ["4ce7fd9b-c7e9-186c-853a-931c507e5d1d"],
        },
        {
          _id: "4ce7fd9b-c7e9-186c-853a-931c507e5d1d",
          text: true,
          v: "Heading 4",
        },
        {
          _id: "49c71aa2-c61b-4823-dfdb-dc3badea814b",
          type: "Heading",
          tag: "h5",
          classes: [],
          children: ["f28abd5f-e21c-08f5-c6be-ec335166114d"],
        },
        {
          _id: "f28abd5f-e21c-08f5-c6be-ec335166114d",
          text: true,
          v: "Heading 5",
        },
        {
          _id: "28784747-282c-fe17-a81b-c36c9212b78e",
          type: "Heading",
          tag: "h6",
          classes: [],
          children: ["6f753bba-a1d9-5092-e605-2f1756fc4a3d"],
        },
        {
          _id: "6f753bba-a1d9-5092-e605-2f1756fc4a3d",
          text: true,
          v: "Heading 6",
        },
        {
          _id: "6e4c4ff0-0ebe-1de0-d94d-6f18f08f0762",
          type: "Paragraph",
          tag: "p",
          classes: [],
          children: ["27e847ff-962c-0782-1278-2f4ff342aaad"],
        },
        {
          _id: "27e847ff-962c-0782-1278-2f4ff342aaad",
          text: true,
          v: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        },
        {
          _id: "88e7fd8c-98ff-49f7-aff1-3286e2e0e211",
          type: "Blockquote",
          tag: "blockquote",
          classes: [],
          children: ["9c1d38a3-512b-4f90-e6c4-cadf585cb608"],
        },
        {
          _id: "9c1d38a3-512b-4f90-e6c4-cadf585cb608",
          text: true,
          v: "Block quote",
        },
        {
          _id: "63202791-9c33-bc97-b49e-71a2af805488",
          type: "Paragraph",
          tag: "p",
          classes: [],
          children: ["3080a095-fc1a-9de8-e6d1-21c801aed169"],
        },
        {
          _id: "3080a095-fc1a-9de8-e6d1-21c801aed169",
          text: true,
          v: "Ordered list",
        },
        {
          _id: "b386cecd-1697-e7e8-6c7b-66f36261fec2",
          type: "List",
          tag: "ol",
          classes: [],
          children: [
            "aafe8235-0ff4-c6f4-8382-40fc34900b75",
            "0fd98471-33b6-e8d2-76f1-6e373849e6ba",
            "2ccfda89-a200-d286-440a-f94699163329",
          ],
        },
        {
          _id: "aafe8235-0ff4-c6f4-8382-40fc34900b75",
          type: "ListItem",
          tag: "li",
          classes: [],
          children: ["bf312343-69b6-bec7-5ee1-e19154d85b62"],
        },
        {
          _id: "bf312343-69b6-bec7-5ee1-e19154d85b62",
          text: true,
          v: "Item 1",
        },
        {
          _id: "0fd98471-33b6-e8d2-76f1-6e373849e6ba",
          type: "ListItem",
          tag: "li",
          classes: [],
          children: ["161683ac-eed6-7a68-64f7-706c42984c65"],
        },
        {
          _id: "161683ac-eed6-7a68-64f7-706c42984c65",
          text: true,
          v: "Item 2",
        },
        {
          _id: "2ccfda89-a200-d286-440a-f94699163329",
          type: "ListItem",
          tag: "li",
          classes: [],
          children: ["59f4270b-72e6-99b1-041a-5ab836481b5c"],
        },
        {
          _id: "59f4270b-72e6-99b1-041a-5ab836481b5c",
          text: true,
          v: "Item 3",
        },
        {
          _id: "98b880aa-7ba5-c754-8069-b83cb198ec32",
          type: "Paragraph",
          tag: "p",
          classes: [],
          children: ["b6755218-5a0d-c537-43c0-071245d7a472"],
        },
        {
          _id: "b6755218-5a0d-c537-43c0-071245d7a472",
          text: true,
          v: "Unordered list",
        },
        {
          _id: "2e3bf379-e9ee-182c-9f92-1e1409ba1dd7",
          type: "List",
          tag: "ul",
          classes: [],
          children: [
            "a90c5835-61e2-e1e6-dfd3-0b02a34ad857",
            "748eb739-12d7-26fc-b8ee-f2c460f35170",
            "54178296-1686-9b14-a341-42ce51958ce5",
          ],
        },
        {
          _id: "a90c5835-61e2-e1e6-dfd3-0b02a34ad857",
          type: "ListItem",
          tag: "li",
          classes: [],
          children: ["8557d8cf-09de-52c0-4631-c2123fc056d1"],
        },
        {
          _id: "8557d8cf-09de-52c0-4631-c2123fc056d1",
          text: true,
          v: "Item A",
        },
        {
          _id: "748eb739-12d7-26fc-b8ee-f2c460f35170",
          type: "ListItem",
          tag: "li",
          classes: [],
          children: ["666b664d-8023-50bb-453a-36017c7a3a38"],
        },
        {
          _id: "666b664d-8023-50bb-453a-36017c7a3a38",
          text: true,
          v: "Item B",
        },
        {
          _id: "54178296-1686-9b14-a341-42ce51958ce5",
          type: "ListItem",
          tag: "li",
          classes: [],
          children: ["15647123-fd1c-5928-3894-d666bc6f3c84"],
        },
        {
          _id: "15647123-fd1c-5928-3894-d666bc6f3c84",
          text: true,
          v: "Item C",
        },
        {
          _id: "43d15a61-5f5d-d4bd-4a8c-04b80371e808",
          type: "Paragraph",
          tag: "p",
          classes: [],
          children: ["db8cce1a-40ff-ccb7-5f18-ebb811777409"],
        },
        {
          _id: "db8cce1a-40ff-ccb7-5f18-ebb811777409",
          type: "Link",
          tag: "a",
          classes: [],
          children: ["a8af1cd8-157c-4b92-c27e-bca1ae5e6668"],
          data: {
            button: false,
            block: "",
            link: {
              url: "https://university.webflow.com/lesson/add-and-nest-text-links-in-webflow",
            },
          },
        },
        {
          _id: "a8af1cd8-157c-4b92-c27e-bca1ae5e6668",
          text: true,
          v: "Text link",
        },
        {
          _id: "676d66b8-3df9-45a5-b2a4-62b75b623443",
          type: "Paragraph",
          tag: "p",
          classes: [],
          children: ["4f0b961b-5774-f441-e97f-e84a75efcf08"],
        },
        {
          _id: "4f0b961b-5774-f441-e97f-e84a75efcf08",
          type: "Strong",
          tag: "strong",
          classes: [],
          children: ["5839c9b9-4281-f778-f7f9-c4844452295e"],
        },
        {
          _id: "5839c9b9-4281-f778-f7f9-c4844452295e",
          text: true,
          v: "Bold text",
        },
        {
          _id: "57268510-0593-b1df-7786-f1f3b3d02830",
          type: "Paragraph",
          tag: "p",
          classes: [],
          children: ["db4e59e1-b859-d2bc-ee4a-08c638f088db"],
        },
        {
          _id: "db4e59e1-b859-d2bc-ee4a-08c638f088db",
          type: "Emphasized",
          tag: "em",
          classes: [],
          children: ["c2661284-144d-5052-447a-ffe78f3b8bbe"],
        },
        {
          _id: "c2661284-144d-5052-447a-ffe78f3b8bbe",
          text: true,
          v: "Emphasis",
        },
        {
          _id: "cd959e82-0fe8-a4a7-6b9f-c5fab19aa6ec",
          type: "Paragraph",
          tag: "p",
          classes: [],
          children: ["debd47f8-ddd2-8ead-af6c-5e42a16e15d0"],
        },
        {
          _id: "debd47f8-ddd2-8ead-af6c-5e42a16e15d0",
          type: "Superscript",
          tag: "sup",
          classes: [],
          children: ["e6640190-f224-5a57-6181-55a793c00da8"],
        },
        {
          _id: "e6640190-f224-5a57-6181-55a793c00da8",
          text: true,
          v: "Superscript",
        },
        {
          _id: "10389bae-2b31-83d5-919f-45fc50689288",
          type: "Paragraph",
          tag: "p",
          classes: [],
          children: ["ec162f35-9226-0e8a-c0c2-32685ef444c1"],
        },
        {
          _id: "ec162f35-9226-0e8a-c0c2-32685ef444c1",
          type: "Subscript",
          tag: "sub",
          classes: [],
          children: ["dcdc8f43-3cdc-1522-e397-60968e378b92"],
        },
        {
          _id: "dcdc8f43-3cdc-1522-e397-60968e378b92",
          text: true,
          v: "Subscript",
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Box>
      <$.Heading tag="h1">Heading 1</$.Heading>
      <$.Heading tag="h2">Heading 2</$.Heading>
      <$.Heading tag="h3">Heading 3</$.Heading>
      <$.Heading tag="h4">Heading 4</$.Heading>
      <$.Heading tag="h5">Heading 5</$.Heading>
      <$.Heading tag="h6">Heading 6</$.Heading>
      <$.Paragraph>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
        commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
        velit esse cillum dolore eu fugiat nulla pariatur.
      </$.Paragraph>
      <$.Blockquote>Block quote</$.Blockquote>
      <$.Paragraph>Ordered list</$.Paragraph>
      <$.List ordered={true}>
        <$.ListItem>Item 1</$.ListItem>
        <$.ListItem>Item 2</$.ListItem>
        <$.ListItem>Item 3</$.ListItem>
      </$.List>
      <$.Paragraph>Unordered list</$.Paragraph>
      <$.List>
        <$.ListItem>Item A</$.ListItem>
        <$.ListItem>Item B</$.ListItem>
        <$.ListItem>Item C</$.ListItem>
      </$.List>
      <$.Paragraph>
        <$.Link href="https://university.webflow.com/lesson/add-and-nest-text-links-in-webflow">
          Text link
        </$.Link>
      </$.Paragraph>
      <$.Paragraph>
        <$.Bold>Bold text</$.Bold>
      </$.Paragraph>
      <$.Paragraph>
        <$.Italic>Emphasis</$.Italic>
      </$.Paragraph>
      <$.Paragraph>
        <$.Superscript>Superscript</$.Superscript>
      </$.Paragraph>
      <$.Paragraph>
        <$.Subscript>Subscript</$.Subscript>
      </$.Paragraph>
    </$.Box>
  );
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      h1 {
        margin-top: 20px;
        margin-right: 0;
        margin-bottom: 10px;
        margin-left: 0;
        font-size: 38px;
        font-weight: bold;
        line-height: 44px
      }
      h2 {
        margin-bottom: 10px;
        font-weight: bold;
        margin-top: 20px;
        font-size: 32px;
        line-height: 36px
      }
      h3 {
        margin-bottom: 10px;
        font-weight: bold;
        margin-top: 20px;
        font-size: 24px;
        line-height: 30px
      }
      h4 {
        margin-bottom: 10px;
        font-weight: bold;
        margin-top: 10px;
        font-size: 18px;
        line-height: 24px
      }
      h5 {
        margin-bottom: 10px;
        font-weight: bold;
        margin-top: 10px;
        font-size: 14px;
        line-height: 20px
      }
      h6 {
        margin-bottom: 10px;
        font-weight: bold;
        margin-top: 10px;
        font-size: 12px;
        line-height: 18px
      }
      p {
        margin-top: 0;
        margin-bottom: 10px
      }
      blockquote {
        margin-top: 0;
        margin-right: 0;
        margin-bottom: 10px;
        margin-left: 0;
        padding-top: 10px;
        padding-right: 20px;
        padding-bottom: 10px;
        padding-left: 20px;
        font-size: 18px;
        line-height: 22px;
        border-left: 5px solid rgba(226, 226, 226, 1)
      }
      ol {
        margin-top: 0;
        margin-bottom: 10px;
        padding-left: 40px
      }
      ul {
        margin-top: 0;
        margin-bottom: 10px;
        padding-left: 40px
      }
      a {
        background-color: rgba(0, 0, 0, 0)
      }
      a:active {
        outline: 0 none currentcolor
      }
      a:hover {
        outline: 0 none currentcolor
      }
      strong {
        font-weight: bold
      }
      sup {
        vertical-align: baseline;
        font-size: 75%;
        line-height: 0;
        position: relative;
        top: -0.5em
      }
      sub {
        vertical-align: baseline;
        font-size: 75%;
        line-height: 0;
        position: relative;
        bottom: -0.25em
      }
    }"
  `);
});

test("Form", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "f19c775e-a9ef-fd0c-2d16-aa53c69e9da4",
          type: "FormWrapper",
          tag: "div",
          classes: [],
          children: [
            "11c85957-89b5-e4f8-da11-f1acb4223a9f",
            "492633d9-7425-ba09-036f-e43213b9875b",
            "a0877638-7523-ac57-7ed9-19f5469e79d1",
          ],
        },
        {
          _id: "11c85957-89b5-e4f8-da11-f1acb4223a9f",
          type: "FormForm",
          tag: "form",
          classes: [],
          children: ["eeb469a5-8b03-8002-7dec-586856365387"],
        },
        {
          _id: "eeb469a5-8b03-8002-7dec-586856365387",
          type: "FormTextInput",
          tag: "input",
          classes: [],
          children: [],
          data: {
            attr: {
              id: "name",
              name: "name",
              maxlength: 256,
              placeholder: "",
              disabled: false,
              type: "text",
              required: false,
              autofocus: false,
            },
          },
        },
        {
          _id: "492633d9-7425-ba09-036f-e43213b9875b",
          type: "FormSuccessMessage",
          tag: "div",
          classes: [],
          children: ["442d7e86-2c77-961c-ab1b-431bd34abcf7"],
        },
        {
          _id: "442d7e86-2c77-961c-ab1b-431bd34abcf7",
          type: "Block",
          tag: "div",
          classes: [],
          children: ["875baf7f-6c98-b379-0cbe-59b5fdd2c112"],
        },
        {
          _id: "875baf7f-6c98-b379-0cbe-59b5fdd2c112",
          text: true,
          v: "Thank you! Your submission has been received!",
        },
        {
          _id: "a0877638-7523-ac57-7ed9-19f5469e79d1",
          type: "FormErrorMessage",
          tag: "div",
          classes: [],
          children: ["9eaf0a19-b2fa-7aef-4825-41f6319d790d"],
        },
        {
          _id: "9eaf0a19-b2fa-7aef-4825-41f6319d790d",
          type: "Block",
          tag: "div",
          classes: [],
          children: ["a87685fe-24b2-31ff-e229-40c71f6155dd"],
        },
        {
          _id: "a87685fe-24b2-31ff-e229-40c71f6155dd",
          text: true,
          v: "Oops! Something went wrong while submitting the form.",
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Box>
      <$.Box>
        <$.Input
          id="name"
          name="name"
          maxLength={256}
          placeholder=""
          disabled={false}
          type="text"
          required={false}
          autoFocus={false}
        />
      </$.Box>
    </$.Box>
  );
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-form {
        margin-top: 0;
        margin-right: 0;
        margin-bottom: 15px;
        margin-left: 0
      }
      input {
        color: inherit;
        font-style: inherit;
        font-variant-caps: inherit;
        font-weight: inherit;
        font-stretch: inherit;
        font-size: inherit;
        line-height: normal;
        font-family: inherit;
        appearance: button;
        cursor: pointer;
        box-sizing: border-box;
        height: auto;
        margin: 0;
        padding: 0
      }
      input::-moz-focus-inner {
        border: 0 none currentcolor;
        padding: 0
      }
      w-input {
        color: rgba(51, 51, 51, 1);
        vertical-align: middle;
        background-color: rgba(238, 238, 238, 1);
        width: 100%;
        height: auto;
        margin-bottom: 10px;
        padding-top: 8px;
        padding-right: 12px;
        padding-bottom: 8px;
        padding-left: 12px;
        font-size: 14px;
        line-height: 1.42857;
        display: block;
        cursor: not-allowed;
        border: 1px solid rgba(204, 204, 204, 1)
      }
      w-input:-moz-placeholder {
        color: rgba(153, 153, 153, 1)
      }
      w-input::-moz-placeholder {
        color: rgba(153, 153, 153, 1);
        opacity: 1
      }
      w-input::-webkit-input-placeholder {
        color: rgba(153, 153, 153, 1)
      }
      w-input:focus {
        border-top-color: rgba(56, 152, 236, 1);
        border-right-color: rgba(56, 152, 236, 1);
        border-bottom-color: rgba(56, 152, 236, 1);
        border-left-color: rgba(56, 152, 236, 1);
        outline: 0 none currentcolor
      }
    }"
  `);
});

test("FormButton", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "b7d4b56c-77eb-a79d-4b73-7802d6c5f74a",
          type: "FormButton",
          tag: "input",
          classes: [],
          children: [],
          data: {
            attr: {
              value: "Submit",
            },
          },
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(fragment, <$.Button>Submit</$.Button>);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      input {
        color: inherit;
        font-style: inherit;
        font-variant-caps: inherit;
        font-weight: inherit;
        font-stretch: inherit;
        font-size: inherit;
        line-height: normal;
        font-family: inherit;
        appearance: button;
        cursor: pointer;
        box-sizing: border-box;
        height: auto;
        margin: 0;
        padding: 0
      }
      input::-moz-focus-inner {
        border: 0 none currentcolor;
        padding: 0
      }
      w-button {
        color: rgba(255, 255, 255, 1);
        line-height: inherit;
        cursor: pointer;
        background-color: rgba(56, 152, 236, 1);
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        padding-top: 9px;
        padding-right: 15px;
        padding-bottom: 9px;
        padding-left: 15px;
        text-decoration-line: none;
        text-decoration-style: solid;
        text-decoration-color: currentcolor;
        display: inline-block;
        appearance: button;
        border: 0 none currentcolor
      }
    }"
  `);
});

test("FormTextInput", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "3b60c6c7-296c-f98b-0557-a55dcac084b3",
          type: "FormTextInput",
          tag: "input",
          classes: [],
          children: [],
          data: {
            attr: {
              id: "email",
              name: "email",
              maxlength: 256,
              placeholder: "",
              disabled: false,
              type: "email",
              required: true,
              autofocus: false,
            },
          },
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Input
      id="email"
      name="email"
      maxLength={256}
      placeholder=""
      disabled={false}
      type="email"
      required={true}
      autoFocus={false}
    />
  );
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      input {
        color: inherit;
        font-style: inherit;
        font-variant-caps: inherit;
        font-weight: inherit;
        font-stretch: inherit;
        font-size: inherit;
        line-height: normal;
        font-family: inherit;
        appearance: button;
        cursor: pointer;
        box-sizing: border-box;
        height: auto;
        margin: 0;
        padding: 0
      }
      input::-moz-focus-inner {
        border: 0 none currentcolor;
        padding: 0
      }
      w-input {
        color: rgba(51, 51, 51, 1);
        vertical-align: middle;
        background-color: rgba(238, 238, 238, 1);
        width: 100%;
        height: auto;
        margin-bottom: 10px;
        padding-top: 8px;
        padding-right: 12px;
        padding-bottom: 8px;
        padding-left: 12px;
        font-size: 14px;
        line-height: 1.42857;
        display: block;
        cursor: not-allowed;
        border: 1px solid rgba(204, 204, 204, 1)
      }
      w-input:-moz-placeholder {
        color: rgba(153, 153, 153, 1)
      }
      w-input::-moz-placeholder {
        color: rgba(153, 153, 153, 1);
        opacity: 1
      }
      w-input::-webkit-input-placeholder {
        color: rgba(153, 153, 153, 1)
      }
      w-input:focus {
        border-top-color: rgba(56, 152, 236, 1);
        border-right-color: rgba(56, 152, 236, 1);
        border-bottom-color: rgba(56, 152, 236, 1);
        border-left-color: rgba(56, 152, 236, 1);
        outline: 0 none currentcolor
      }
    }"
  `);
});

test("FormBlockLabel", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "0fdc679b-9891-dfb3-698a-0114d0c6c729",
          type: "FormBlockLabel",
          tag: "label",
          classes: [],
          children: ["7827c7aa-cd90-8bda-4570-605f2a1a0d61"],
          data: {
            attr: {
              for: "email",
            },
          },
        },
        {
          _id: "7827c7aa-cd90-8bda-4570-605f2a1a0d61",
          text: true,
          v: "Email Address",
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(fragment, <$.Label htmlFor="email">Email Address</$.Label>);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      label {
        margin-bottom: 5px;
        font-weight: bold;
        display: block
      }
    }"
  `);
});

test("FormTextarea", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "ff81988e-1cc2-8c93-d264-d702d846c30a",
          type: "FormTextarea",
          tag: "textarea",
          classes: [],
          children: [],
          data: {
            attr: {
              id: "field",
              name: "field",
              maxlength: 5000,
              placeholder: "Example Text",
              required: false,
              autofocus: false,
            },
          },
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Textarea
      id="field"
      name="field"
      maxLength={5000}
      placeholder="Example Text"
      required={false}
      autoFocus={false}
    />
  );

  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      textarea {
        color: inherit;
        font-style: inherit;
        font-variant-caps: inherit;
        font-weight: inherit;
        font-stretch: inherit;
        font-size: inherit;
        line-height: inherit;
        font-family: inherit;
        overflow-x: auto;
        overflow-y: auto;
        height: auto;
        margin: 0
      }
      w-input {
        color: rgba(51, 51, 51, 1);
        vertical-align: middle;
        background-color: rgba(238, 238, 238, 1);
        width: 100%;
        height: auto;
        margin-bottom: 10px;
        padding-top: 8px;
        padding-right: 12px;
        padding-bottom: 8px;
        padding-left: 12px;
        font-size: 14px;
        line-height: 1.42857;
        display: block;
        cursor: not-allowed;
        border: 1px solid rgba(204, 204, 204, 1)
      }
      w-input:-moz-placeholder {
        color: rgba(153, 153, 153, 1)
      }
      w-input::-moz-placeholder {
        color: rgba(153, 153, 153, 1);
        opacity: 1
      }
      w-input::-webkit-input-placeholder {
        color: rgba(153, 153, 153, 1)
      }
      w-input:focus {
        border-top-color: rgba(56, 152, 236, 1);
        border-right-color: rgba(56, 152, 236, 1);
        border-bottom-color: rgba(56, 152, 236, 1);
        border-left-color: rgba(56, 152, 236, 1);
        outline: 0 none currentcolor
      }
    }"
  `);
});

test("FormBlockLabel", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "0fdc679b-9891-dfb3-698a-0114d0c6c729",
          type: "FormBlockLabel",
          tag: "label",
          classes: [],
          children: ["7827c7aa-cd90-8bda-4570-605f2a1a0d61"],
          data: {
            attr: {
              for: "email",
            },
          },
        },
        {
          _id: "7827c7aa-cd90-8bda-4570-605f2a1a0d61",
          text: true,
          v: "Email Address",
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(fragment, <$.Label htmlFor="email">Email Address</$.Label>);
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      label {
        margin-bottom: 5px;
        font-weight: bold;
        display: block
      }
    }"
  `);
});

test("FormCheckboxWrapper, FormCheckboxInput, FormInlineLabel", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "4b49f914-6011-9030-5727-232bbddc7d56",
          type: "FormCheckboxWrapper",
          tag: "div",
          classes: [],
          children: [
            "2e32acc8-7027-1741-1be1-cc72606b57cf",
            "3f68e88d-5c03-698e-c4e2-a6ad6ff1a00c",
          ],
        },
        {
          _id: "2e32acc8-7027-1741-1be1-cc72606b57cf",
          type: "FormCheckboxInput",
          tag: "input",
          classes: [],
          children: [],
          data: {
            attr: {
              type: "checkbox",
              name: "checkbox",
              id: "checkbox",
              required: false,
              checked: false,
            },
          },
        },
        {
          _id: "3f68e88d-5c03-698e-c4e2-a6ad6ff1a00c",
          type: "FormInlineLabel",
          tag: "label",
          classes: [],
          children: ["18550f45-3a50-27d6-4524-b91a226ded60"],
        },
        {
          _id: "18550f45-3a50-27d6-4524-b91a226ded60",
          text: true,
          v: "Checkbox",
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Label ws:label="Checkbox Field">
      <$.Checkbox
        id="checkbox"
        name="checkbox"
        required={false}
        defaultChecked={false}
      />
      <$.Text tag="span" ws:label="Label">
        Checkbox
      </$.Text>
    </$.Label>
  );
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-checkbox {
        margin-bottom: 5px;
        padding-left: 20px;
        display: block
      }
      w-checkbox:after {
        content: " ";
        clear: both;
        grid-row-start: 1;
        grid-column-start: 1;
        grid-row-end: 2;
        grid-column-end: 2;
        display: table
      }
      w-checkbox:before {
        content: " ";
        grid-row-start: 1;
        grid-column-start: 1;
        grid-row-end: 2;
        grid-column-end: 2;
        display: table
      }
      input {
        color: inherit;
        font-style: inherit;
        font-variant-caps: inherit;
        font-weight: inherit;
        font-stretch: inherit;
        font-size: inherit;
        line-height: normal;
        font-family: inherit;
        appearance: button;
        cursor: pointer;
        box-sizing: border-box;
        height: auto;
        margin: 0;
        padding: 0
      }
      input::-moz-focus-inner {
        border: 0 none currentcolor;
        padding: 0
      }
      w-checkbox-input {
        float: left;
        margin-top: 4px;
        margin-right: 0;
        margin-bottom: 0;
        margin-left: -20px;
        line-height: normal
      }
      label {
        margin-bottom: 5px;
        font-weight: bold;
        display: block
      }
      w-form-label {
        cursor: pointer;
        margin-bottom: 0;
        font-weight: normal;
        display: inline-block
      }
    }"
  `);
});

test("FormRadioWrapper, FormRadioInput, FormInlineLabel", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "712915f3-84e7-6e7a-e1a1-050e12d3b401",
          type: "FormRadioWrapper",
          tag: "div",
          classes: [],
          children: [
            "2ee7bcbb-e2ec-3c21-2cb0-c76171ff84e0",
            "99874ce0-e582-a5ea-9934-f6e42266a80d",
          ],
        },
        {
          _id: "2ee7bcbb-e2ec-3c21-2cb0-c76171ff84e0",
          type: "FormRadioInput",
          tag: "input",
          classes: [],
          children: [],
          data: {
            attr: {
              type: "radio",
              name: "radio",
              id: "radio",
              value: "Radio",
              required: false,
            },
          },
        },
        {
          _id: "99874ce0-e582-a5ea-9934-f6e42266a80d",
          type: "FormInlineLabel",
          tag: "label",
          classes: [],
          children: ["9e6a0451-a55e-a063-9acc-ee22ed5eac94"],
        },
        {
          _id: "9e6a0451-a55e-a063-9acc-ee22ed5eac94",
          text: true,
          v: "Radio",
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Label ws:label="Radio Field">
      <$.RadioButton id="radio" name="radio" required={false} value="Radio" />
      <$.Text tag="span" ws:label="Label">
        Radio
      </$.Text>
    </$.Label>
  );
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      w-radio {
        margin-bottom: 5px;
        padding-left: 20px;
        display: block
      }
      w-radio:after {
        content: " ";
        grid-row-start: 1;
        grid-column-start: 1;
        grid-row-end: 2;
        grid-column-end: 2;
        display: table;
        clear: both
      }
      w-radio:before {
        content: " ";
        grid-row-start: 1;
        grid-column-start: 1;
        grid-row-end: 2;
        grid-column-end: 2;
        display: table
      }
      input {
        color: inherit;
        font-style: inherit;
        font-variant-caps: inherit;
        font-weight: inherit;
        font-stretch: inherit;
        font-size: inherit;
        line-height: normal;
        font-family: inherit;
        appearance: button;
        cursor: pointer;
        box-sizing: border-box;
        height: auto;
        margin: 0;
        padding: 0
      }
      input::-moz-focus-inner {
        border: 0 none currentcolor;
        padding: 0
      }
      w-radio-input {
        float: left;
        margin-top: 3px;
        margin-right: 0;
        margin-bottom: 0;
        margin-left: -20px;
        line-height: normal
      }
      label {
        margin-bottom: 5px;
        font-weight: bold;
        display: block
      }
      w-form-label {
        cursor: pointer;
        margin-bottom: 0;
        font-weight: normal;
        display: inline-block
      }
    }"
  `);
});

test("FormSelect", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "a68c34ca-e4c3-3dbc-0036-2554387bd7a4",
          type: "FormSelect",
          tag: "select",
          classes: [],
          children: [],
          data: {
            form: {
              opts: [
                {
                  t: "Select one...",
                  v: "",
                },
                {
                  t: "First choice",
                  v: "First",
                },
                {
                  t: "Second choice",
                  v: "Second",
                },
                {
                  t: "Third choice",
                  v: "Third",
                },
              ],
            },
            attr: {
              id: "field-3",
              name: "field-3",
              required: false,
              multiple: false,
            },
          },
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Input id="field-3" name="field-3" required={false} multiple={false} />
  );
  expect(toCss(fragment)).toMatchInlineSnapshot(`
    "@media all {
      select {
        color: inherit;
        font-style: inherit;
        font-variant-caps: inherit;
        font-weight: inherit;
        font-stretch: inherit;
        font-size: inherit;
        line-height: inherit;
        font-family: inherit;
        text-transform: none;
        margin: 0
      }
    }"
  `);
});

test("Multiline text", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "da7b8e40-a038-735c-bde8-0016079a5502",
          type: "Block",
          tag: "div",
          classes: [],
          children: [
            "629fa602-de2f-b70b-ba5e-a74de823cfff",
            "b6a2a455-8ece-d70b-c88b-2f7b7dd39445",
            "49a4d697-0430-6739-9179-e75c1dbec765",
          ],
        },
        {
          _id: "629fa602-de2f-b70b-ba5e-a74de823cfff",
          text: true,
          v: "a",
        },
        {
          _id: "b6a2a455-8ece-d70b-c88b-2f7b7dd39445",
          type: "LineBreak",
          tag: "br",
          classes: [],
          children: [],
        },
        {
          _id: "49a4d697-0430-6739-9179-e75c1dbec765",
          text: true,
          v: "b",
        },
      ],
      styles: [],
      assets: [],
    },
  });

  equalFragment(
    fragment,
    <$.Box>
      {"a"}
      {"\n"}
      {"b"}
    </$.Box>
  );

  expect(toCss(fragment)).toMatchInlineSnapshot(`""`);
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
        assets: [],
      },
    });
    equalFragment(fragment, <$.Heading tag="h1" at="b" />);
    expect(toCss(fragment)).toMatchInlineSnapshot(`
      "@media all {
        h1 {
          margin-top: 20px;
          margin-right: 0;
          margin-bottom: 10px;
          margin-left: 0;
          font-size: 38px;
          font-weight: bold;
          line-height: 44px
        }
      }"
    `);
  });
});

test("Set show false when visibility's only condition is false", async () => {
  const fragment = await toWebstudioFragment({
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: "b35ac1a9-5a38-56c6-03ba-3196d421b95e",
          type: "Block",
          tag: "div",
          classes: [],
          children: [],
          data: {
            visibility: {
              conditions: [false],
            },
          },
        },
      ],
      styles: [],
      assets: [],
    },
  });
  equalFragment(fragment, <$.Box data-ws-show={false} />);
  expect(toCss(fragment)).toMatchInlineSnapshot(`""`);
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
        assets: [],
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
          margin-top: 20px;
          margin-right: 0;
          margin-bottom: 10px;
          margin-left: 0;
          font-size: 38px;
          font-weight: bold;
          line-height: 44px
        }
        Heading {
          color: rgba(219, 24, 24, 1)
        }
      }"
    `);
  });

  test("Combo class", async () => {
    $styleSources.set(
      new Map([
        [
          "uuBw1PRC_uE8RhTmwxaH8",
          {
            id: "uuBw1PRC_uE8RhTmwxaH8",
            type: "token",
            name: "button",
          },
        ],
        [
          "uuORexg4BOrRXBJZgB80_",
          {
            id: "uuORexg4BOrRXBJZgB80_",
            type: "token",
            name: "button.is-small",
          },
        ],
      ])
    );
    $styles.set(
      new Map([
        [
          "uuBw1PRC_uE8RhTmwxaH8",
          {
            styleSourceId: "uuBw1PRC_uE8RhTmwxaH8",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "green" },
          },
        ],
        [
          "uuORexg4BOrRXBJZgB80_0",
          {
            styleSourceId: "uuORexg4BOrRXBJZgB80_",
            breakpointId: "base",
            property: "paddingTop",
            value: { type: "unit", unit: "rem", value: 1 },
          },
        ],
      ])
    );

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
              "194e7d07-469d-6ffa-3925-1f51bdad7e47",
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
            children: [
              "194e7d07-469d-6ffa-3925-1f51bdad7e47",
              "194e7d07-469d-6ffa-3925-1f51bdad7e46",
            ],
          },
          {
            _id: "194e7d07-469d-6ffa-3925-1f51bdad7e47",
            type: "class",
            name: "is-small",
            comb: "&",
            styleLess: "padding: 1rem;",
          },
          {
            _id: "194e7d07-469d-6ffa-3925-1f51bdad7e46",
            type: "class",
            name: "is-secondary",
            comb: "&",
            styleLess: "background-color: transparent;",
          },
        ],
        assets: [],
      },
    });

    expect(fragment.styleSources).toEqual([
      {
        type: "token",
        id: "uu1p3Xdvlq_AZOxnzDvAv",
        name: "a",
      },
      {
        type: "token",
        id: "uumXb7vHOnzTr-4SIW-wJ",
        name: "button.is-small.is-secondary",
      },
    ]);
    expect(fragment.styleSourceSelections).toEqual([
      {
        instanceId: expect.any(String),
        values: [
          "uu1p3Xdvlq_AZOxnzDvAv",
          "uuBw1PRC_uE8RhTmwxaH8",
          "uumXb7vHOnzTr-4SIW-wJ",
          "uuORexg4BOrRXBJZgB80_",
        ],
      },
    ]);

    expect(toCss(fragment)).toMatchInlineSnapshot(`
      "@media all {
        a {
          background-color: rgba(0, 0, 0, 0)
        }
        a:active {
          outline: 0 none currentcolor
        }
        a:hover {
          outline: 0 none currentcolor
        }
        button.is-small.is-secondary {
          text-align: center;
          background-color: transparent;
          padding: 1rem
        }
      }"
    `);
  });

  test("Skip empty combo class", async () => {
    const fragment = await toWebstudioFragment({
      type: "@webflow/XscpData",
      payload: {
        nodes: [
          {
            _id: "56ede23d-6dcc-a320-0af4-3a803d8efd88",
            type: "Block",
            tag: "div",
            classes: ["08c3532a-4e88-1106-9fda-e4dcd66f93f0"],
            children: [
              "d06c01f8-da59-b31e-a910-55a6d33898f0",
              "b67fb4c4-ce52-b441-1d89-55b165282c99",
            ],
          },
          {
            _id: "d06c01f8-da59-b31e-a910-55a6d33898f0",
            type: "Block",
            tag: "div",
            classes: ["6569b562-7de4-bd09-3d2d-59d7c11ec988"],
            children: [],
          },
          {
            _id: "b67fb4c4-ce52-b441-1d89-55b165282c99",
            type: "Block",
            tag: "div",
            classes: [
              "08c3532a-4e88-1106-9fda-e4dcd66f93f0",
              "c4851546-799d-c6bf-fb17-0b5765f48d72",
            ],
            children: [],
          },
        ],
        styles: [
          {
            _id: "08c3532a-4e88-1106-9fda-e4dcd66f93f0",
            fake: false,
            type: "class",
            name: "d1",
            namespace: "",
            comb: "",
            styleLess: "color: hsla(0, 70.45%, 48.11%, 1.00);",
            variants: {},
            children: ["c4851546-799d-c6bf-fb17-0b5765f48d72"],
          },
          {
            _id: "6569b562-7de4-bd09-3d2d-59d7c11ec988",
            fake: false,
            type: "class",
            name: "d2",
            namespace: "",
            comb: "",
            styleLess: "font-size: 200px;",
            variants: {},
            children: [],
          },
          {
            _id: "c4851546-799d-c6bf-fb17-0b5765f48d72",
            fake: false,
            type: "class",
            name: "d2",
            namespace: "",
            comb: "&",
            styleLess: "",
            variants: {},
            children: [],
          },
        ],
        assets: [],
      },
    });

    expect(toCss(fragment)).toMatchInlineSnapshot(`
      "@media all {
        d1 {
          color: rgba(209, 36, 36, 1)
        }
        d2 {
          font-size: 200px
        }
      }"
    `);
  });

  test("Webflow @variable syntax used by Relume (legacy?)", async () => {
    const fragment = await toWebstudioFragment({
      type: "@webflow/XscpData",
      payload: {
        nodes: [
          {
            _id: "5f7ab979-89b3-c705-6ab9-35f77dfb209f",
            type: "Block",
            tag: "div",
            classes: ["194e7d07-469d-6ffa-3925-1f51bdad7e44"],
            children: [],
          },
        ],
        styles: [
          {
            _id: "194e7d07-469d-6ffa-3925-1f51bdad7e44",
            type: "class",
            name: "block",
            styleLess: "color: @var_relume-variable-color-neutral-1",
            children: [],
          },
        ],
        assets: [],
      },
    });

    expect(toCss(fragment)).toMatchInlineSnapshot(`
      "@media all {
        block {
          color: unset
        }
      }"
    `);
  });

  test("States", async () => {
    const fragment = await toWebstudioFragment({
      type: "@webflow/XscpData",
      payload: {
        nodes: [
          {
            _id: "5c66aeeb-941d-c52f-8e14-c54312878021",
            type: "Link",
            tag: "a",
            classes: ["81cf331a-ed88-7a5f-3538-8915c7788aea"],
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
            _id: "81cf331a-ed88-7a5f-3538-8915c7788aea",
            fake: false,
            type: "class",
            name: "x",
            namespace: "",
            comb: "",
            styleLess: "transform: translate3d(7px, 74px, 16px);",
            variants: {
              main_hover: {
                styleLess: "background-color: hsla(0, 85.19%, 42.12%, 1.00);",
              },
              tiny_focus: {
                styleLess: "background-color: hsla(264, 73.75%, 38.37%, 1.00);",
              },
              tiny_active: {
                styleLess: "background-color: hsla(0, 46.06%, 51.80%, 1.00);",
              },
              "tiny_focus-visible": {
                styleLess: "background-color: hsla(264, 36.36%, 41.56%, 1.00);",
              },
              tiny_visited: {
                styleLess: "background-color: hsla(0, 83.67%, 42.10%, 1.00);",
              },
              tiny_hover: {
                styleLess: "background-color: hsla(0, 60.99%, 58.99%, 1.00);",
              },
            },
          },
        ],
        assets: [],
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
        name: "x",
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
        a {
          background-color: rgba(0, 0, 0, 0)
        }
        a:active {
          outline: 0 none currentcolor
        }
        a:hover {
          outline: 0 none currentcolor
        }
        x {
          transform: translate3d(7px, 74px, 16px)
        }
        x:hover {
          background-color: rgba(199, 16, 16, 1)
        }
      }
      @media all and (max-width: 479px) {
        x:active {
          background-color: rgba(189, 75, 75, 1)
        }
        x:focus {
          background-color: rgba(83, 26, 170, 1)
        }
        x:focus-visible {
          background-color: rgba(98, 67, 145, 1)
        }
        x:hover {
          background-color: rgba(214, 87, 87, 1)
        }
        x:visited {
          background-color: rgba(197, 18, 18, 1)
        }
      }"
    `);
  });

  test("Breakpoints", async () => {
    const fragment = await toWebstudioFragment({
      type: "@webflow/XscpData",
      payload: {
        nodes: [
          {
            _id: "c06c94aa-e2cd-fa7a-d8f8-574b474a20fa",
            type: "Block",
            tag: "div",
            classes: ["81fbefba-d2de-9cc2-81bf-3a929d4eb219"],
            children: [],
          },
        ],
        styles: [
          {
            _id: "81fbefba-d2de-9cc2-81bf-3a929d4eb219",
            fake: false,
            type: "class",
            name: "Div Block 2",
            namespace: "",
            comb: "",
            styleLess: "background-color: hsla(191, 100.00%, 50.00%, 1.00);",
            variants: {
              large: {
                styleLess:
                  "background-color: hsla(150, 100.00%, 50.00%, 1.00);",
              },
              xl: {
                styleLess: "",
              },
              medium: {
                styleLess:
                  "background-color: hsla(256, 100.00%, 50.00%, 1.00);",
              },
              small: {
                styleLess:
                  "background-color: hsla(308, 100.00%, 50.00%, 1.00);",
              },
              tiny: {
                styleLess:
                  "background-color: hsla(359, 100.00%, 50.00%, 1.00);",
              },
            },
          },
        ],
        assets: [],
      },
    });

    expect(fragment.breakpoints).toEqual([
      { id: expect.any(String), label: "base" },
      { id: expect.any(String), label: "large", minWidth: 1280 },
      { id: expect.any(String), label: "medium", maxWidth: 991 },
      { id: expect.any(String), label: "small", maxWidth: 767 },
      { id: expect.any(String), label: "tiny", maxWidth: 479 },
    ]);

    expect(toCss(fragment)).toMatchInlineSnapshot(`
      "@media all {
        Div Block 2 {
          background-color: rgba(0, 208, 255, 1)
        }
      }
      @media all and (max-width: 991px) {
        Div Block 2 {
          background-color: rgba(68, 0, 255, 1)
        }
      }
      @media all and (max-width: 767px) {
        Div Block 2 {
          background-color: rgba(255, 0, 221, 1)
        }
      }
      @media all and (max-width: 479px) {
        Div Block 2 {
          background-color: rgba(255, 0, 4, 1)
        }
      }
      @media all and (min-width: 1280px) {
        Div Block 2 {
          background-color: rgba(0, 255, 128, 1)
        }
      }"
    `);
  });

  test("background images", async () => {
    const input = WfData.parse({
      type: "@webflow/XscpData",
      payload: {
        nodes: [
          {
            _id: "2e9842a4-ac18-9d21-894b-026c6eb20441",
            type: "Block",
            tag: "div",
            classes: ["98133834-439c-9a8c-7e9f-c3186f2fa45f"],
            children: [],
            data: {
              text: false,
            },
          },
        ],
        styles: [
          {
            _id: "98133834-439c-9a8c-7e9f-c3186f2fa45f",
            fake: false,
            type: "class",
            name: "Div Block",
            namespace: "",
            comb: "",
            styleLess:
              "height: 400px; background-image: linear-gradient(180deg, hsla(0, 0.00%, 0.00%, 0.11), white), @img_667d0b7769e0cc3754b584f6, @img_667d0fe180995eadc1534a26, @img_example_bg; background-position: 0px 0px, 550px 0px, 0px 0px,0px 0px; background-size: auto, contain, auto, auto; background-repeat: repeat, no-repeat, repeat,repeat; background-attachment: scroll, fixed, scroll, fixed;",
            variants: {},
            children: [],
          },
        ],
        assets: [
          {
            cdnUrl:
              "https://uploads-ssl.webflow.com/667c32290bd6159c18dca9a0/667d0b7769e0cc3754b584f6_IMG_2882%20(1).png",
            siteId: "667c32290bd6159c18dca9a0",
            width: 800,
            height: 600,
            fileName: "IMG_2882 (1).png",
            createdOn: "2024-06-27T06:49:27.100Z",
            origFileName: "IMG_2882 (1).png",
            fileHash: "36f49907757795f0a4ecfcfdfc483115",
            variants: [
              {
                origFileName: "IMG_2882%20(1)-p-500.png",
                fileName: "667d0b7769e0cc3754b584f6_IMG_2882%20(1)-p-500.png",
                format: "png",
                size: 192728,
                width: 500,
                quality: 100,
                cdnUrl:
                  "https://daks2k3a4ib2z.cloudfront.net/667c32290bd6159c18dca9a0/667d0b7769e0cc3754b584f6_IMG_2882%20(1)-p-500.png",
                s3Url:
                  "https://s3.amazonaws.com/webflow-prod-assets/667c32290bd6159c18dca9a0/667d0b7769e0cc3754b584f6_IMG_2882%20(1)-p-500.png",
              },
            ],
            mimeType: "image/png",
            s3Url:
              "https://s3.amazonaws.com/webflow-prod-assets/667c32290bd6159c18dca9a0/667d0b7769e0cc3754b584f6_IMG_2882%20(1).png",
            thumbUrl: "",
            _id: "667d0b7769e0cc3754b584f6",
            markedAsDeleted: false,
            fileSize: 862053,
          },
          {
            cdnUrl:
              "https://uploads-ssl.webflow.com/667c32290bd6159c18dca9a0/667d0fe180995eadc1534a26_%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20.webp",
            siteId: "667c32290bd6159c18dca9a0",
            width: 1024,
            height: 1024,
            fileName: "Привет Мир : %2F .webp",
            createdOn: "2024-06-27T07:08:17.010Z",
            origFileName: "Привет Мир : %2F .webp",
            fileHash: "d86e52a94c04120f455b276effa59046",
            variants: [
              {
                origFileName:
                  "%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20-p-500.webp",
                fileName:
                  "667d0fe180995eadc1534a26_%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20-p-500.webp",
                format: "webp",
                size: 26992,
                width: 500,
                quality: 100,
                cdnUrl:
                  "https://daks2k3a4ib2z.cloudfront.net/667c32290bd6159c18dca9a0/667d0fe180995eadc1534a26_%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20-p-500.webp",
                s3Url:
                  "https://s3.amazonaws.com/webflow-prod-assets/667c32290bd6159c18dca9a0/667d0fe180995eadc1534a26_%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20-p-500.webp",
              },
              {
                origFileName:
                  "%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20-p-800.webp",
                fileName:
                  "667d0fe180995eadc1534a26_%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20-p-800.webp",
                format: "webp",
                size: 45964,
                width: 800,
                quality: 100,
                cdnUrl:
                  "https://daks2k3a4ib2z.cloudfront.net/667c32290bd6159c18dca9a0/667d0fe180995eadc1534a26_%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20-p-800.webp",
                s3Url:
                  "https://s3.amazonaws.com/webflow-prod-assets/667c32290bd6159c18dca9a0/667d0fe180995eadc1534a26_%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20-p-800.webp",
              },
            ],
            mimeType: "image/webp",
            s3Url:
              "https://s3.amazonaws.com/webflow-prod-assets/667c32290bd6159c18dca9a0/667d0fe180995eadc1534a26_%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20.webp",
            thumbUrl: "",
            _id: "667d0fe180995eadc1534a26",
            markedAsDeleted: false,
            fileSize: 191270,
          },
        ],
      },
    });

    const fragment = await toWebstudioFragment(input);

    const bgStyle = fragment.styles.find(
      (style) => style.property === "backgroundImage"
    );

    expect(bgStyle).toBeDefined();
    expect(bgStyle?.value.type).toEqual("layers");

    const layers = bgStyle?.value;

    invariant(layers?.type === "layers");

    const imgA = layers.value[1];
    const imgB = layers.value[2];
    const noneLayer = layers.value[3];

    invariant(imgA.type === "image");
    invariant(imgA.value.type === "url");
    invariant(imgB.type === "image");
    invariant(imgB.value.type === "url");

    expect(imgA.value.url).toEqual(input.payload.assets[0].s3Url);
    expect(imgB.value.url).toEqual(input.payload.assets[1].s3Url);

    expect(noneLayer.type).toEqual("keyword");
    invariant(noneLayer.type === "keyword");
    expect(noneLayer.value).toEqual("none");

    expect(toCss(fragment)).toMatchInlineSnapshot(`
      "@media all {
        Div Block {
          height: 400px;
          background-image: linear-gradient(180deg,hsla(0,0.00%,0.00%,0.11),white), url("https://s3.amazonaws.com/webflow-prod-assets/667c32290bd6159c18dca9a0/667d0b7769e0cc3754b584f6_IMG_2882%20(1).png"), url("https://s3.amazonaws.com/webflow-prod-assets/667c32290bd6159c18dca9a0/667d0fe180995eadc1534a26_%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20.webp"), none;
          background-size: auto, contain, auto, auto;
          background-repeat: repeat, no-repeat, repeat, repeat;
          background-attachment: scroll, fixed, scroll, fixed;
          background-position: 0px 0px, 550px 0px, 0px 0px, 0px 0px
        }
      }"
  `);
  });

  test("@raw webflow custom properties", async () => {
    const input = WfData.parse({
      type: "@webflow/XscpData",
      payload: {
        nodes: [
          {
            _id: "89ed49d8-2d32-5bab-22e1-264acb8d2d84",
            type: "Block",
            tag: "div",
            classes: ["393ac121-a395-7678-e598-994e30fb7880"],
            children: [],
            data: { text: false, tag: "div" },
          },
        ],
        styles: [
          {
            _id: "393ac121-a395-7678-e598-994e30fb7880",
            fake: false,
            type: "class",
            name: "Div Block",
            namespace: "",
            comb: "",
            styleLess: "color: @raw<|black|>; background-color: @raw<|red|>;",
            variants: {},
            children: [],
          },
        ],
        assets: [],
      },
    });

    const fragment = await toWebstudioFragment(input);

    expect(toCss(fragment)).toMatchInlineSnapshot(`
      "@media all {
        Div Block {
          color: black;
          background-color: red
        }
      }"
    `);
  });

  test("append transparent color when background-clip is used", async () => {
    const input = WfData.parse({
      type: "@webflow/XscpData",
      payload: {
        nodes: [
          {
            _id: "15c3fb65-b871-abe4-f9a4-3747c8a882e0",
            type: "Heading",
            tag: "h2",
            classes: ["069649be-a33a-1a9a-3763-c0bd9d1f3a3d"],
            children: ["b69a5869-f046-5a0c-151e-9b134a6852aa"],
            data: {
              tag: "h2",
              devlink: { runtimeProps: {}, slot: "" },
              displayName: "",
              attr: { id: "" },
              xattr: [],
              search: { exclude: false },
              visibility: { conditions: [] },
            },
          },
          {
            _id: "b69a5869-f046-5a0c-151e-9b134a6852aa",
            text: true,
            v: "Protect your systems securely with Prism",
          },
        ],
        styles: [
          {
            _id: "069649be-a33a-1a9a-3763-c0bd9d1f3a3d",
            fake: false,
            type: "class",
            name: "H2 Heading 2",
            namespace: "",
            comb: "",
            styleLess:
              "background-image: linear-gradient(350deg, hsla(256.3636363636363, 72.13%, 23.92%, 0.00), hsla(256.2162162162162, 72.55%, 80.00%, 1.00) 49%, #bba7f1); color: hsla(0, 0.00%, 100.00%, 1.00); background-clip: text;",
            variants: {},
            children: [],
            createdBy: "58b4b8186ceb395341fcf640",
            origin: null,
            selector: null,
          },
        ],
        assets: [],
      },
    });

    const fragment = await toWebstudioFragment(input);

    expect(toCss(fragment)).toMatchInlineSnapshot(`
      "@media all {
        h2 {
          margin-bottom: 10px;
          font-weight: bold;
          margin-top: 20px;
          font-size: 32px;
          line-height: 36px
        }
        H2 Heading 2 {
          background-image: linear-gradient(350deg,hsla(256.3636363636363,72.13%,23.92%,0.00),hsla(256.2162162162162,72.55%,80.00%,1.00) 49%,#bba7f1);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent
        }
      }"
    `);
  });
});
