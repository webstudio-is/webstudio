import type { DesignToken } from "@webstudio-is/project";
import { deleteTokenMutable } from "./utils";

describe("design tokens manager utils", () => {
  test("deleteTokenMutable", () => {
    const tokens: Array<DesignToken> = [
      { name: "a", type: "color", value: "red", group: "Color" },
      { name: "b", type: "color", value: "green", group: "Color" },
    ];
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
      ]
    `);
  });
});
