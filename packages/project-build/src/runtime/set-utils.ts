export const setIsSubsetOf = <T>(set: Set<T>, subset: Set<T>) => {
  for (const item of set) {
    if (subset.has(item) === false) {
      return false;
    }
  }
  return true;
};
