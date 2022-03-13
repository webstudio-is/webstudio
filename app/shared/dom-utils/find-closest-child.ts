import type { Coordinate, ClosestChildInfo } from "./types";

const calculateDistance = (coordinate: Coordinate, rect: DOMRect): number => {
  const distanceX = Math.max(
    rect.left - coordinate.x,
    0,
    coordinate.x - rect.right
  );
  const distanceY = Math.max(
    rect.top - coordinate.y,
    0,
    coordinate.y - rect.bottom
  );
  return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
};

const sortNumbers = (a: number, b: number): number => a - b;

// There is a gotcha with relative position, it can have top/right/bottom/left too and so will not
// be positioned by layout, but we ignore this for now.
const isPositionedElement = (
  element: Element,
  getComputedStyle: (element: Element) => CSSStyleDeclaration
): boolean => {
  const { position } = getComputedStyle(element);
  return position !== "static" && position !== "relative";
};

/**
 * Find the closest element relative to coordinates inside a parent element.
 */
export const findClosestChild = (
  parentElement: Element,
  coordinate: Coordinate,
  getBoundingClientRect: (element: Element) => DOMRect,
  getComputedStyle: (element: Element) => CSSStyleDeclaration
): ClosestChildInfo | void => {
  // Collect bounding client rects for all children.
  if (parentElement.children.length === 0) return;

  // Find the closest child by coordinate
  const distances = [];
  const distanceElementMap = new Map();
  for (const child of parentElement.children) {
    if (isPositionedElement(child, getComputedStyle)) continue;
    const rect = getBoundingClientRect(child);
    const distance = calculateDistance(coordinate, rect);
    distances.push(distance);
    distanceElementMap.set(distance, child);
  }

  distances.sort(sortNumbers);

  // For now we are only interested if we are nearing the element from the top or bottom
  const element = distanceElementMap.get(distances[0]);
  const rect = getBoundingClientRect(element);

  const relativePosition =
    coordinate.y - rect.top < 0
      ? "before"
      : coordinate.y - rect.bottom > 0
      ? "after"
      : "inside";

  return { element, relativePosition };
};
