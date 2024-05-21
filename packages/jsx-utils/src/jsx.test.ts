import { describe, expect, test } from "@jest/globals";
import { EmbedTemplateProp, WsEmbedTemplate } from "@webstudio-is/react-sdk";
import { jsxToWSEmbedTemplate } from "./jsx";
import { traverseTemplate } from ".";

describe("jsx", () => {
  test("valid template", async () => {
    const parsed = await jsxToWSEmbedTemplate(jsx.trim());
    expect(() => WsEmbedTemplate.parse(parsed)).not.toThrow();
    expect(parsed).toMatchInlineSnapshot(`
[
  {
    "children": [
      {
        "type": "text",
        "value": "Hello from Webstudio",
      },
    ],
    "component": "Box",
    "props": [
      {
        "name": "className",
        "type": "string",
        "value": "mx-10",
      },
    ],
    "styles": [],
    "type": "instance",
  },
]
`);
  });

  test("parses components names that are member expressions", async () => {
    const parsed = await jsxToWSEmbedTemplate(
      `<A.B><C.D.E><F></F></C.D.E></A.B>`
    );
    expect(() => WsEmbedTemplate.parse(parsed)).not.toThrow();
    expect(parsed).toMatchInlineSnapshot(`
[
  {
    "children": [
      {
        "children": [
          {
            "children": [],
            "component": "F",
            "props": [],
            "styles": [],
            "type": "instance",
          },
        ],
        "component": "C.D.E",
        "props": [],
        "styles": [],
        "type": "instance",
      },
    ],
    "component": "A.B",
    "props": [],
    "styles": [],
    "type": "instance",
  },
]
`);
  });

  test("parses props values correctly", async () => {
    const parsed = await jsxToWSEmbedTemplate(`


    <Box className="flex flex-col items-center justify-center bg-white text-black p-10">
  <Image src="" alt="Aromatic coffee in a cup" width="600" height="400" className="rounded-lg shadow-lg mb-6"/>
</Box>

`);
    expect(() => WsEmbedTemplate.parse(parsed)).not.toThrow();
    const props: EmbedTemplateProp[][] = [];

    traverseTemplate(parsed, (node) => {
      if (node.type === "instance" && node.props) {
        props.push(node.props);
      }
    });

    expect(props).toMatchInlineSnapshot(`
[
  [
    {
      "name": "className",
      "type": "string",
      "value": "flex flex-col items-center justify-center bg-white text-black p-10",
    },
  ],
  [
    {
      "name": "src",
      "type": "string",
      "value": "",
    },
    {
      "name": "alt",
      "type": "string",
      "value": "Aromatic coffee in a cup",
    },
    {
      "name": "width",
      "type": "number",
      "value": 600,
    },
    {
      "name": "height",
      "type": "number",
      "value": 400,
    },
    {
      "name": "className",
      "type": "string",
      "value": "rounded-lg shadow-lg mb-6",
    },
  ],
]
`);
  });
});

const jsx = `
<Box style={{margin: 0}} className="mx-10">
  Hello from Webstudio
</Box>
`;

test("automatically wrap with fragment unwrapped jsx elements", async () => {
  const jsx = `
    <Box>Box 1</Box>
    <Box>Box 2</Box>
  `;
  const parsed = await jsxToWSEmbedTemplate(jsx.trim());
  expect(() => WsEmbedTemplate.parse(parsed)).not.toThrow();
  expect(parsed).toMatchInlineSnapshot(`
[
  {
    "children": [
      {
        "type": "text",
        "value": "Box 1",
      },
    ],
    "component": "Box",
    "props": [],
    "styles": [],
    "type": "instance",
  },
  {
    "children": [
      {
        "type": "text",
        "value": "Box 2",
      },
    ],
    "component": "Box",
    "props": [],
    "styles": [],
    "type": "instance",
  },
]
`);
});
