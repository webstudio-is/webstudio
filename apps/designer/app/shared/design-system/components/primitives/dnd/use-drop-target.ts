import { useRef } from "react";

export type Area = "top" | "right" | "bottom" | "left" | "center";

type UseDropTarget = any;

export const useDropTarget = ({
  isDropTarget,
  edgeDistanceThreshold = 3,
  holdTimeThreshold = 500,
  onDropTargetChange,
  onHold,
}: UseDropTarget) => {
  const rootRef = useRef<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement>();
  const targetRectRef = useRef<DOMRect>();
  const areaRef = useRef<Area>("center");
  const holdTimeoutRef = useRef<NodeJS.Timeout>();

  const detectHold = (target: HTMLElement) => {
    clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = setTimeout(() => {
      if (target === targetRef.current) {
        onHold({ target });
      }
    }, holdTimeThreshold);
  };

  return {
    handleMove(pointerCoordinate: Coordinate) {
      const target = elementFromPoint(pointerCoordinate);
      if (target === undefined || rootRef.current === null) {
        return;
      }

      const nextTarget = findClosestDropTarget({
        root: rootRef.current,
        target,
        isDropTarget,
      });

      const hasTargetChanged = nextTarget !== targetRef.current;
      targetRef.current = nextTarget;

      if (hasTargetChanged) {
        targetRectRef.current = nextTarget.getBoundingClientRect();
        detectHold(nextTarget);
      }

      const nextArea = getArea(
        pointerCoordinate,
        edgeDistanceThreshold,
        targetRectRef.current
      );

      const hasAreaChanged = nextArea !== areaRef.current;
      areaRef.current = nextArea;

      if (hasTargetChanged || hasAreaChanged) {
        onDropTargetChange({
          rect: targetRectRef.current,
          area: nextArea,
        });
      }
    },

    handleEnd() {
      // Clear onHold timeout if we ended interaction before it fired
      clearTimeout(holdTimeoutRef.current);
    },

    rootRef(rootElement: HTMLElement | null) {
      rootRef.current = rootElement;
    },
  };
};

type Coordinate = { x: number; y: number };

const elementFromPoint = (coordinate: Coordinate): HTMLElement | undefined => {
  const element = document.elementFromPoint(coordinate.x, coordinate.y);
  if (element instanceof HTMLElement) return element;
};

const getArea = (
  pointerCoordinate: Coordinate,
  edgeDistanceThreshold: number,
  targetRect?: DOMRect
) => {
  let area: Area = "center";
  if (targetRect === undefined) return area;
  // We are at the edge and this means user wants to insert after that element into its parent
  if (pointerCoordinate.y - targetRect.top <= edgeDistanceThreshold)
    area = "top";
  if (targetRect.bottom - pointerCoordinate.y <= edgeDistanceThreshold)
    area = "bottom";
  if (pointerCoordinate.x - targetRect.left <= edgeDistanceThreshold)
    area = "left";
  if (targetRect.right - pointerCoordinate.x <= edgeDistanceThreshold)
    area = "right";
  return area;
};

const findClosestDropTarget = ({
  root,
  target,
  isDropTarget,
}: {
  root: HTMLElement;
  target: HTMLElement;
  isDropTarget: (target: HTMLElement) => boolean;
}): HTMLElement => {
  let currentTarget: HTMLElement | null = target;
  while (currentTarget !== null && currentTarget !== root) {
    const isValid = isDropTarget(currentTarget);
    if (isValid) {
      return target;
    }
    currentTarget = currentTarget.parentElement;
  }
  return root;
};
