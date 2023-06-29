import { describe, expect, test } from "@jest/globals";

import { parseBoxShadow } from "./box-shadow";

describe("parseBoxShadow", () => {
  test("parses value and returns invalid when used a invalid color", () => {
    expect(parseBoxShadow(`10px 10px 5px foo`)).toMatchInlineSnapshot(`
      {
        "type": "invalid",
        "value": "10px 10px 5px foo",
      }
    `);
  });

  test("throws error when passed a value without a unit", () => {
    expect(parseBoxShadow(`10 10px 5px red`)).toMatchInlineSnapshot(`
      {
        "type": "invalid",
        "value": "10 10px 5px red",
      }
    `);
  });

  test("inset and color values can be interchanged", () => {
    expect(parseBoxShadow(`inset 10px 10px 5px black;`)).toMatchInlineSnapshot(`
      {
        "type": "layers",
        "value": [
          {
            "type": "tuple",
            "value": [
              {
                "type": "keyword",
                "value": "inset",
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 10,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 10,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 5,
              },
              {
                "type": "keyword",
                "value": "black",
              },
            ],
          },
        ],
      }
    `);
  });

  test("parses value when inset is used but missing blur-radius", () => {
    expect(parseBoxShadow(`box-shadow: inset 5em 1em gold`))
      .toMatchInlineSnapshot(`
      {
        "type": "layers",
        "value": [
          {
            "type": "tuple",
            "value": [
              {
                "type": "keyword",
                "value": "inset",
              },
              {
                "type": "unit",
                "unit": "em",
                "value": 5,
              },
              {
                "type": "unit",
                "unit": "em",
                "value": 1,
              },
              {
                "type": "keyword",
                "value": "gold",
              },
            ],
          },
        ],
      }
    `);
  });

  test("parses value when offsetX and offsetY are used", () => {
    expect(parseBoxShadow(`box-shadow: 60px -16px teal;`))
      .toMatchInlineSnapshot(`
      {
        "type": "layers",
        "value": [
          {
            "type": "tuple",
            "value": [
              {
                "type": "unit",
                "unit": "px",
                "value": 60,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": -16,
              },
              {
                "type": "keyword",
                "value": "teal",
              },
            ],
          },
        ],
      }
    `);
  });

  test("parses value from figma", () => {
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
                "type": "unit",
                "unit": "number",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 60,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 80,
              },
              {
                "alpha": 0.6,
                "b": 0,
                "g": 0,
                "r": 0,
                "type": "rgb",
              },
            ],
          },
          {
            "type": "tuple",
            "value": [
              {
                "type": "unit",
                "unit": "number",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 45,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 26,
              },
              {
                "alpha": 0.14,
                "b": 0,
                "g": 0,
                "r": 0,
                "type": "rgb",
              },
            ],
          },
        ],
      }
    `);
  });

  test(`parses multiple layers of box-shadow property`, () => {
    expect(
      parseBoxShadow(`box-shadow:
    0 0 5px rgba(0, 0, 0, 0.2),
    inset 0 0 10px rgba(0, 0, 0, 0.3),
    0 0 15px rgba(0, 0, 0, 0.4);
  `)
    ).toMatchInlineSnapshot(`
      {
        "type": "layers",
        "value": [
          {
            "type": "tuple",
            "value": [
              {
                "type": "unit",
                "unit": "number",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "number",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 5,
              },
              {
                "alpha": 0.2,
                "b": 0,
                "g": 0,
                "r": 0,
                "type": "rgb",
              },
            ],
          },
          {
            "type": "tuple",
            "value": [
              {
                "type": "keyword",
                "value": "inset",
              },
              {
                "type": "unit",
                "unit": "number",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "number",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 10,
              },
              {
                "alpha": 0.3,
                "b": 0,
                "g": 0,
                "r": 0,
                "type": "rgb",
              },
            ],
          },
          {
            "type": "tuple",
            "value": [
              {
                "type": "unit",
                "unit": "number",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "number",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 15,
              },
              {
                "alpha": 0.4,
                "b": 0,
                "g": 0,
                "r": 0,
                "type": "rgb",
              },
            ],
          },
        ],
      }
    `);
  });
});
