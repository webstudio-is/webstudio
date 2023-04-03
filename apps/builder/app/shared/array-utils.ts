type Predicate<Item> = (value: Item) => boolean;

export const removeByMutable = <Item>(
  array: Item[],
  predicate: Predicate<Item>
) => {
  // reversed order to splice without breaking index
  for (let index = array.length - 1; index >= 0; index -= 1) {
    if (predicate(array[index])) {
      array.splice(index, 1);
    }
  }
};

export const getMapValuesByKeysSet = <Key, Value>(
  map: Map<Key, Value>,
  keys: Set<Key>
) => {
  const values: Value[] = [];
  for (const key of keys) {
    const value = map.get(key);
    if (value !== undefined) {
      values.push(value);
    }
  }
  return values;
};

export const getMapValuesBy = <Key, Value>(
  map: Map<Key, Value>,
  predicate: Predicate<Value>
) => {
  const values: Value[] = [];
  for (const value of map.values()) {
    if (predicate(value)) {
      values.push(value);
    }
  }
  return values;
};
