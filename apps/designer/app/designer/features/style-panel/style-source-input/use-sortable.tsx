import { useState, useRef } from "react";
import {
  PlacementIndicator,
  useDrag,
  useDrop,
  type DropTarget,
} from "@webstudio-is/design-system";

type UseSortable<Item> = {
  items: Array<Item>;
  onSort?: (items: Array<Item>) => void;
};

export const useSortable = <Item extends { id: string }>({
  items,
  onSort,
}: UseSortable<Item>) => {
  const [dropTarget, setDropTarget] = useState<DropTarget<true>>();
  const [dragItemId, setDragItemId] = useState<string>();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const useDropHandlers = useDrop<true>({
    elementToData(element) {
      return element instanceof HTMLDivElement;
    },
    swapDropTarget(dropTarget) {
      if (dropTarget) {
        return dropTarget;
      }

      if (rootRef.current === null) {
        throw new Error("Unexpected empty rootRef during drag");
      }

      return { data: true, element: rootRef.current };
    },
    onDropTargetChange(dropTarget) {
      setDropTarget(dropTarget);
    },
  });

  const useDragHandlers = useDrag<string>({
    elementToData(element) {
      const closest = element.closest("[data-id]");
      return closest && closest instanceof HTMLElement
        ? closest.dataset?.id || false
        : false;
    },
    onStart({ data }) {
      if (items.length < 2) {
        return;
      }
      setDragItemId(data);
      useDropHandlers.handleStart();
    },
    onMove: (point) => {
      useDropHandlers.handleMove(point);
    },
    onEnd({ isCanceled }) {
      if (dropTarget !== undefined && dragItemId !== undefined) {
        const oldIndex = items.findIndex((item) => item.id === dragItemId);
        if (oldIndex !== -1) {
          let newIndex = dropTarget.indexWithinChildren;

          // placement.index does not take into account the fact that the drag item will be removed.
          // we need to do this to account for it.
          if (oldIndex < newIndex) {
            newIndex = Math.max(0, newIndex - 1);
          }

          if (oldIndex !== newIndex) {
            const newItems = [...items];
            newItems.splice(oldIndex, 1);
            newItems.splice(newIndex, 0, newItems[oldIndex]);
            onSort?.(newItems);
          }
        }
      }

      useDropHandlers.handleEnd({ isCanceled });
      setDragItemId(undefined);
      setDropTarget(undefined);
    },
  });

  const placementIndicator = dropTarget ? (
    <PlacementIndicator placement={dropTarget.placement} />
  ) : undefined;

  const sortableRefCallback = (element: HTMLDivElement | null) => {
    useDropHandlers.rootRef(element);
    useDragHandlers.rootRef(element);
    rootRef.current = element;
  };

  return {
    sortableRefCallback,
    dragItemId,
    placementIndicator,
  };
};
