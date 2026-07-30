import { expect, test } from "vitest";
import { dataSource, dataSourceVariableValue } from "./data-sources";

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

test("requires new arrays to use json variables", () => {
  expect(
    dataSourceVariableValue.safeParse({
      type: "string[]",
      value: ["news", "product"],
    }).success
  ).toBe(false);
  expect(
    dataSourceVariableValue.parse({
      type: "json",
      value: ["news", "product"],
    })
  ).toEqual({ type: "json", value: ["news", "product"] });
});
