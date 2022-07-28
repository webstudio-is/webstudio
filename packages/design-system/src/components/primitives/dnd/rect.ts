export type Rect = Pick<DOMRect, "top" | "left" | "width" | "height">;

// https://stackoverflow.com/a/18157551/478603
const getDistanceToRect = (rect: Rect, { x, y }: { x: number; y: number }) => {
  const dx = Math.max(rect.left - x, 0, x - (rect.left + rect.width));
  const dy = Math.max(rect.top - y, 0, y - (rect.top + rect.height));
  return Math.sqrt(dx * dx + dy * dy);
};

export const getClosestRectIndex = (
  rects: Rect[],
  point: { x: number; y: number }
) => {
  if (rects.length === 0) {
    return -1;
  }

  const sorted = rects
    .map((rect, index) => ({
      index,
      distance: getDistanceToRect(rect, point),
    }))
    .sort((a, b) => a.distance - b.distance);

  return sorted[0].index;
};

export const isEqualRect = (a: Rect | undefined, b: Rect) => {
  return (
    a !== undefined &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
};
