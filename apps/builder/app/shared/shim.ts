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

export const mapGroupBy = <Item, Key>(
  array: Item[] | IterableIterator<Item>,
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
