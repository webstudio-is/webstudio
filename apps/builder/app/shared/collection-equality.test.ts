import { describe, expect, test } from "vitest";
import { areMapsShallowEqual, areSetsEqual } from "./collection-equality";

describe("collection equality", () => {
  test("compares map entries without relying on insertion order", () => {
    const value = {};
    expect(
      areMapsShallowEqual(
        new Map([
          ["first", value],
          ["second", 1],
        ]),
        new Map([
          ["second", 1],
          ["first", value],
        ])
      )
    ).toBe(true);
    expect(
      areMapsShallowEqual(new Map([["first", value]]), new Map([["first", {}]]))
    ).toBe(false);
  });

  test("compares set members without relying on insertion order", () => {
    expect(areSetsEqual(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(areSetsEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
  });
});
