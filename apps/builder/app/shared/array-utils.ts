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

export const replaceByOrAppendMutable = <Item>(
  array: Item[],
  item: Item,
  predicate: Predicate<Item>
) => {
  const matchedIndex = array.findIndex(predicate);
  if (matchedIndex === -1) {
    array.push(item);
  } else {
    array[matchedIndex] = item;
  }
};
