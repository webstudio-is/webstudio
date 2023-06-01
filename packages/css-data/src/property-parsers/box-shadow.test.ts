import { describe, expect, test } from "@jest/globals";

import { parseBoxShadow } from "./box-shadow";

describe("parseBoxShadow", () => {
  test("parse box-shadow from figma", () => {
    expect(
      parseBoxShadow(
        "box-shadow: 0 60px 80px rgba(0,0,0,0.60), 0 45px 26px rgba(0,0,0,0.14);"
      )
    ).toMatchInlineSnapshot(`
    {
      "type": "layers",
      "value": [
        {
          "type": "tuple",
          "value": [
            {
              "type": "rgb",
              "alpha": 0.6,
              "r": 0,
              "g": 0,
              "b": 0
            },
            {
              "type": "unit",
              "value": 0,
              "unit": "number"
            },
            {
              "type": "unit",
              "value": 60,
              "unit": "px"
            },
            {
              "type": "unit",
              "value": 80,
              "unit": "px"
            }
          ]
        },
        {
          "type": "tuple",
          "value": [
            {
              "type": "rgb",
              "alpha": 0.14,
              "r": 0,
              "g": 0,
              "b": 0
            },
            {
              "type": "unit",
              "value": 0,
              "unit": "number"
            },
            {
              "type": "unit",
              "value": 45,
              "unit": "px"
            },
            {
              "type": "unit",
              "value": 26,
              "unit": "px"
            }
          ]
        }
      ]
    }
    `);
  });
});
