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
});

const jsx = `
<Box style={{margin: 0}} className="mx-10">
  Hello from Webstudio
</Box>
`;
