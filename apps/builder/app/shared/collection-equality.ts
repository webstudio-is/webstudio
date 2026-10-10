export const areMapsShallowEqual = <Key, Value>(
  left: ReadonlyMap<Key, Value> | undefined,
  right: ReadonlyMap<Key, Value> | undefined
) => {
  if (left === right) {
    return true;
  }
  if (left === undefined || right === undefined || left.size !== right.size) {
    return false;
  }
  for (const [key, value] of left) {
    if (
      right.has(key) === false ||
      Object.is(right.get(key), value) === false
    ) {
      return false;
    }
  }
  return true;
};

export const areSetsEqual = <Value>(
  left: ReadonlySet<Value>,
  right: ReadonlySet<Value>
) => left.size === right.size && [...left].every((value) => right.has(value));
