import type { Placement } from "../primitives/dnd";

export type ItemId = string;

export type ItemSelector = string[];

export type ItemDropTarget = {
  itemSelector: ItemSelector;
  rect: DOMRect;
  indexWithinChildren: number;
  placement: Placement;
};

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

export const getItemSelectorFromElement = (element: Element) => {
  const itemSelector: ItemSelector = [];
  let matched: undefined | Element =
    element.closest(`[data-drop-target-id]`) ?? undefined;
  while (matched) {
    const itemId = matched.getAttribute("data-drop-target-id") ?? undefined;
    if (itemId !== undefined) {
      itemSelector.push(itemId);
    }
    matched =
      matched.parentElement?.closest(`[data-drop-target-id]`) ?? undefined;
  }
  return itemSelector;
};

export const areItemSelectorsEqual = (
  left: undefined | ItemSelector,
  right: undefined | ItemSelector
) => {
  if (left === undefined || right === undefined) {
    return false;
  }
  return left.join(",") === right.join(",");
};
