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
          "property": "backgroundColor",
          "value": {
            "alpha": 1,
            "b": 252,
            "g": 255,
            "r": 235,
            "type": "rgb",
          },
        },
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

  test("parse state", () => {
    expect(parseCss(`a:hover { color: #ff0000 }`)).toMatchInlineSnapshot(`
      {
        "a": [
          {
            "property": "color",
            "state": ":hover",
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

  test("parse multiple selectors, one with state", () => {
    expect(parseCss(`a, a:hover { color: #ff0000 }`)).toMatchInlineSnapshot(`
      {
        "a": [
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
          {
            "property": "color",
            "state": ":hover",
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

  test("parse multiple selectors, both with state", () => {
    expect(parseCss(`a:active, a:hover { color: #ff0000 }`))
      .toMatchInlineSnapshot(`
      {
        "a": [
          {
            "property": "color",
            "state": ":active",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
          {
            "property": "color",
            "state": ":hover",
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

  test("parse multiple rules", () => {
    expect(parseCss(`a { color: red} a:hover { color: #ff0000 }`))
      .toMatchInlineSnapshot(`
        {
          "a": [
            {
              "property": "color",
              "value": {
                "type": "keyword",
                "value": "red",
              },
            },
            {
              "property": "color",
              "state": ":hover",
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

  test("parse child combinator", () => {
    expect(parseCss(`a > b { color: #ff0000 }`)).toMatchInlineSnapshot(`{}`);
  });

  test("parse space combinator", () => {
    expect(parseCss(`a b { color: #ff0000 }`)).toMatchInlineSnapshot(`{}`);
  });
});
