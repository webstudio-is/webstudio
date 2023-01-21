import { type AnyStore, type StoreValue, computed } from "nanostores";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore soon will have definitions
import { shallowEqualArrays, shallowEqualObjects } from "shallow-equal";

type Comparable<Item> = Record<string, Item> | Item[] | null | undefined;

type ValidArrayValue<Item> = Item[] | null | undefined;

type ValidObjectValue<Item> = Record<string, Item> | null | undefined;

const shallowEqual = <Item extends Comparable<Item>>(
  a: Item,
  b: Item
): boolean => {
  if (Array.isArray(a) || Array.isArray(b)) {
    return shallowEqualArrays(
      a as ValidArrayValue<Item>,
      b as ValidArrayValue<Item>
    );
  }

  return shallowEqualObjects(
    a as ValidObjectValue<Item>,
    b as ValidObjectValue<Item>
  );
};

// https://github.com/nanostores/nanostores/blob/0d27b0d18d0f471ca0ac5439137d3dac71d01f08/computed/index.d.ts

type StoreValues<Stores extends AnyStore[]> = {
  [Index in keyof Stores]: StoreValue<Stores[Index]>;
};

export const shallowComputed = <Value, OriginStores extends AnyStore[]>(
  stores: [...OriginStores],
  cb: (...values: StoreValues<OriginStores>) => Value
) => {
  let prevComputed: Value;
  return computed<Value, OriginStores>(stores, (...values) => {
    const nextComputed = cb(...values);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (shallowEqual<any>(prevComputed, nextComputed)) {
      return prevComputed;
    } else {
      prevComputed = nextComputed;
      return nextComputed;
    }
  });
};
