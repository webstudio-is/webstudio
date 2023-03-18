import { useMemo, useState } from "react";
import type { Placement } from "../primitives/dnd";
import type { ItemDropTarget, ItemId, ItemSelector } from "./item-utils";
import { getPlacementIndicatorAlignment } from "./tree-node";

export type ShiftedDropTarget = {
  itemSelector: ItemSelector;
  position: number | "end";
  placement?: Placement;
};

export const useHorizontalShift = <Data extends { id: ItemId }>({
  dragItemSelector,
  dropTarget,
  getIsExpanded,
  canAcceptChild,
  getItemChildren,
}: {
  getItemChildren: (itemId: ItemId) => Data[];
  canAcceptChild: (itemId: ItemId) => boolean;
  dragItemSelector: undefined | ItemSelector;
  dropTarget: ItemDropTarget | undefined;
  getIsExpanded: (itemSelector: ItemSelector) => boolean;
}) => {
  const [horizontalShift, setHorizontalShift] = useState(0);

  // Here we want to allow user to shift placement line horizontally
  // but only if that corresponds to a meaningful position in the tree
  const shiftedDropTarget = useMemo((): ShiftedDropTarget | undefined => {
    if (dropTarget === undefined || dragItemSelector === undefined) {
      return undefined;
    }

    const dragItemDepth = dragItemSelector.length - 1;

    const {
      itemSelector: dropItemSelector,
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
      return { itemSelector: dropItemSelector, position: "end" };
    }

    const currentDepth = dropItemSelector.length;
    const desiredDepth = dragItemDepth + horizontalShift;

    const withoutShift = {
      itemSelector: dropItemSelector,
      position: indexWithinChildren,
      placement: shiftPlacement(currentDepth),
    } as const;

    const [dragItemId] = dragItemSelector;
    const isDragItem = (item: Data | undefined) => item?.id === dragItemId;

    if (desiredDepth < currentDepth) {
      let shifted = 0;
      let newParentSelector = dropItemSelector;
      let newPosition = indexWithinChildren;

      const isAtTheBottom = (parentId: ItemId, index: number) => {
        const children = getItemChildren(parentId);

        // There's a special case when the placement line is above the drag item.
        // For reparenting, above and below the drag item means the same.
        const indexCorrected = isDragItem(children[index]) ? index + 1 : index;
        return indexCorrected === children.length;
      };

      // skip drop item
      for (let index = 1; index < dropItemSelector.length; index += 1) {
        const potentialNewParentId = dropItemSelector[index];
        if (
          isAtTheBottom(newParentSelector[0], newPosition) &&
          canAcceptChild(potentialNewParentId) &&
          shifted < currentDepth - desiredDepth
        ) {
          shifted = index;
          newParentSelector = dropItemSelector.slice(index);
          const childId = dropItemSelector[index - 1];
          const childPosition = getItemChildren(newParentSelector[0]).findIndex(
            (item) => item.id === childId
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
        itemSelector: newParentSelector,
        position: newPosition,
        placement: shiftPlacement(currentDepth - shifted),
      };
    }

    if (desiredDepth > currentDepth) {
      let shifted = 0;
      let newParentSelector = dropItemSelector;

      const findNextParent = (
        parentId: ItemId,
        position: number | "last"
      ): undefined | ItemId => {
        const children = getItemChildren(parentId);
        const index = position === "last" ? children.length - 1 : position;

        // There's a special case when the placement line is below the drag item.
        // For reparenting, above and below the drag item means the same.
        return isDragItem(children[index])
          ? children[index - 1]?.id
          : children[index]?.id;
      };

      let potentialNewParentId = findNextParent(
        dropItemSelector[0],
        indexWithinChildren - 1
      );

      while (
        potentialNewParentId !== undefined &&
        getIsExpanded([potentialNewParentId, ...newParentSelector]) &&
        canAcceptChild(potentialNewParentId) &&
        shifted < desiredDepth - currentDepth
      ) {
        newParentSelector = [potentialNewParentId, ...newParentSelector];
        potentialNewParentId = findNextParent(potentialNewParentId, "last");
        shifted++;
      }

      if (shifted === 0) {
        return withoutShift;
      }

      return {
        itemSelector: newParentSelector,
        position: "end",
        placement: shiftPlacement(currentDepth + shifted),
      };
    }

    return withoutShift;
  }, [
    dropTarget,
    dragItemSelector,
    horizontalShift,
    canAcceptChild,
    getItemChildren,
    getIsExpanded,
  ]);

  return [shiftedDropTarget, setHorizontalShift] as const;
};
