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
  placementIndicator,
  getIsExpanded,
  canAcceptChild,
  isItemHidden,
  getItemChildren,
}: {
  getItemChildren: (itemSelector: ItemSelector) => Data[];
  canAcceptChild: (itemSelector: ItemSelector) => boolean;
  isItemHidden: (itemSelector: ItemSelector) => boolean;
  dragItemSelector: undefined | ItemSelector;
  dropTarget: ItemDropTarget | undefined;
  placementIndicator: undefined | Placement;
  getIsExpanded: (itemSelector: ItemSelector) => boolean;
}) => {
  const [horizontalShift, setHorizontalShift] = useState(0);

  // Here we want to allow user to shift placement line horizontally
  // but only if that corresponds to a meaningful position in the tree
  const shiftedDropTarget = useMemo((): ShiftedDropTarget | undefined => {
    if (
      dropTarget === undefined ||
      placementIndicator === undefined ||
      dragItemSelector === undefined
    ) {
      return undefined;
    }

    const { itemSelector: dropItemSelector, indexWithinChildren } = dropTarget;

    const shiftPlacement = (depth: number) => {
      const shift = getPlacementIndicatorAlignment(depth);
      return {
        ...placementIndicator,
        x: placementIndicator.x + shift,
        length: placementIndicator.length - shift,
      };
    };

    // Placement type “inside-parent” means that useDrop() didn’t find any children.
    // In this case the placement line coordinates are meaningless in the context of the tree.
    // We're dropping the placement and not performing any shifting.
    if (placementIndicator.type === "inside-parent") {
      return { itemSelector: dropItemSelector, position: "end" };
    }

    let dropHiddenCount = 0;
    dropItemSelector.forEach((_itemId, index) => {
      if (isItemHidden(dropItemSelector.slice(index))) {
        dropHiddenCount += 1;
      }
    });

    const dragItemDepth = dragItemSelector.length - 1;
    const currentDepth = dropItemSelector.length;
    const desiredDepth = dragItemDepth + horizontalShift;

    const withoutShift = {
      itemSelector: dropItemSelector,
      position: indexWithinChildren,
      placement: shiftPlacement(currentDepth - dropHiddenCount),
    } as const;

    if (desiredDepth === currentDepth) {
      return withoutShift;
    }

    const [dragItemId] = dragItemSelector;
    const isDragItem = (item: Data | undefined) => item?.id === dragItemId;

    const isAtTheBottom = (parentSelector: ItemSelector, index: number) => {
      const children = getItemChildren(parentSelector);
      // There's a special case when the placement line is above the drag item.
      // For reparenting, above and below the drag item means the same.
      const indexCorrected = isDragItem(children[index]) ? index + 1 : index;
      return indexCorrected === children.length;
    };

    // @todo generalize the logic of both directions

    // find the last matching while shifting to the left
    // until cursor is reached
    // since the direction of search from the deepest to the root is same
    // break on last match
    if (desiredDepth < currentDepth) {
      let newParentSelector = dropItemSelector;
      let newPosition = indexWithinChildren;

      // skip drop item
      for (let index = 1; index < dropItemSelector.length; index += 1) {
        if (
          index > currentDepth - desiredDepth ||
          isAtTheBottom(dropItemSelector.slice(index - 1), newPosition) ===
            false
        ) {
          break;
        }
        const currentItemSelector = dropItemSelector.slice(index);
        if (canAcceptChild(currentItemSelector)) {
          newParentSelector = currentItemSelector;
          const children = getItemChildren(dropItemSelector.slice(index));
          const childId = dropItemSelector[index - 1] ?? children.at(-1)?.id;
          const childPosition = children.findIndex(
            (item) => item.id === childId
          );
          newPosition = childPosition + 1;
        }
      }

      const shifted = newParentSelector.length - dropItemSelector.length;

      if (shifted === 0) {
        return withoutShift;
      }

      return {
        itemSelector: newParentSelector,
        position: newPosition,
        placement: shiftPlacement(currentDepth - dropHiddenCount + shifted),
      };
    }

    // find deepest item at the bottom
    const getLastChild = (
      children: Data[],
      position: number
    ): undefined | ItemId => {
      // There's a special case when the placement line is below the drag item.
      // For reparenting, above and below the drag item means the same.
      return isDragItem(children[position])
        ? children[position - 1]?.id
        : children[position]?.id;
    };
    let deepestAtTheBottomItemSelector = dropItemSelector;
    let deepestAtTheBottomParentId: undefined | string =
      deepestAtTheBottomItemSelector[0];
    let deepestAtTheBottomChildren = getItemChildren(
      deepestAtTheBottomItemSelector
    );
    let deepestAtTheBottomPosition = indexWithinChildren - 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      deepestAtTheBottomParentId = getLastChild(
        deepestAtTheBottomChildren,
        deepestAtTheBottomPosition
      );
      if (deepestAtTheBottomParentId === undefined) {
        break;
      }
      const newItemSelector = [
        deepestAtTheBottomParentId,
        ...deepestAtTheBottomItemSelector,
      ];
      if (getIsExpanded(newItemSelector) === false) {
        break;
      }
      deepestAtTheBottomItemSelector = newItemSelector;
      deepestAtTheBottomChildren = getItemChildren(
        deepestAtTheBottomItemSelector
      );
      deepestAtTheBottomPosition = deepestAtTheBottomChildren.length - 1;
    }

    // find the last matching while shifting to the right
    // until cursor is reached
    // since the direction of search from the deepest to the root is reversed
    // break on first match
    if (desiredDepth > currentDepth) {
      let newParentSelector = deepestAtTheBottomItemSelector;
      let newPosition = deepestAtTheBottomPosition;

      for (
        let index = Math.max(
          0,
          deepestAtTheBottomItemSelector.length - desiredDepth
        );
        index < deepestAtTheBottomItemSelector.length;
        index += 1
      ) {
        const currentItemSelector = deepestAtTheBottomItemSelector.slice(index);
        if (canAcceptChild(currentItemSelector)) {
          newParentSelector = currentItemSelector;
          const children = getItemChildren(
            deepestAtTheBottomItemSelector.slice(index)
          );
          const childId =
            deepestAtTheBottomItemSelector[index - 1] ?? children.at(-1)?.id;
          const childPosition = children.findIndex(
            (item) => item.id === childId
          );
          newPosition = childPosition + 1;
          break;
        }
        continue;
      }

      const shifted = newParentSelector.length - dropItemSelector.length;

      if (shifted === 0) {
        return withoutShift;
      }

      return {
        itemSelector: newParentSelector,
        position: newPosition,
        placement: shiftPlacement(currentDepth - dropHiddenCount + shifted),
      };
    }

    return withoutShift;
  }, [
    dropTarget,
    placementIndicator,
    dragItemSelector,
    horizontalShift,
    canAcceptChild,
    isItemHidden,
    getItemChildren,
    getIsExpanded,
  ]);

  return [shiftedDropTarget, setHorizontalShift] as const;
};
