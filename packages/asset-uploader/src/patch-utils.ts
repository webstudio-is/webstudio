import { applyPatches, enableMapSet, enablePatches, type Patch } from "immer";

enableMapSet();
enablePatches();

export type { Patch };

export const assertPostgrestSuccess = (result: { error: unknown }) => {
  if (result.error) {
    throw result.error;
  }
};

export const applyValidatedMapPatches = <Key, Value>(
  current: Map<Key, Value>,
  patches: Patch[],
  parse: (value: unknown) => Map<Key, Value>
) => parse(applyPatches(current, patches));

export const diffMaps = <Key, Value>(
  current: ReadonlyMap<Key, Value>,
  next: ReadonlyMap<Key, Value>,
  isEqual: (current: Value, next: Value) => boolean
) => {
  const added: Value[] = [];
  const updated: Value[] = [];
  for (const [key, value] of next) {
    const previous = current.get(key);
    if (previous === undefined) {
      added.push(value);
    } else if (isEqual(previous, value) === false) {
      updated.push(value);
    }
  }
  return {
    added,
    updated,
    deletedKeys: Array.from(current.keys()).filter(
      (key) => next.has(key) === false
    ),
  };
};
