import { expect, test } from "vitest";
import {
  getCollectionEntries,
  generateCollectionIterationCode,
} from "./collection-utils";

test("getCollectionEntries handles arrays", () => {
  expect(getCollectionEntries(["a", "b", "c"])).toEqual([
    [0, "a"],
    [1, "b"],
    [2, "c"],
  ]);
});

test("getCollectionEntries handles objects", () => {
  expect(getCollectionEntries({ first: "a", second: "b" })).toEqual([
    ["first", "a"],
    ["second", "b"],
  ]);
});

test("getCollectionEntries handles null/undefined", () => {
  expect(getCollectionEntries(null)).toEqual([]);
  expect(getCollectionEntries(undefined)).toEqual([]);
});

test("getCollectionEntries handles non-objects", () => {
  expect(getCollectionEntries(42)).toEqual([]);
  expect(getCollectionEntries("string")).toEqual([]);
  expect(getCollectionEntries(true)).toEqual([]);
});

test("generateCollectionIterationCode produces correct template", () => {
  const code = generateCollectionIterationCode({
    dataExpression: "myData",
    keyVariable: "index",
    itemVariable: "item",
  });

  expect(code).toBe(`Object.entries(
  // @ts-ignore
  myData ?? {}
).map(([_key, item]: any) => {
  const index = Array.isArray(myData) ? Number(_key) : _key;
  return`);
});

test("generated code works with arrays at runtime", () => {
  // @ts-expect-error - used in eval below
  const data = ["apple", "banana", "orange"];
  const result: Array<[string, string]> = [];

  // Simulate generated code
  eval(`
    Object.entries(data ?? {}).map(([index, item]) => {
      result.push([index, item]);
    });
  `);

  expect(result).toEqual([
    ["0", "apple"],
    ["1", "banana"],
    ["2", "orange"],
  ]);
});

test("generated code works with objects at runtime", () => {
  // @ts-expect-error - used in eval below
  const data = { first: "apple", second: "banana" };
  const result: Array<[string, string]> = [];

  // Simulate generated code
  eval(`
    Object.entries(data ?? {}).map(([index, item]) => {
      result.push([index, item]);
    });
  `);

  expect(result).toEqual([
    ["first", "apple"],
    ["second", "banana"],
  ]);
});

test("generated code handles null/undefined", () => {
  // @ts-expect-error - used in eval below
  let data: null | undefined = null;
  const resultNull: Array<[string, unknown]> = [];

  eval(`
    Object.entries(data ?? {}).map(([index, item]) => {
      resultNull.push([index, item]);
    });
  `);

  expect(resultNull).toEqual([]);

  data = undefined;
  const resultUndefined: Array<[string, unknown]> = [];

  eval(`
    Object.entries(data ?? {}).map(([index, item]) => {
      resultUndefined.push([index, item]);
    });
  `);

  expect(resultUndefined).toEqual([]);
});
