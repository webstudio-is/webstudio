import { expect, test } from "@jest/globals";
import { setDifference } from "./shim";

test("set difference", () => {
  // this set is bigger than other
  expect(setDifference(new Set([1, 2, 3, 4]), new Set([3, 4, 5]))).toEqual(
    new Set([1, 2])
  );
  // this set is smaller than other
  expect(setDifference(new Set([1, 2, 3]), new Set([2, 3, 4, 5]))).toEqual(
    new Set([1])
  );
});
