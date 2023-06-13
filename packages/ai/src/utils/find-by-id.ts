export const findById = function findById<BuildItemType>(
  buildItem: [string, BuildItemType][],
  searchId: string
) {
  const found = buildItem.find(([id]) => id === searchId);
  return found ? found[1] : undefined;
};
