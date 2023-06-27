import { describe, expect, test } from "@jest/globals";
import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import { jsxToWSEmbedTemplate } from "./jsx";
import { parseCssValue } from "./parse-css-value";

describe("jsx", () => {
  test("valid template", () => {
    const parsed = jsxToWSEmbedTemplate(jsx.trim(), { parseStyles: false });
    // console.log(JSON.stringify(parsed));
    expect(() => WsEmbedTemplate.parse(parsed)).not.toThrow();
  });
});

const jsx = `
<Box style={{margin: 0}}>

</Box>
`;
