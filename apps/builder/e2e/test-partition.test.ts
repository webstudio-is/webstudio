import { expect, test } from "vitest";
import { isTestInPartition, parseTestPartition } from "./test-partition";

test("parses one-based test partitions", () => {
  expect(parseTestPartition(undefined)).toBeUndefined();
  expect(parseTestPartition("")).toBeUndefined();
  expect(parseTestPartition("2/3")).toEqual({ index: 1, total: 3 });
  expect(() => parseTestPartition("0/2")).toThrow("out of range");
  expect(() => parseTestPartition("3/2")).toThrow("out of range");
  expect(() => parseTestPartition("first/2")).toThrow("form 1/2");
});

test("distributes indexes deterministically", () => {
  const first = parseTestPartition("1/2");
  const second = parseTestPartition("2/2");
  expect(
    [0, 1, 2, 3, 4].filter((index) => isTestInPartition(index, first))
  ).toEqual([0, 2, 4]);
  expect(
    [0, 1, 2, 3, 4].filter((index) => isTestInPartition(index, second))
  ).toEqual([1, 3]);
});
