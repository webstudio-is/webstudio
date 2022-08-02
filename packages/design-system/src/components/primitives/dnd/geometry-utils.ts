export type Rect = Pick<DOMRect, "top" | "left" | "width" | "height">;

export type ChildrenOrientation = "vertical" | "horizontal" | "mixed";

export type Placement = {
  x: number;
  y: number;
  length: number;
  direction: "horizontal" | "vertical";
};

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

export const isEqualRect = (a: Rect | undefined, b: Rect) =>
  a !== undefined &&
  a.top === b.top &&
  a.left === b.left &&
  a.width === b.width &&
  a.height === b.height;

export const isNearEdge = (
  { x, y }: { x: number; y: number },
  edgeDistanceThreshold: number,
  rect: Rect
) =>
  Math.min(
    y - rect.top,
    rect.top + rect.height - y,
    x - rect.left,
    rect.left + rect.width - x
  ) <= edgeDistanceThreshold;

export const getPlacementBetween = (
  a: Rect | undefined,
  b: Rect | undefined
): Placement | undefined => {
  if (a === undefined || b === undefined) {
    return undefined;
  }

  const [firstY, secondY] = a.top < b.top ? [a, b] : [b, a];
  const [firstX, secondX] = a.left < b.left ? [a, b] : [b, a];
  const distanceY = secondY.top - firstY.top - firstY.height;
  const distanceX = secondX.left - firstX.left - firstX.width;

  // if rects overlap we don't want to put placement between them
  if (distanceX < 0 && distanceY < 0) {
    return undefined;
  }

  if (distanceX < 0 || (distanceY >= 0 && distanceY < distanceX)) {
    const minX = Math.min(a.left, b.left);
    const maxX = Math.max(a.left + a.width, b.left + b.width);
    return {
      y: firstY.top + firstY.height + distanceY / 2,
      x: minX,
      length: maxX - minX,
      direction: "horizontal",
    };
  }

  const minY = Math.min(a.top, b.top);
  const maxY = Math.max(a.top + a.height, b.top + b.height);
  return {
    y: minY,
    x: firstX.left + firstX.width + distanceX / 2,
    length: maxY - minY,
    direction: "vertical",
  };
};

export const getPlacementNextTo = (
  parentRect: Rect,
  rect: Rect | undefined,
  side: "top" | "bottom" | "left" | "right"
): Placement | undefined => {
  if (rect === undefined) {
    return undefined;
  }

  const margin = 5;

  if (side === "top") {
    return {
      x: rect.left,
      y: Math.min(rect.top, Math.max(0, rect.top - margin)),
      length: rect.width,
      direction: "horizontal",
    };
  }

  if (side === "bottom") {
    return {
      x: rect.left,
      y: Math.max(
        rect.top + rect.height,
        Math.min(parentRect.height, rect.top + margin)
      ),
      length: rect.width,
      direction: "horizontal",
    };
  }

  if (side === "left") {
    return {
      x: Math.min(rect.left, Math.max(0, rect.left - margin)),
      y: rect.top,
      length: rect.height,
      direction: "vertical",
    };
  }

  return {
    x: Math.max(
      rect.left + rect.width,
      Math.min(parentRect.width, rect.left + margin)
    ),
    y: rect.top,
    length: rect.height,
    direction: "vertical",
  };
};

export const getPlacementInside = (
  parentRect: Rect,
  childrenOrientation: ChildrenOrientation
): Placement => {
  const padding = 5;

  if (childrenOrientation === "horizontal") {
    const safePadding = Math.min(parentRect.width / 2, padding);
    return {
      y: parentRect.top + safePadding,
      x: parentRect.left + safePadding,
      length: parentRect.height - safePadding * 2,
      direction: "vertical",
    };
  }

  const safePadding = Math.min(parentRect.height / 2, padding);
  return {
    y: parentRect.top + safePadding,
    x: parentRect.left + safePadding,
    length: parentRect.width - safePadding * 2,
    direction: "horizontal",
  };
};

export const getRectsOrientation = (
  first: Rect | undefined,
  second: Rect,
  third: Rect | undefined
): ChildrenOrientation => {
  // @todo: We need a slightly more sofisticated way to determine orientation.
  // For example, detect this as "vertical":
  //   [    ]
  //    [  ]

  // @todo: add "vertical-reversed", "horizontal-reversed", "mixed-reversed"

  if (
    (first === undefined || first.top === second.top) &&
    (third === undefined || third.top === second.top)
  ) {
    return "horizontal";
  }

  if (
    (first === undefined || first.left === second.left) &&
    (third === undefined || third.left === second.left)
  ) {
    return "vertical";
  }

  return "mixed";
};

// Determines whether we should place the item before or after the closest child.
// Returns the number that should be added to the closest child index to get the final index.
export const getIndexAdjustment = (
  pointer: { x: number; y: number },
  closestChildRect: Rect | undefined,
  childrenOrientation: ChildrenOrientation
) => {
  if (closestChildRect === undefined) {
    return 0;
  }

  const { top, left, width, height } = closestChildRect;

  if (childrenOrientation === "vertical") {
    const middleY = top + height / 2;
    return pointer.y < middleY ? 0 : 1;
  }

  if (childrenOrientation === "horizontal") {
    const middleX = left + width / 2;
    return pointer.x < middleX ? 0 : 1;
  }

  // For the "mixed" orientation,
  // we are looking at whether the pointer is above or below the diagonal

  // diagonal equation
  const getDiagonalY = (diagonalX: number) => {
    if (width === 0) {
      return undefined;
    }
    const slope = height / width;
    const topRightCorner = { x: left + width, y: top };
    return slope * (topRightCorner.x - diagonalX) + topRightCorner.y;
  };

  const diagonalY = getDiagonalY(pointer.x);
  if (diagonalY === undefined) {
    return 0;
  }
  return pointer.y < diagonalY ? 0 : 1;
};
