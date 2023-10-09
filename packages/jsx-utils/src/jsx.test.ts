import { describe, expect, test } from "@jest/globals";
import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import { jsxToWSEmbedTemplate } from "./jsx";

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

  test.only("parses props values correctly", async () => {
    const parsed = await jsxToWSEmbedTemplate(`
      <Image src alt="welcome to webstudio" width={1000} height={200} />`);
    expect(() => WsEmbedTemplate.parse(parsed)).not.toThrow();

    expect(parsed[0].props).toMatchInlineSnapshot(`
[
  {
    "name": "alt",
    "type": "string",
    "value": "welcome to webstudio",
  },
  {
    "name": "width",
    "type": "number",
    "value": 1000,
  },
  {
    "name": "height",
    "type": "number",
    "value": 200,
  },
]
`);
  });
});

const jsx = `
<Box style={{margin: 0}} className="mx-10">
  Hello from Webstudio
</Box>
`;
