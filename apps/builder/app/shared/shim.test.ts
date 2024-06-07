import { expect, test } from "@jest/globals";
import { mapGroupBy, setDifference } from "./shim";

test("Set.prototype.difference", () => {
  // this set is bigger than other
  expect(setDifference(new Set([1, 2, 3, 4]), new Set([3, 4, 5]))).toEqual(
    new Set([1, 2])
  );
  // this set is smaller than other
  expect(setDifference(new Set([1, 2, 3]), new Set([2, 3, 4, 5]))).toEqual(
    new Set([1])
  );
});

test("Map.groupBy", () => {
  expect(mapGroupBy([1, 2, 3, 4, 5], (item) => item % 2)).toEqual(
    new Map([
      [0, [2, 4]],
      [1, [1, 3, 5]],
    ])
  );
});
