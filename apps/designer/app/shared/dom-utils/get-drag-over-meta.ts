import type { Instance } from "@webstudio-is/sdk";
import { findClosestAcceptingParent, findInstanceById } from "../tree-utils";
import type { Coordinate, DragOverMeta } from "./types";

const elementFromPoint = (coordinate: Coordinate): HTMLElement | undefined => {
  const element = document.elementFromPoint(coordinate.x, coordinate.y);
  if (element instanceof HTMLElement) return element;
};

/**
 * Get element we are hovering over from coordinate.
 * When nearing to an edge of an element - return the parent.
 */
export const getDragOverMeta = ({
  offset,
  getBoundingClientRect,
  rootInstance,
}: {
  offset: Coordinate;
  getBoundingClientRect: (element: Element) => DOMRect;
  rootInstance: Instance;
}): DragOverMeta | undefined => {
  let element = elementFromPoint(offset);
  let edge: DragOverMeta["edge"] = "none";

  if (element === undefined) return;

  const id = element.dataset.id;
  if (id === undefined) return;

  const hoveredInstance = findInstanceById(rootInstance, id);
  const targetInstance = findClosestAcceptingParent(
    rootInstance,
    hoveredInstance
  );
  if (targetInstance !== hoveredInstance) {
    element = document.getElementById(targetInstance.id) || undefined;
  }

  if (element === undefined) return;

  const { bottom, y } = getBoundingClientRect(element);
  // We are at the top/bottom edge and this means user wants
  // to insert after that element into its parent
  if (offset.y - y <= 5) edge = "top";
  if (bottom - offset.y <= 5) edge = "bottom";

  // We are at the edge of an element, means we want to return its parent elemennt
  if (edge !== "none") {
    const { parentElement } = element;

    if (parentElement !== null && parentElement !== document.body) {
      element = parentElement;
    }
  }

  return { element, edge, instance: targetInstance };
};
