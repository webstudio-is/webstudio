export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type Point = { x: number; y: number };

export type ChildrenOrientation =
  | { type: "horizontal" | "vertical"; reverse: boolean }
  | { type: "mixed"; reverse?: boolean };

export type Placement = {
  type: "between-children" | "next-to-child" | "inside-parent";
  x: number;
  y: number;
  length: number;
  direction: "horizontal" | "vertical";
};

export type Area = "top" | "bottom" | "left" | "right" | "center";

// https://stackoverflow.com/a/18157551/478603
const getDistanceToRect = (rect: Rect, { x, y }: Point) => {
  const dx = Math.max(rect.left - x, 0, x - (rect.left + rect.width));
  const dy = Math.max(rect.top - y, 0, y - (rect.top + rect.height));
  return Math.sqrt(dx * dx + dy * dy);
};

export const getClosestRectIndex = (rects: Rect[], point: Point) => {
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

export const getArea = (
  { x, y }: Point,
  edgeDistanceThreshold: number,
  rect: Rect
): Area => {
  if (y - rect.top <= edgeDistanceThreshold) {
    return "top";
  }
  if (rect.top + rect.height - y <= edgeDistanceThreshold) {
    return "bottom";
  }
  if (x - rect.left <= edgeDistanceThreshold) {
    return "left";
  }
  if (rect.left + rect.width - x <= edgeDistanceThreshold) {
    return "right";
  }
  return "center";
};

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

  // if rects aren't aligned (vertically or horizontally)
  // we don't want to put placement between them
  if (distanceX >= 0 && distanceY >= 0) {
    return undefined;
  }

  if (distanceX < 0) {
    const minX = Math.min(a.left, b.left);
    const maxX = Math.max(a.left + a.width, b.left + b.width);
    return {
      type: "between-children",
      y: firstY.top + firstY.height + distanceY / 2,
      x: minX,
      length: maxX - minX,
      direction: "horizontal",
    };
  }

  const minY = Math.min(a.top, b.top);
  const maxY = Math.max(a.top + a.height, b.top + b.height);
  return {
    type: "between-children",
    y: minY,
    x: firstX.left + firstX.width + distanceX / 2,
    length: maxY - minY,
    direction: "vertical",
  };
};

export const getPlacementNextTo = (
  parentRect: Rect,
  rect: Rect | undefined,
  childrenOrientation: ChildrenOrientation,
  direction: "forward" | "backward",
  padding = 5
): Placement | undefined => {
  if (rect === undefined) {
    return undefined;
  }

  const isForward = childrenOrientation.reverse
    ? direction === "backward"
    : direction === "forward";

  const side =
    childrenOrientation.type === "horizontal"
      ? isForward
        ? "right"
        : "left"
      : isForward
      ? "bottom"
      : "top";

  const getMargin = (distnaceToParentEdge: number) =>
    Math.min(padding * 2, Math.max(0, distnaceToParentEdge)) / 2;

  if (side === "top") {
    return {
      type: "next-to-child",
      x: rect.left,
      y: rect.top - getMargin(rect.top),
      length: rect.width,
      direction: "horizontal",
    };
  }

  if (side === "bottom") {
    return {
      type: "next-to-child",
      x: rect.left,
      y:
        rect.top +
        rect.height +
        getMargin(parentRect.height - rect.top - rect.height),
      length: rect.width,
      direction: "horizontal",
    };
  }

  if (side === "left") {
    return {
      type: "next-to-child",
      x: rect.left - getMargin(rect.left),
      y: rect.top,
      length: rect.height,
      direction: "vertical",
    };
  }

  return {
    type: "next-to-child",
    x:
      rect.left +
      rect.width +
      getMargin(parentRect.width - rect.left - rect.width),
    y: rect.top,
    length: rect.height,
    direction: "vertical",
  };
};

export const getPlacementInside = (
  parentRect: Rect,
  childrenOrientation: ChildrenOrientation,
  padding = 5
): Placement => {
  if (childrenOrientation.type === "horizontal") {
    const safePadding = Math.min(parentRect.width / 2, padding);
    return {
      type: "inside-parent",
      y: parentRect.top + safePadding,
      x: parentRect.left + safePadding,
      length: parentRect.height - safePadding * 2,
      direction: "vertical",
    };
  }

  const safePadding = Math.min(parentRect.height / 2, padding);
  return {
    type: "inside-parent",
    y: parentRect.top + safePadding,
    x: parentRect.left + safePadding,
    length: parentRect.width - safePadding * 2,
    direction: "horizontal",
  };
};

const getSegmentsOrder = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): "b-first" | "a-first" | "overlap" => {
  if (aStart >= bEnd) {
    return "b-first";
  }
  if (bStart >= aEnd) {
    return "a-first";
  }
  return "overlap";
};

const getTwoRectsOrientation = (
  first: Rect,
  second: Rect
): ChildrenOrientation => {
  const xOrder = getSegmentsOrder(
    first.left,
    first.left + first.width,
    second.left,
    second.left + second.width
  );
  const yOrder = getSegmentsOrder(
    first.top,
    first.top + first.height,
    second.top,
    second.top + second.height
  );
  if (xOrder !== "overlap" && yOrder === "overlap") {
    return { type: "horizontal", reverse: xOrder === "b-first" };
  }
  if (xOrder === "overlap" && yOrder !== "overlap") {
    return { type: "vertical", reverse: yOrder === "b-first" };
  }

  return { type: "mixed" };
};

export const getRectsOrientation = (
  first: Rect | undefined,
  second: Rect,
  third: Rect | undefined
): ChildrenOrientation => {
  const orientations = [
    first && getTwoRectsOrientation(first, second),
    third && getTwoRectsOrientation(second, third),
  ];

  // @todo: Maybe we should check that at least one is reversed.
  // Need to test what works better, but keep an eye on false positives.
  const allReverse = orientations.every(
    (orientation) => orientation?.reverse !== false
  );

  const types = orientations.map((orientation) => orientation?.type);

  const includesVertical = types.includes("vertical");
  const includesHorizontal = types.includes("horizontal");

  if (includesVertical && includesHorizontal === false) {
    return { type: "vertical", reverse: allReverse };
  }

  if (includesHorizontal && includesVertical === false) {
    return { type: "horizontal", reverse: allReverse };
  }

  return { type: "mixed" };
};

// Determines whether we should place the item before or after the closest child.
// Returns the number that should be added to the closest child index to get the final index.
export const getIndexAdjustment = (
  pointer: Point,
  closestChildRect: Rect | undefined,
  { type: orientationType, reverse }: ChildrenOrientation
) => {
  if (closestChildRect === undefined) {
    return 0;
  }

  const { top, left, width, height } = closestChildRect;

  if (orientationType === "vertical") {
    const middleY = top + height / 2;
    return pointer.y < middleY ? (reverse ? 1 : 0) : reverse ? 0 : 1;
  }

  if (orientationType === "horizontal") {
    const middleX = left + width / 2;
    return pointer.x < middleX ? (reverse ? 1 : 0) : reverse ? 0 : 1;
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
