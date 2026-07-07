export const repeatUntil = <Item>(array: Item[], count: number) => {
  const repeatedArray: Item[] = [];
  for (let index = 0; index < Math.max(count, array.length); index += 1) {
    repeatedArray.push(array[index % array.length]);
  }
  return repeatedArray;
};
