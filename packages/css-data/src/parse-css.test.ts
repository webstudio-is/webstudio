import { describe, test, expect } from "@jest/globals";
import { parseCss } from "./parse-css";

describe("Parse CSS", () => {
  test("one class selector rules", () => {
    expect(parseCss(`.foo { color: #ff0000 }`)).toMatchInlineSnapshot(`
      {
        "foo": [
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

  test("complex selector rules", () => {
    expect(parseCss(`.foo, a, .bar, .foo:hover { color: #ff0000 }`))
      .toMatchInlineSnapshot(`
      {
        "bar": [
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
        "foo": [
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
