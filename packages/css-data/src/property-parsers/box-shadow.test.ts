import { describe, expect, test } from "@jest/globals";

import { parseBoxShadow } from "./box-shadow";

describe("parseBackground", () => {
  test("parse background from figma", () => {
    expect(
      parseBoxShadow(
        "box-shadow: 0 60px 80px rgba(0,0,0,0.60), 0 45px 26px rgba(0,0,0,0.14);"
      )
    ).toMatchInlineSnapshot(`
      {
        "type": "layers",
        "value": [
          {
            "type": "unparsed",
            "value": "0 60px 80px rgba(0,0,0,0.60)"
          },
          {
            "type": "unparsed",
            "value": "0 45px 26px rgba(0,0,0,0.14)"
          }
        ]
      }
    `);
  });
});
