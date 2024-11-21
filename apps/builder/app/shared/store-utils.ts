import {
  type AnyStore,
  type ReadableAtom,
  type StoreValue,
  computed,
} from "nanostores";
import { shallowEqual } from "shallow-equal";

// https://github.com/nanostores/nanostores/blob/0d27b0d18d0f471ca0ac5439137d3dac71d01f08/computed/index.d.ts

type StoreValues<Stores extends AnyStore[]> = {
  [Index in keyof Stores]: StoreValue<Stores[Index]>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Comparable = Record<string, any> | any[] | null | undefined;

interface Computed {
  <Value extends Comparable, OriginStores extends AnyStore[]>(
    stores: [...OriginStores],
    cb: (...values: StoreValues<OriginStores>) => Value
  ): ReadableAtom<Value>;
}

export const shallowComputed: Computed = (stores, cb) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prevComputed: any;
  return (computed as Computed)(stores, (...values) => {
    const nextComputed = cb(...values);
    if (shallowEqual(prevComputed, nextComputed)) {
      return prevComputed;
    } else {
      prevComputed = nextComputed;
      return nextComputed;
    }
  });
};
