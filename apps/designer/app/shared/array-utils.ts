export const filterMutable = <T>(
  array: T[],
  predicate: (value: T) => boolean
) => {
  // reversed order to splice without breaking index
  for (let index = array.length - 1; index >= 0; index -= 1) {
    if (predicate(array[index]) === false) {
      array.splice(index, 1);
    }
  }
};
