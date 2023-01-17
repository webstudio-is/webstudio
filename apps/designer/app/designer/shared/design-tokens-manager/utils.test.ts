import { describe, test, expect } from "@jest/globals";
import type { DesignToken } from "@webstudio-is/design-tokens";
import { filterByType, findByName, tokensToStyle } from "./utils";

const tokens: Array<DesignToken> = [
  { name: "a", type: "color", value: "red", group: "Color" },
  { name: "b", type: "color", value: "green", group: "Color" },
  { name: "c", type: "sizing", value: "20px", group: "Sizing" },
];

describe("design tokens manager utils", () => {
  test("tokensToStyle", () => {
    expect(tokensToStyle(tokens)).toMatchInlineSnapshot(`
      {
        "--token-a": {
          "type": "keyword",
          "value": "red",
        },
        "--token-b": {
          "type": "keyword",
          "value": "green",
        },
        "--token-c": {
          "type": "keyword",
          "value": "20px",
        },
      }
    `);
  });

  test("findByName", () => {
    expect(findByName(tokens, "a")).toMatchInlineSnapshot(`
      {
        "group": "Color",
        "name": "a",
        "type": "color",
        "value": "red",
      }
    `);
  });

  test("filterByType", () => {
    expect(filterByType(tokens, "color")).toMatchInlineSnapshot(`
      [
        {
          "group": "Color",
          "name": "a",
          "type": "color",
          "value": "red",
        },
        {
          "group": "Color",
          "name": "b",
          "type": "color",
          "value": "green",
        },
      ]
    `);
  });
});
