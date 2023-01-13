type Predicate<T> = (value: T) => boolean;

export const removeByMutable = <T>(array: T[], predicate: Predicate<T>) => {
  // reversed order to splice without breaking index
  for (let index = array.length - 1; index >= 0; index -= 1) {
    if (predicate(array[index])) {
      array.splice(index, 1);
    }
  }
};

export const replaceByOrAppendMutable = <T>(
  array: T[],
  item: T,
  predicate: Predicate<T>
) => {
  const matchedIndex = array.findIndex(predicate);
  if (matchedIndex === -1) {
    array.push(item);
  } else {
    array[matchedIndex] = item;
  }
};
