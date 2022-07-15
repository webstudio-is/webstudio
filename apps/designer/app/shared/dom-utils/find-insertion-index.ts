import type { DragOverMeta, ClosestChildMeta } from "./types";

/**
 * Returns a numeric position at which an instance element should be inserted in the DOM.
 */
export const findInsertionIndex = (
  dropTargetMeta: DragOverMeta,
  closestChildMeta: ClosestChildMeta
): number => {
  const index = [...(dropTargetMeta.element?.children || [])].indexOf(
    closestChildMeta.element
  );
  let insertionIndex = 0;
  if (closestChildMeta.relativePosition == "inside") {
    if (dropTargetMeta.edge === "top") insertionIndex = index;
    else if (dropTargetMeta.edge === "bottom") insertionIndex = index + 1;
    else return 0;
  } else {
    insertionIndex =
      closestChildMeta.relativePosition === "before" ? index - 1 : index + 1;
  }
  if (insertionIndex < 0) return 0;
  return insertionIndex;
};
