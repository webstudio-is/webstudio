import { describe, expect, test } from "@jest/globals";

import { textDecorationToLonghand } from "./text-decoration";

describe("textDecoration", () => {
  test("textDecorationToLonghand", () => {
    expect(textDecorationToLonghand("underline")).toMatchInlineSnapshot(`
      {
        "textDecorationColor": undefined,
        "textDecorationLine": "underline",
        "textDecorationStyle": undefined,
        "textDecorationThickness": undefined,
      }
    `);

    expect(textDecorationToLonghand("underline 10px")).toMatchInlineSnapshot(`
      {
        "textDecorationColor": undefined,
        "textDecorationLine": "underline",
        "textDecorationStyle": undefined,
        "textDecorationThickness": "10px",
      }
    `);

    expect(textDecorationToLonghand("underline #ff0000 10px"))
      .toMatchInlineSnapshot(`
      {
        "textDecorationColor": "#ff0000",
        "textDecorationLine": "underline",
        "textDecorationStyle": undefined,
        "textDecorationThickness": "10px",
      }
    `);

    expect(textDecorationToLonghand("rgba(10, 2, 10, 1) underline 10px"))
      .toMatchInlineSnapshot(`
      {
        "textDecorationColor": "rgba(10, 2, 10, 1)",
        "textDecorationLine": "underline",
        "textDecorationStyle": undefined,
        "textDecorationThickness": "10px",
      }
    `);
  });
});
