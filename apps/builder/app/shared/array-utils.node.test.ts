import { expect, test } from "vitest";
import { repeatUntil } from "./array-utils";

test("repeatUntil", () => {
  expect(repeatUntil([1, 2, 3], 5)).toEqual([1, 2, 3, 1, 2]);
  expect(repeatUntil([1, 2, 3], 1)).toEqual([1, 2, 3]);
});
