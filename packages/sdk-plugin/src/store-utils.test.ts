import { test, expect } from "@jest/globals";
import { type ReadableAtom, atom } from "nanostores";
import { shallowComputed } from "./store-utils";

type StoreValue<Store extends ReadableAtom> = Readonly<
  ReturnType<Store["get"]>
>;

test("shallowComputed provides same reference when object/array values not changed", () => {
  const list = atom([
    { type: "a", value: 0 },
    { type: "b", value: 1 },
    { type: "a", value: 2 },
  ]);

  const filtered = shallowComputed([list], (list) => {
    return list.filter((item) => item.type === "a");
  });

  let prevList: StoreValue<typeof filtered> = filtered.get();
  let computedList: StoreValue<typeof filtered> = filtered.get();
  filtered.subscribe((list) => {
    computedList = list;
  });

  expect(prevList).toBe(computedList);

  // preserve the reference of array with same items
  list.set([...list.get(), { type: "b", value: 3 }]);
  expect(prevList).toBe(computedList);

  // update reference when items added
  list.set([...list.get(), { type: "a", value: 4 }]);
  expect(prevList).not.toBe(computedList);
  expect(computedList).toEqual([
    { type: "a", value: 0 },
    { type: "a", value: 2 },
    { type: "a", value: 4 },
  ]);
  prevList = computedList;

  list.set([...list.get(), { type: "b", value: 5 }]);
  expect(prevList).toBe(computedList);

  // update reference when items added
  list.set(list.get().filter((item) => item.value !== 2));
  expect(prevList).not.toBe(computedList);
  expect(computedList).toEqual([
    { type: "a", value: 0 },
    { type: "a", value: 4 },
  ]);
  prevList = computedList;

  list.off();
  filtered.off();
});
