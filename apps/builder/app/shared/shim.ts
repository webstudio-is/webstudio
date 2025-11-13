export const setDifference = <Item>(current: Set<Item>, other: Set<Item>) => {
  const result = new Set<Item>(current);
  if (current.size <= other.size) {
    for (const item of current) {
      if (other.has(item)) {
        result.delete(item);
      }
    }
  } else {
    for (const item of other) {
      if (current.has(item)) {
        result.delete(item);
      }
    }
  }
  return result;
};

export const setUnion = <Item>(current: Set<Item>, other: Set<Item>) => {
  const result = new Set<Item>(current);
  for (const item of other) {
    result.add(item);
  }
  return result;
};

export const setIsSubsetOf = <Item>(current: Set<Item>, other: Set<Item>) => {
  if (current.size > other.size) {
    return false;
  }
  for (const item of current) {
    if (!other.has(item)) {
      return false;
    }
  }
  return true;
};

export const mapGroupBy = <Item, Key>(
  array: Item[] | Iterable<Item>,
  getKey: (item: Item) => Key
) => {
  const groups = new Map<Key, Item[]>();
  for (const item of array) {
    const key = getKey(item);
    let group = groups.get(key);
    if (group === undefined) {
      group = [];
      groups.set(key, group);
    }
    group.push(item);
  }
  return groups;
};

export const objectGroupBy = <Item, Key>(
  array: Item[] | Iterable<Item>,
  getKey: (item: Item) => Key
) => {
  return Object.fromEntries(mapGroupBy(array, getKey));
};

// https://github.com/tc39/proposal-upsert
export const mapGetOrInsert = <Key, Value>(
  map: Map<Key, Value>,
  key: Key,
  defaultValue: Value
): Value => {
  let value = map.get(key);
  if (value === undefined) {
    value = defaultValue;
    map.set(key, value);
  }
  return value;
};
