import { useMemo, useState } from "react";
import type { Placement } from "../primitives/dnd";
import type { ItemDropTarget, ItemSelector } from "./item-utils";
import { getPlacementIndicatorAlignment } from "./tree-node";

export type ShiftedDropTarget<Data> = {
  item: Data;
  position: number | "end";
  placement?: Placement;
};

export const useHorizontalShift = <Data extends { id: string }>({
  dragItemSelector,
  dropTarget,
  root,
  getIsExpanded,
  getItemPath,
  canAcceptChild,
  getItemChildren,
}: {
  getItemChildren: (item: Data) => Data[];
  canAcceptChild: (item: Data) => boolean;
  getItemPath: (root: Data, id: string) => Data[];
  dragItemSelector: undefined | ItemSelector;
  dropTarget: ItemDropTarget<Data> | undefined;
  root: Data;
  getIsExpanded: (item: Data) => boolean;
}) => {
  const [horizontalShift, setHorizontalShift] = useState(0);

  // Here we want to allow user to shift placement line horizontally
  // but only if that corresponds to a meaningful position in the tree
  const shiftedDropTarget = useMemo<ShiftedDropTarget<Data> | undefined>(() => {
    if (dropTarget === undefined || dragItemSelector === undefined) {
      return undefined;
    }

    const dragItemDepth = dragItemSelector.length - 1;

    const {
      itemSelector: dropItemSelector,
      data,
      placement,
      indexWithinChildren,
    } = dropTarget;

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

    const currentDepth = dropItemSelector.length;
    const desiredDepth = dragItemDepth + horizontalShift;

    const withoutShift = {
      item: data,
      position: indexWithinChildren,
      placement: shiftPlacement(currentDepth),
    } as const;

    const [dragItemId] = dragItemSelector;
    const isDragItem = (item: Data | undefined) => item?.id === dragItemId;

    const dropTargetPath = getItemPath(root, data.id);
    dropTargetPath.reverse();

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

      // skip drop item
      for (let index = 1; index < dropTargetPath.length; index += 1) {
        const potentialNewParent = dropTargetPath[index];
        if (
          isAtTheBottom(newParent, newPosition) &&
          canAcceptChild(potentialNewParent) &&
          shifted < currentDepth - desiredDepth
        ) {
          shifted = index;
          newParent = potentialNewParent;
          const child = dropTargetPath[index - 1];
          const childPosition = getItemChildren(newParent).findIndex(
            (item) => item.id === child.id
          );
          newPosition = childPosition + 1;
          continue;
        }
        break;
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
        potentialNewParent &&
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
    dragItemSelector,
    root,
    horizontalShift,
    getItemPath,
    canAcceptChild,
    getItemChildren,
    getIsExpanded,
  ]);

  return [shiftedDropTarget, setHorizontalShift] as const;
};
