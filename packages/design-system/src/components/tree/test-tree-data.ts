import produce from "immer";

export type Item = {
  id: string;
  canAcceptChildren: boolean;
  children: Item[];
};

export const getItemPathWithPositions = (tree: Item, itemId: string) => {
  const path = [];

  const find = (item: Item) => {
    if (item.id === itemId) return true;
    const children = item.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (typeof child === "string") continue;
      const found = find(child);
      if (found) {
        path.push({ item: child, position: i });
        return true;
      }
    }
  };

  if (find(tree)) {
    path.push({ item: tree, position: 0 });
  }

  return path.reverse();
};

export const getItemPath = (tree: Item, id: string) =>
  getItemPathWithPositions(tree, id).map(({ item }) => item);

export const canAcceptChild = (item: Item) => item.canAcceptChildren;

export const getItemChildren = (item: Item) => item.children;

export const findItemById = (root: Item, id: string) => {
  const path = getItemPath(root, id);
  return path.length > 0 ? path[path.length - 1] : undefined;
};

export const reparent = (
  root: Item,
  {
    itemId,
    dropTarget,
  }: {
    itemId: string;
    dropTarget: {
      itemId: string;
      position: number | "end";
    };
  }
) =>
  produce(root, (draft) => {
    const path = getItemPath(draft, itemId);
    const item = path[path.length - 1];
    const currentParent = path[path.length - 2];
    const newParent = findItemById(draft, dropTarget.itemId);

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
