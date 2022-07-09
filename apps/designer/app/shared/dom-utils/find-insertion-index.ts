import type { DragOverInfo, ClosestChildInfo } from "./types";

export const findInsertionIndex = (
  dragOver: DragOverInfo,
  closestChildInfo: ClosestChildInfo
): number => {
  const index = [...(dragOver.element?.children || [])].indexOf(
    closestChildInfo.element
  );
  let insertionIndex = 0;
  if (closestChildInfo.relativePosition == "inside") {
    if (dragOver.edge === "top") insertionIndex = index;
    else if (dragOver.edge === "bottom") insertionIndex = index + 1;
    else return 0;
  } else {
    insertionIndex =
      closestChildInfo.relativePosition === "before" ? index - 1 : index + 1;
  }
  if (insertionIndex < 0) return 0;
  return insertionIndex;
};
