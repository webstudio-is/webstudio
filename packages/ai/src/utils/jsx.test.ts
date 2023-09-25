import { describe, expect, test } from "@jest/globals";
import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import { jsxToWSEmbedTemplate } from "./jsx";

describe("jsx", () => {
  test("valid template", () => {
    const parsed = jsxToWSEmbedTemplate(jsx.trim());
    expect(() => WsEmbedTemplate.parse(parsed)).not.toThrow();
  });
});

const jsx = `
<Box style={{margin: 0}}>

</Box>
`;
