import type { DesignToken } from "@webstudio-is/design-tokens";
import produce from "immer";
import {
  deleteTokenMutable,
  filterByType,
  findByName,
  tokensToStyle,
  updateTokenMutable,
} from "./utils";

const tokens: Array<DesignToken> = [
  { name: "a", type: "color", value: "red", group: "Color" },
  { name: "b", type: "color", value: "green", group: "Color" },
  { name: "c", type: "sizing", value: "20px", group: "Sizing" },
];

describe("design tokens manager utils", () => {
  test("deleteTokenMutable", () => {
    let updated = [...tokens];
    deleteTokenMutable(updated, "a");
    expect(updated).toMatchInlineSnapshot(`
      [
        {
          "group": "Color",
          "name": "b",
          "type": "color",
          "value": "green",
        },
        {
          "group": "Sizing",
          "name": "c",
          "type": "sizing",
          "value": "20px",
        },
      ]
    `);
    updated = [...tokens];
    deleteTokenMutable(updated, "b");
    expect(updated).toMatchInlineSnapshot(`
      [
        {
          "group": "Color",
          "name": "a",
          "type": "color",
          "value": "red",
        },
        {
          "group": "Sizing",
          "name": "c",
          "type": "sizing",
          "value": "20px",
        },
      ]
    `);
  });

  test("updateTokenMutable", () => {
    const updated = produce(tokens, (draft) => {
      updateTokenMutable(
        draft,
        { name: "c", type: "color", value: "blue", group: "Color" },
        "a"
      );
    });
    expect(updated).toMatchInlineSnapshot(`
      [
        {
          "group": "Color",
          "name": "c",
          "type": "color",
          "value": "blue",
        },
        {
          "group": "Color",
          "name": "b",
          "type": "color",
          "value": "green",
        },
        {
          "group": "Sizing",
          "name": "c",
          "type": "sizing",
          "value": "20px",
        },
      ]
    `);
  });

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
