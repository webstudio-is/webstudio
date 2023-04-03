import produce from "immer";
import type { ItemSelector } from "./item-utils";

export type Item = {
  id: string;
  canAcceptChildren: boolean;
  isHidden?: boolean;
  children: Item[];
};

export const getItemPath = (tree: Item, itemId: string) => {
  const path = [];

  const find = (item: Item) => {
    if (item.id === itemId) {
      return true;
    }
    const children = item.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (typeof child === "string") {
        continue;
      }
      const found = find(child);
      if (found) {
        path.push(child);
        return true;
      }
    }
  };

  if (find(tree)) {
    path.push(tree);
  }

  return path.reverse();
};

export const canAcceptChild = (item: Item) => item.canAcceptChildren;

export const getItemChildren = (item: Item) => item.children;

export const findItemById = (root: Item, id: string) => {
  const path = getItemPath(root, id);
  return path.length > 0 ? path[path.length - 1] : undefined;
};

export const reparent = (
  root: Item,
  {
    itemSelector,
    dropTarget,
  }: {
    itemSelector: ItemSelector;
    dropTarget: {
      itemSelector: ItemSelector;
      position: number | "end";
    };
  }
) =>
  produce(root, (draft) => {
    const [itemId] = itemSelector;
    const path = getItemPath(draft, itemId);
    const item = path[path.length - 1];
    const currentParent = path[path.length - 2];
    const newParent = findItemById(draft, dropTarget.itemSelector[0]);

    if (
      item === undefined ||
      currentParent === undefined ||
      newParent === undefined
    ) {
      return;
    }

    const currentIndex = currentParent.children.findIndex(
      (child) => child.id === itemId
    );

    currentParent.children.splice(currentIndex, 1);

    if (dropTarget.position === "end") {
      newParent.children.push(item);
    } else {
      let newIndex = dropTarget.position;

      // dropTarget.position does not take into account the fact that the drag item will be removed
      if (currentParent.id === newParent.id && currentIndex < newIndex) {
        newIndex--;
      }

      newParent.children.splice(newIndex, 0, item);
    }
  });
