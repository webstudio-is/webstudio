import { expect, test } from "vitest";
import { css } from "./css";

test("parse css", () => {
  expect(css`
    color: red;
  `).toEqual([
    {
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("support interpolations in local styles", () => {
  expect(css`
    color: ${"red"};
  `).toEqual([
    {
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});
