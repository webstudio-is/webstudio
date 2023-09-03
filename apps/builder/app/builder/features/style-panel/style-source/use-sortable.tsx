import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  type Placement,
  PlacementIndicator,
  useDrag,
  useDragCursor,
  useDrop,
  type DropTarget,
  computeIndicatorPlacement,
  toast,
} from "@webstudio-is/design-system";
import type { ItemSource } from "./style-source";

type UseSortable<Item> = {
  items: Array<Item>;
  onSort?: (items: Array<Item>) => void;
};

const getItemId = (element: Element) =>
  element instanceof HTMLElement ? element.dataset?.id : undefined;

const sharedDropOptions = {
  getValidChildren(parent: Element) {
    return [...parent.children].filter(
      (child) => getItemId(child) !== undefined
    );
  },
  childrenOrientation: { type: "horizontal", reverse: false },
} as const;

export const useSortable = <Item extends { id: string; source: ItemSource }>({
  items,
  onSort,
}: UseSortable<Item>) => {
  const [dropTarget, setDropTarget] = useState<DropTarget<true>>();
  const [placementIndicator, setPlacementIndicator] = useState<
    undefined | Placement
  >();
  const [dragItemId, setDragItemId] = useState<string>();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useDragCursor(dragItemId !== undefined);

  // drop target is always root
  // we need useDrop only for dropTarget.placement & dropTarget.indexWithinChildren
  const useDropHandlers = useDrop<true>({
    ...sharedDropOptions,
    elementToData() {
      return true;
    },
    swapDropTarget() {
      if (rootRef.current === null) {
        throw new Error("Unexpected empty rootRef during drag");
      }
      return { data: true, element: rootRef.current };
    },
    onDropTargetChange(dropTarget) {
      setDropTarget(dropTarget);
      if (dropTarget === undefined) {
        setPlacementIndicator(undefined);
      } else {
        // when local style source is last always drop before it
        if (items.at(-1)?.source === "local") {
          const lastIndex = items.length - 1;
          const { placement } = dropTarget;
          const { indexAdjustment, closestChildIndex } = placement;
          placement.indexAdjustment = Math.min(indexAdjustment, lastIndex - 1);
          placement.closestChildIndex = Math.min(
            closestChildIndex,
            lastIndex - 1
          );
        }
        setPlacementIndicator(
          computeIndicatorPlacement({
            ...sharedDropOptions,
            placement: dropTarget.placement,
            element: dropTarget.element,
          })
        );
      }
    },
  });

  const useDragHandlers = useDrag<string>({
    elementToData(element) {
      // disable drag unless there are at least 2 items
      if (items.length < 2) {
        return false;
      }

      const closest = element.closest("[data-id]");
      if (closest === null) {
        return false;
      }

      const itemId = getItemId(closest);
      if (itemId === undefined) {
        return false;
      }

      return itemId;
    },
    onStart({ data: itemId }) {
      const item = items.find((item) => item.id === itemId);
      if (items.at(-1) === item && item?.source === "local") {
        toast.error("Local style source is always last and can not be moved");
        useDragHandlers.cancelCurrentDrag();
        return;
      }

      setDragItemId(itemId);
      useDropHandlers.handleStart();
    },
    onMove: (point) => {
      useDropHandlers.handleMove(point);
    },
    onEnd({ isCanceled }) {
      useDropHandlers.handleEnd({ isCanceled });
      setDragItemId(undefined);
      setDropTarget(undefined);
      setPlacementIndicator(undefined);

      if (isCanceled || dropTarget === undefined || dragItemId === undefined) {
        return;
      }

      const oldIndex = items.findIndex((item) => item.id === dragItemId);
      if (oldIndex !== -1) {
        let newIndex = dropTarget.indexWithinChildren;

        // placement.index does not take into account the fact that the drag item will be removed.
        // we need to do this to account for it.
        if (oldIndex < newIndex) {
          newIndex = Math.max(0, newIndex - 1);
        }
        // when local style source is last always drop before it
        if (items.at(-1)?.source === "local") {
          const lastIndex = items.length - 1;
          newIndex = Math.min(newIndex, lastIndex - 1);
        }

        if (oldIndex !== newIndex) {
          const newItems = [...items];
          newItems.splice(oldIndex, 1);
          newItems.splice(newIndex, 0, items[oldIndex]);
          onSort?.(newItems);
        }
      }
    },
  });

  const placementIndicatorElement = placementIndicator
    ? createPortal(
        <PlacementIndicator placement={placementIndicator} />,
        document.body
      )
    : undefined;

  const sortableRefCallback = (element: HTMLDivElement | null) => {
    useDropHandlers.rootRef(element);
    useDragHandlers.rootRef(element);
    rootRef.current = element;
  };

  return {
    sortableRefCallback,
    dragItemId,
    placementIndicator: placementIndicatorElement,
  };
};
