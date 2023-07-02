import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useDrop, type DropTarget } from "./use-drop";
import { useDrag } from "./use-drag";
import type { Placement } from "./geometry-utils";
import { useDragCursor } from "./use-drag-cursor";
import {
  PlacementIndicator,
  computeIndicatorPlacement,
} from "./placement-indicator";

type UseSortable<Item> = {
  items: Array<Item>;
  onSort?: (newIndex: number, oldIndex: number) => void;
};

const getItemId = (element: Element) =>
  element instanceof HTMLElement ? element.dataset?.id : undefined;

export const useSortable = <Item extends { id: string }>({
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
        setPlacementIndicator(
          computeIndicatorPlacement({
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

      return getItemId(closest) || false;
    },
    onStart({ data }) {
      setDragItemId(data);
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

        if (oldIndex !== newIndex) {
          onSort?.(newIndex, oldIndex);
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
