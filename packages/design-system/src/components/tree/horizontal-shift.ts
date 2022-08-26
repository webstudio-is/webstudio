import { useMemo, useState } from "react";
import { DropTarget, Placement } from "../primitives/dnd";
import { getPlacementIndicatorAlignment } from "./tree-node";

export type ShiftedDropTarget<Data> = {
  item: Data;
  position: number | "end";
  placement?: Placement;
};

export const useHorizontalShift = <Data extends { id: string }>({
  dragItem,
  dropTarget,
  root,
  getIsExpanded,
  getItemPath,
  getItemPathWithPositions,
  canAcceptChild,
  getItemChildren,
}: {
  getItemChildren: (item: Data) => Data[];
  canAcceptChild: (item: Data) => boolean;
  getItemPath: (root: Data, id: string) => Data[];
  getItemPathWithPositions: (
    root: Data,
    id: string
  ) => Array<{ item: Data; position: number }>;
  dragItem: Data | undefined;
  dropTarget: DropTarget<Data> | undefined;
  root: Data;
  getIsExpanded: (item: Data) => boolean;
}) => {
  const [horizontalShift, setHorizontalShift] = useState(0);

  const dragItemDepth = useMemo(
    () => dragItem && getItemPath(root, dragItem.id).length - 1,
    [dragItem, root, getItemPath]
  );

  // Here we want to allow user to shift placement line horizontally
  // but only if that corresponds to a meaningful position in the tree
  const shiftedDropTarget = useMemo<ShiftedDropTarget<Data> | undefined>(() => {
    if (
      dropTarget === undefined ||
      dragItemDepth === undefined ||
      dragItem === undefined
    ) {
      return undefined;
    }

    const { data, placement, indexWithinChildren } = dropTarget;

    const shiftPlacement = (depth: number) => {
      const shift = getPlacementIndicatorAlignment(depth);
      return {
        ...placement,
        x: placement.x + shift,
        length: placement.length - shift,
      };
    };

    // Placement type “inside-parent” means that useDrop() didn’t find any children.
    // In this case the placement line coordinates are meaningless in the context of the tree.
    // We're dropping the placement and not performing any shifting.
    if (placement.type === "inside-parent") {
      return { item: data, position: "end" };
    }

    const dropTargetPath = getItemPathWithPositions(root, data.id);
    dropTargetPath.reverse();

    const currentDepth = dropTargetPath.length;
    const desiredDepth = dragItemDepth + horizontalShift;

    const withoutShift = {
      item: data,
      position: indexWithinChildren,
      placement: shiftPlacement(currentDepth),
    } as const;

    const isDragItem = (item: Data | undefined) =>
      typeof item === "object" && item.id === dragItem.id;

    if (desiredDepth < currentDepth) {
      let shifted = 0;
      let newParent = data;
      let newPosition = indexWithinChildren;

      const isAtTheBottom = (parent: Data, index: number) => {
        const children = getItemChildren(parent);

        // There's a special case when the placement line is above the drag item.
        // For reparenting, above and below the drag item means the same.
        const indexCorrected = isDragItem(children[index]) ? index + 1 : index;
        return indexCorrected === children.length;
      };

      let potentialNewParent = dropTargetPath[shifted + 1];

      while (
        isAtTheBottom(newParent, newPosition) &&
        typeof potentialNewParent === "object" &&
        canAcceptChild(potentialNewParent.item) &&
        shifted < currentDepth - desiredDepth
      ) {
        shifted++;
        newPosition = dropTargetPath[shifted - 1].position + 1;
        newParent = potentialNewParent.item;
        potentialNewParent = dropTargetPath[shifted + 1];
      }

      if (shifted === 0) {
        return withoutShift;
      }

      return {
        item: newParent,
        position: newPosition,
        placement: shiftPlacement(currentDepth - shifted),
      };
    }

    if (desiredDepth > currentDepth) {
      let shifted = 0;
      let newParent = data;

      const findNextParent = (
        parent: Data,
        position: number | "last"
      ): undefined | Data => {
        const children = getItemChildren(parent);
        const index = position === "last" ? children.length - 1 : position;

        // There's a special case when the placement line is below the drag item.
        // For reparenting, above and below the drag item means the same.
        return isDragItem(children[index])
          ? children[index - 1]
          : children[index];
      };

      let potentialNewParent = findNextParent(data, indexWithinChildren - 1);

      while (
        typeof potentialNewParent === "object" &&
        getIsExpanded(potentialNewParent) &&
        canAcceptChild(potentialNewParent) &&
        shifted < desiredDepth - currentDepth
      ) {
        newParent = potentialNewParent;
        potentialNewParent = findNextParent(newParent, "last");
        shifted++;
      }

      if (shifted === 0) {
        return withoutShift;
      }

      return {
        item: newParent,
        position: "end",
        placement: shiftPlacement(currentDepth + shifted),
      };
    }

    return withoutShift;
  }, [
    dropTarget,
    dragItemDepth,
    dragItem,
    getItemPathWithPositions,
    root,
    horizontalShift,
    canAcceptChild,
    getItemChildren,
    getIsExpanded,
  ]);

  return [shiftedDropTarget, setHorizontalShift] as const;
};
