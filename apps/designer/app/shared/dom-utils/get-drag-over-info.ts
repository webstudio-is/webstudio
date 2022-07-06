import type { Coordinate, DragOverInfo } from "./types";

const elementFromPoint = (coordinate: Coordinate): HTMLElement | undefined => {
  const element = document.elementFromPoint(coordinate.x, coordinate.y);
  if (element instanceof HTMLElement) return element;
};

/**
 * Get element we are hovering over from coordinate.
 * When nearing to an edge of an element - return the parent.
 */
export const getDragOverInfo = (
  offset: Coordinate,
  getBoundingClientRect: (element: Element) => DOMRect
): DragOverInfo => {
  let element = elementFromPoint(offset);
  let edge: DragOverInfo["edge"] = "none";

  if (element === undefined) return { element, edge };

  const { bottom, y } = getBoundingClientRect(element);
  // We are at the top/bottom edge and this means user wants
  // to insert after that element into its parent
  if (offset.y - y <= 5) edge = "top";
  if (bottom - offset.y <= 5) edge = "bottom";

  if (edge === "none") return { element, edge };

  const { parentElement } = element;

  if (parentElement !== null && parentElement !== document.body) {
    element = parentElement;
  }

  return { element, edge };
};
