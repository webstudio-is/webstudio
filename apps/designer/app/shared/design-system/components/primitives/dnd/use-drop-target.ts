import { useRef } from "react";

export type Area = "top" | "right" | "bottom" | "left" | "center";

export const useDropTarget = ({
  isDropTarget,
  onDropTargetChange,
  edgeThreshold = 3,
}: any) => {
  const rootRef = useRef<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement>();
  const targetRectRef = useRef<DOMRect>();
  const areaRef = useRef<Area>("center");

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
      }

      const nextArea = getArea(
        pointerCoordinate,
        edgeThreshold,
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
  edgeThreshold: number,
  targetRect?: DOMRect
) => {
  let area: Area = "center";
  if (targetRect === undefined) return area;
  // We are at the edge and this means user wants to insert after that element into its parent
  if (pointerCoordinate.y - targetRect.top <= edgeThreshold) area = "top";
  if (targetRect.bottom - pointerCoordinate.y <= edgeThreshold) area = "bottom";
  if (pointerCoordinate.x - targetRect.left <= edgeThreshold) area = "left";
  if (targetRect.right - pointerCoordinate.x <= edgeThreshold) area = "right";
  return area;
};

type IsDropTarget = (element: HTMLElement) => boolean;

const findClosestDropTarget = ({
  root,
  target,
  isDropTarget,
}: {
  root: HTMLElement;
  target: HTMLElement;
  isDropTarget: IsDropTarget;
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
