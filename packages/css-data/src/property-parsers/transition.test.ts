import { describe, expect, test } from "@jest/globals";

import { parseTransition } from "./transition";

describe("parseTransition", () => {
  test("parses value and returns invalid when used a invalid color", () => {
    expect(parseTransition(`10px 10px 5px foo`)).toMatchInlineSnapshot(`
      {
        "type": "invalid",
        "value": "10px 10px 5px foo",
      }
    `);
  });

  test("parse value and returns multiple valid layers", () => {
    expect(parseTransition("color .2s, text-shadow .2s"))
      .toMatchInlineSnapshot(`
{
  "type": "layers",
  "value": [
    {
      "type": "tuple",
      "value": [
        {
          "type": "keyword",
          "value": "color",
        },
        {
          "type": "unit",
          "unit": "s",
          "value": 0.2,
        },
      ],
    },
    {
      "type": "tuple",
      "value": [
        {
          "type": "keyword",
          "value": "text-shadow",
        },
        {
          "type": "unit",
          "unit": "s",
          "value": 0.2,
        },
      ],
    },
  ],
}
`);
  });

  test("parse value and returns valid layer", () => {
    expect(parseTransition("opacity 200ms ease 0s")).toMatchInlineSnapshot(`
{
  "type": "layers",
  "value": [
    {
      "type": "tuple",
      "value": [
        {
          "type": "keyword",
          "value": "opacity",
        },
        {
          "type": "unit",
          "unit": "ms",
          "value": 200,
        },
        {
          "type": "keyword",
          "value": "ease",
        },
        {
          "type": "unit",
          "unit": "s",
          "value": 0,
        },
      ],
    },
  ],
}
`);
  });

  test("throws error if any custom transition proeprty is used", () => {
    const transition = parseTransition(
      "all 200ms ease 0s, --foo 200ms ease 0s"
    );
    expect(transition).toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "all 200ms ease 0s, --foo 200ms ease 0s",
}
`);
  });

  test("throws error if any custom transition timing function is used", () => {
    const transition = parseTransition("all 200ms custom-function 0s");
    expect(transition).toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "all 200ms custom-function 0s",
}
`);
  });
});
