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
