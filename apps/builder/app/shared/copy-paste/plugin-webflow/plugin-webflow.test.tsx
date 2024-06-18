import { test, expect, describe, beforeEach } from "@jest/globals";
import { __testing__ } from "./plugin-webflow";
import { $breakpoints } from "../../nano-states";
import {
  type StyleRule,
  createRegularStyleSheet,
} from "@webstudio-is/css-engine";
import { initialBreakpoints, type WebstudioFragment } from "@webstudio-is/sdk";
import { nanoid } from "nanoid";
import { $, renderJsx } from "@webstudio-is/sdk/testing";

const { toWebstudioFragment } = __testing__;

const equalFragment = (fragment: WebstudioFragment, jsx: JSX.Element) => {
  const expected = renderJsx(jsx);

  const instances = Array.from(expected.instances.values());
  instances.forEach((instance) => {
    instance.id = expect.any(String) as unknown as string;
    for (const child of instance.children ?? []) {
      if (child.type === "id") {
        child.value = expect.any(String) as unknown as string;
      }
    }
  });
  const props = Array.from(expected.props.values()).map((prop) => ({
    ...prop,
    id: expect.any(String),
    instanceId: expect.any(String),
  }));

  expect(fragment.instances).toEqual(instances.reverse());
  expect(fragment.props).toEqual(props);
};

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
    const key = name + style.breakpointId;
    let styleRule = rulesMap.get(key);
    if (styleRule === undefined) {
      styleRule = sheet.addStyleRule(
        {
          style: { [style.property]: style.value },
          breakpoint: style.breakpointId,
        },
        name
      );
      rulesMap.set(key, styleRule);
      continue;
    }
    styleRule.styleMap.set(style.property, style.value);
  }
  return sheet.cssText;
};

beforeEach(() => {
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
    },
  });

  equalFragment(fragment, <$.Heading tag="h1">Turtle in the sea</$.Heading>);
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

  equalFragment(
    fragment,
    <$.Link href="https://webstudio.is" target="_blank" />
  );
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

  equalFragment(
    fragment,
    <$.List>
      <$.ListItem />
      <$.ListItem />
      <$.ListItem />
    </$.List>
  );
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

  equalFragment(fragment, <$.Paragraph>Text in a paragraph</$.Paragraph>);
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

  equalFragment(
    fragment,
    <$.Text>This is some text inside of a div block.</$.Text>
  );
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

  equalFragment(fragment, <$.Blockquote>Block Quote</$.Blockquote>);
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

  equalFragment(fragment, <$.Bold>Bold Text</$.Bold>);
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
  equalFragment(fragment, <$.Italic>Emphasis</$.Italic>);
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

  equalFragment(fragment, <$.Superscript>Superscript</$.Superscript>);
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

  equalFragment(fragment, <$.Subscript>Subscript</$.Subscript>);
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

  equalFragment(fragment, <$.Box tag="section" />);
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
  equalFragment(fragment, <$.Box />);
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

  equalFragment(fragment, <$.Box />);
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
  equalFragment(fragment, <$.Box />);
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
  equalFragment(fragment, <$.Box />);
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
  equalFragment(
    fragment,
    <$.Box>
      <$.Box />
      <$.Box />
    </$.Box>
  );
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

  equalFragment(fragment, <$.Box />);
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

  equalFragment(
    fragment,
    <$.Box>
      <$.Box />
      <$.Box />
    </$.Box>
  );
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
  equalFragment(fragment, <$.HtmlEmbed code="some html" clientOnly={true} />);
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

  equalFragment(fragment, <$.CodeText lang="javascript" code="test" />);
});

test.skip("RichText", async () => {
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
      <$.Paragraph>Unrdered list</$.Paragraph>
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
        <$.Strong>Bold text</$.Strong>
      </$.Paragraph>
      <$.Paragraph>
        <$.Emphasized>Emphasis</$.Emphasized>
      </$.Paragraph>
      <$.Paragraph>
        <$.Superscript>Superscript</$.Superscript>
      </$.Paragraph>
      <$.Paragraph>
        <$.Subscript>Subscript</$.Subscript>
      </$.Paragraph>
    </$.Box>
  );
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
    },
  });

  equalFragment(fragment, <$.Button>Submit</$.Button>);
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
    equalFragment(fragment, <$.Heading tag="h1" at="b" />);
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
              styleLess: "background-color: hsla(150, 100.00%, 50.00%, 1.00);",
            },
            xl: {
              styleLess: "background-color: hsla(69, 100.00%, 50.00%, 1.00);",
            },
            xxl: {
              styleLess: "background-color: hsla(14, 100.00%, 50.00%, 1.00);",
            },
            medium: {
              styleLess: "background-color: hsla(256, 100.00%, 50.00%, 1.00);",
            },
            small: {
              styleLess: "background-color: hsla(308, 100.00%, 50.00%, 1.00);",
            },
            tiny: {
              styleLess: "background-color: hsla(359, 100.00%, 50.00%, 1.00);",
            },
          },
        },
      ],
    },
  });

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
    }
    @media all and (min-width: 1440px) {
      Div Block 2 {
        background-color: rgba(217, 255, 0, 1)
      }
    }
    @media all and (min-width: 1920px) {
      Div Block 2 {
        background-color: rgba(255, 60, 0, 1)
      }
    }"
  `);
});
