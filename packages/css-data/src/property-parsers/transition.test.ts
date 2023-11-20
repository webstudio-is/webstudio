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
    expect(parseTransition("color .2s, text-shadow .2s")).toMatchSnapshot(`
      {
        "type": "layers",
        "value": [
          {
            "type": "tuple",
            "value": [
              {
                "type": "keyword",
                "value": "color"
              },
              {
                "type": "unit",
                "value": 0.2,
                "unit": "s"
              }
            ]
          },
          {
            "type": "tuple",
            "value": [
              {
                "type": "keyword",
                "value": "text-shadow"
              },
              {
                "type": "unit",
                "value": 0.2,
                "unit": "s"
              }
            ]
          }
        ]
      }`);
  });

  test("parse value and returns valid layer", () => {
    expect(parseTransition("opacity 200ms ease 0s")).toMatchSnapshot(`
      {
        "type": "layers",
        "value": [
          {
            "type": "tuple",
            "value": [
              {
                "type": "keyword",
                "value": "opacity"
              },
              {
                "type": "unit",
                "value": 200,
                "unit": "ms"
              },
              {
                "type": "keyword",
                "value": "ease"
              },
              {
                "type": "unit",
                "value": 0,
                "unit": "s"
              }
            ]
          }
        ]
      }`);
  });

  test("throws error if any custom transition proeprty is used", () => {
    const transition = parseTransition(
      "all 200ms ease 0s, --foo 200ms ease 0s"
    );
    expect(transition).toMatchSnapshot(`
      {
        "type": "invalid",
        "value": "all 200ms ease 0s, --foo 200ms ease 0s"
      }`);
  });

  test("throws error if any custom transition timing function is used", () => {
    const transition = parseTransition("all 200ms custom-function 0s");
    expect(transition).toMatchSnapshot(`
      {
        "type": "invalid",
        "value": "all 200ms custom-function 0s"
      }`);
  });
});
