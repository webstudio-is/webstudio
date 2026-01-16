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

export const repeatUntil = <Item>(array: Item[], count: number) => {
  const repeatedArray: Item[] = [];
  for (let index = 0; index < Math.max(count, array.length); index += 1) {
    repeatedArray.push(array[index % array.length]);
  }
  return repeatedArray;
};
