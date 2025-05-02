import { expect, test } from "vitest";
import { mapGroupBy, setDifference, setIsSubsetOf, setUnion } from "./shim";

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

test("Set.prototype.union", () => {
  expect(setUnion(new Set([2, 4, 6, 8]), new Set([1, 4, 9]))).toEqual(
    new Set([2, 4, 6, 8, 1, 9])
  );
});

test("Set.prototype.isSubsetOf", () => {
  expect(setIsSubsetOf(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBeTruthy();
  expect(setIsSubsetOf(new Set([1, 2]), new Set([1, 2, 3]))).toBeTruthy();
  expect(setIsSubsetOf(new Set(), new Set([1, 2, 3]))).toBeTruthy();
  expect(setIsSubsetOf(new Set(), new Set())).toBeTruthy();
  expect(setIsSubsetOf(new Set([1, 2, 3]), new Set([1, 2]))).toBeFalsy();
  expect(setIsSubsetOf(new Set([1, 2, 3]), new Set())).toBeFalsy();
});

test("Map.groupBy", () => {
  expect(mapGroupBy([1, 2, 3, 4, 5], (item) => item % 2)).toEqual(
    new Map([
      [0, [2, 4]],
      [1, [1, 3, 5]],
    ])
  );
});
