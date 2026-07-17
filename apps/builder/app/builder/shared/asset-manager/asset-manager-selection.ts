export type AssetManagerSelection =
  | { type: "asset"; id: string }
  | { type: "folder"; id: string };

export type AssetManagerSelectionRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export const createAssetManagerSelectionRect = (
  start: { x: number; y: number },
  end: { x: number; y: number }
): AssetManagerSelectionRect => ({
  left: Math.min(start.x, end.x),
  top: Math.min(start.y, end.y),
  right: Math.max(start.x, end.x),
  bottom: Math.max(start.y, end.y),
});

export const doAssetManagerSelectionRectsIntersect = (
  left: AssetManagerSelectionRect,
  right: AssetManagerSelectionRect
) =>
  left.left <= right.right &&
  left.right >= right.left &&
  left.top <= right.bottom &&
  left.bottom >= right.top;

export const getAssetManagerSelectionKey = (
  item: AssetManagerSelection
): string => `${item.type}:${item.id}`;

export const isSameAssetManagerSelection = (
  left: AssetManagerSelection | undefined,
  right: AssetManagerSelection | undefined
) =>
  left !== undefined &&
  right !== undefined &&
  left.type === right.type &&
  left.id === right.id;

export const includesAssetManagerSelection = (
  selection: readonly AssetManagerSelection[],
  item: AssetManagerSelection
) => selection.some((selected) => isSameAssetManagerSelection(selected, item));

export const getAssetManagerSelectionRange = (
  items: readonly AssetManagerSelection[],
  anchor: AssetManagerSelection,
  target: AssetManagerSelection
): AssetManagerSelection[] => {
  const anchorIndex = items.findIndex((item) =>
    isSameAssetManagerSelection(item, anchor)
  );
  const targetIndex = items.findIndex((item) =>
    isSameAssetManagerSelection(item, target)
  );
  if (anchorIndex === -1 || targetIndex === -1) {
    return [target];
  }
  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return items.slice(start, end + 1);
};

export const toggleAssetManagerSelection = (
  selection: readonly AssetManagerSelection[],
  item: AssetManagerSelection
): AssetManagerSelection[] =>
  includesAssetManagerSelection(selection, item)
    ? selection.filter(
        (selected) => isSameAssetManagerSelection(selected, item) === false
      )
    : [...selection, item];

export const addAssetManagerSelection = (
  selection: readonly AssetManagerSelection[],
  item: AssetManagerSelection
): AssetManagerSelection[] =>
  includesAssetManagerSelection(selection, item)
    ? [...selection]
    : [...selection, item];

export const getAdjacentAssetManagerSelection = ({
  items,
  current,
  direction,
}: {
  items: readonly AssetManagerSelection[];
  current: AssetManagerSelection;
  direction: "previous" | "next";
}): AssetManagerSelection | undefined => {
  const currentIndex = items.findIndex((item) =>
    isSameAssetManagerSelection(item, current)
  );
  if (currentIndex === -1) {
    return;
  }
  const nextIndex =
    direction === "previous" ? currentIndex - 1 : currentIndex + 1;
  return items[nextIndex];
};
