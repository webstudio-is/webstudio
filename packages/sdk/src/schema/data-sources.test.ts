import { expect, test } from "vitest";
import { dataSource } from "./data-sources";

test("normalizes legacy json data variables without value", () => {
  expect(
    dataSource.parse({
      id: "data-source-id",
      type: "variable",
      name: "data",
      value: { type: "json" },
    })
  ).toEqual({
    id: "data-source-id",
    type: "variable",
    name: "data",
    value: { type: "json", value: null },
  });
});
