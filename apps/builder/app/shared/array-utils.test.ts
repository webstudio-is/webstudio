import { expect, test } from "vitest";
import { removeByMutable, repeatUntil, ArrayFrom } from "./array-utils";

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

test("repeatUntil", () => {
  expect(repeatUntil([1, 2, 3], 5)).toEqual([1, 2, 3, 1, 2]);
  expect(repeatUntil([1, 2, 3], 1)).toEqual([1, 2, 3]);
});

test("ArrayFrom", () => {
  // Arrays remain arrays
  const arr = ArrayFrom([1, 2, 3]);
  expect([...arr]).toEqual([1, 2, 3]);

  // Objects convert to arrays of values
  const objArr = ArrayFrom({ 0: 1, 1: 2, 2: 3 });
  expect([...objArr]).toEqual([1, 2, 3]);

  // forEach with arrays uses numeric indices
  const arrVals: Array<unknown> = [];
  ArrayFrom([10, 20, 30]).forEach((val, index) => {
    arrVals.push(val);
  });
  expect(arrVals).toEqual([10, 20, 30]);

  // forEach with objects - keys need to be tracked separately
  const objVals: Array<unknown> = [];
  const obj = { first: "a", second: "b" };
  ArrayFrom(obj).forEach((val) => {
    objVals.push(val);
  });
  expect(objVals).toEqual(["a", "b"]);

  // Edge cases
  expect([...ArrayFrom(null)]).toEqual([]);
  expect([...ArrayFrom(undefined)]).toEqual([]);
  expect([...ArrayFrom(123)]).toEqual([]);
});
