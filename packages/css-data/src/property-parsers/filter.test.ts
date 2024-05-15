import { describe, expect, test } from "@jest/globals";
import { parseFilter } from "./filter";

describe("parse filter", () => {
  test("parse values and returns the valid style property values", () => {
    expect(parseFilter("blur(4px)")).toMatchInlineSnapshot(`
{
  "type": "tuple",
  "value": [
    {
      "args": {
        "type": "tuple",
        "value": [
          {
            "type": "unit",
            "unit": "px",
            "value": 4,
          },
        ],
      },
      "name": "blur",
      "type": "function",
    },
  ],
}
`);

    expect(parseFilter("drop-shadow(10px 10px 25px rgba(0, 0, 255, 1))"))
      .toMatchInlineSnapshot(`
{
  "type": "tuple",
  "value": [
    {
      "args": {
        "type": "tuple",
        "value": [
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
            "value": 25,
          },
          {
            "alpha": 1,
            "b": 255,
            "g": 0,
            "r": 0,
            "type": "rgb",
          },
        ],
      },
      "name": "drop-shadow",
      "type": "function",
    },
  ],
}
`);

    expect(parseFilter("drop-shadow(10px 10px 25px  #0000FF)"))
      .toMatchInlineSnapshot(`
{
  "type": "tuple",
  "value": [
    {
      "args": {
        "type": "tuple",
        "value": [
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
            "value": 25,
          },
          {
            "alpha": 1,
            "b": 255,
            "g": 0,
            "r": 0,
            "type": "rgb",
          },
        ],
      },
      "name": "drop-shadow",
      "type": "function",
    },
  ],
}
`);
  });

  test("Multiple valid function values", () => {
    expect(
      parseFilter("blur(4px) drop-shadow(16px 16px 20px blue) opacity(25%)")
    ).toMatchInlineSnapshot(`
{
  "type": "tuple",
  "value": [
    {
      "args": {
        "type": "tuple",
        "value": [
          {
            "type": "unit",
            "unit": "px",
            "value": 4,
          },
        ],
      },
      "name": "blur",
      "type": "function",
    },
    {
      "args": {
        "type": "tuple",
        "value": [
          {
            "type": "unit",
            "unit": "px",
            "value": 16,
          },
          {
            "type": "unit",
            "unit": "px",
            "value": 16,
          },
          {
            "type": "unit",
            "unit": "px",
            "value": 20,
          },
          {
            "type": "keyword",
            "value": "blue",
          },
        ],
      },
      "name": "drop-shadow",
      "type": "function",
    },
    {
      "args": {
        "type": "tuple",
        "value": [
          {
            "type": "unit",
            "unit": "%",
            "value": 25,
          },
        ],
      },
      "name": "opacity",
      "type": "function",
    },
  ],
}
`);
  });

  // parsers are used to use copied value. At the moment, we don't have support
  // for complex functions in the UI like the one below like calc(4px + 16em)
  test("Using complex functions inside filter function", () => {
    expect(parseFilter("blur(calc(4px + 16em))")).toMatchInlineSnapshot(`
{
  "type": "tuple",
  "value": [
    {
      "args": {
        "type": "tuple",
        "value": [],
      },
      "name": "blur",
      "type": "function",
    },
  ],
}
`);
  });
});
