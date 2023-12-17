import { expect, test } from "@jest/globals";
import {
  getMapValuesBy,
  getMapValuesByKeysSet,
  groupBy,
  removeByMutable,
} from "./array-utils";

test("removeByMutable", () => {
  const array = [
    { param: 1 },
    { param: 2 },
    { param: 3 },
    { param: 4 },
    { param: 5 },
    { param: 6 },
  ];
  removeByMutable(array, (item) => item.param % 2 === 1);
  expect(array).toMatchInlineSnapshot(`
    [
      {
        "param": 2,
      },
      {
        "param": 4,
      },
      {
        "param": 6,
      },
    ]
  `);
  removeByMutable(array, (item) => item.param !== 4);
  expect(array).toMatchInlineSnapshot(`
    [
      {
        "param": 4,
      },
    ]
  `);
});

test("getMapValuesByKeysSet", () => {
  const map = new Map([
    [1, "value1"],
    [2, "value2"],
    [3, "value3"],
    [4, "value4"],
    [5, "value5"],
  ]);
  const keys = new Set([2, 4]);
  expect(getMapValuesByKeysSet(map, keys)).toEqual(["value2", "value4"]);
});

test("getMapValuesBy", () => {
  const map = new Map([
    [1, "value1"],
    [2, "value2"],
    [3, "value3"],
    [4, "value4"],
    [5, "value5"],
  ]);
  expect(
    getMapValuesBy(map, (value) => value.includes("3") || value.includes("5"))
  ).toEqual(["value3", "value5"]);
});

test("groupBy", () => {
  expect(groupBy([1, 2, 3, 4, 5], (item) => item % 2)).toEqual(
    new Map([
      [0, [2, 4]],
      [1, [1, 3, 5]],
    ])
  );
});
