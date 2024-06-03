import { describe, expect, test } from "@jest/globals";
import { parseCss } from "./parse-css";

describe("Parse CSS", () => {
  test("longhand property name with keyword value", () => {
    expect(parseCss(`.test { background-color: red }`)).toMatchInlineSnapshot(`
      {
        "test": [
          {
            "property": "backgroundColor",
            "value": {
              "type": "keyword",
              "value": "red",
            },
          },
        ],
      }
    `);
  });

  test("one class selector rules", () => {
    expect(parseCss(`.test { color: #ff0000 }`)).toMatchInlineSnapshot(`
      {
        "test": [
          {
            "property": "color",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
        ],
      }
    `);
  });

  test("parses supported shorthand values", () => {
    expect(
      parseCss(
        `.test { background: #ff0000 linear-gradient(180deg, #11181C 0%, rgba(17, 24, 28, 0) 36.09%), #EBFFFC; }`
      ).test
    ).toMatchInlineSnapshot(`
      [
        {
          "property": "backgroundImage",
          "value": {
            "type": "layers",
            "value": [
              {
                "type": "unparsed",
                "value": "linear-gradient(180deg,#11181C 0%,rgba(17,24,28,0) 36.09%)",
              },
            ],
          },
        },
        {
          "property": "backgroundColor",
          "value": {
            "alpha": 1,
            "b": 252,
            "g": 255,
            "r": 235,
            "type": "rgb",
          },
        },
      ]
    `);
  });

  test("parses unsupported shorthand values", () => {
    expect(parseCss(`.test { padding: 4px }`).test?.[0]).toMatchInlineSnapshot(`
      {
        "property": "padding",
        "value": {
          "type": "unit",
          "unit": "px",
          "value": 4,
        },
      }
    `);
  });

  test("complex selector rules", () => {
    expect(parseCss(`.test, a, .test2, .test:hover { color: #ff0000 }`))
      .toMatchInlineSnapshot(`
      {
        "test": [
          {
            "property": "color",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
        ],
        "test2": [
          {
            "property": "color",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
        ],
      }
    `);
  });
});
