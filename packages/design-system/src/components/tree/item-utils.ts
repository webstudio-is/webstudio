export type ItemId = string;

export type ItemSelector = string[];

export const getElementByItemSelector = (
  root: undefined | Element,
  itemSelector: ItemSelector
) => {
  // query item from root to target
  const domSelector = itemSelector
    .map((id) => `[data-drop-target-id="${id}"]`)
    .reverse()
    .join(" ");
  const [itemId] = itemSelector;
  return (
    root?.querySelector(`${domSelector} [data-item-button-id="${itemId}"]`) ??
    undefined
  );
};

export const areItemSelectorsEqual = (
  left?: ItemSelector,
  right?: ItemSelector
) => {
  if (left === undefined || right === undefined) {
    return false;
  }
  return left.join(",") === right.join(",");
};
