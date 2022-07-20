import { useRef } from "react";

export type Area = "top" | "right" | "bottom" | "left" | "center";

export type Parameters = {
  isDropTarget: (element: HTMLElement) => boolean;
  edgeDistanceThreshold?: number;
  holdTimeThreshold?: number;
  onDropTargetChange: (event: {
    rect: DOMRect;
    area: Area;
    target: HTMLElement;
  }) => void;
  onHold: (event: { target: HTMLElement }) => void;
};

export type Handlers = {
  handleMove: (pointerCoordinate: Coordinate) => void;
  handleScroll: () => void;
  handleEnd: () => void;
  rootRef: (element: HTMLElement | null) => void;
};

export const useDropTarget = ({
  isDropTarget,
  edgeDistanceThreshold = 3,
  holdTimeThreshold = 500,
  onDropTargetChange,
  onHold,
}: Parameters): Handlers => {
  const state = useRef({
    root: null as HTMLElement | null,
    target: undefined as HTMLElement | undefined,
    area: "center" as Area,
    rect: undefined as DOMRect | undefined,
    holdTimeout: undefined as NodeJS.Timeout | undefined,
    pointerCoordinate: undefined as Coordinate | undefined,
  });

  const clearHoldTimeout = () => {
    if (state.current.holdTimeout) {
      clearTimeout(state.current.holdTimeout);
      state.current.holdTimeout = undefined;
    }
  };

  const detectHold = (target: HTMLElement) => {
    clearHoldTimeout();
    state.current.holdTimeout = setTimeout(() => {
      state.current.holdTimeout = undefined;
      if (target === state.current.target) {
        onHold({ target });
      }
    }, holdTimeThreshold);
  };

  const detectTarget = () => {
    const pointerCoordinate = state.current.pointerCoordinate;
    if (pointerCoordinate === undefined) {
      return;
    }

    const target = elementFromPoint(pointerCoordinate);
    if (target === undefined || state.current.root === null) {
      return;
    }

    const nextTarget = findClosestDropTarget({
      root: state.current.root,
      target,
      isDropTarget,
    });

    const hasTargetChanged = nextTarget !== state.current.target;
    state.current.target = nextTarget;

    if (hasTargetChanged) {
      detectHold(nextTarget);
    }

    const nextRect = nextTarget.getBoundingClientRect();

    const hasRectChanged = nextRect !== state.current.rect;
    state.current.rect = nextRect;

    const nextArea = getArea(
      pointerCoordinate,
      edgeDistanceThreshold,
      nextRect
    );

    const hasAreaChanged = nextArea !== state.current.area;
    state.current.area = nextArea;

    if (hasTargetChanged || hasAreaChanged || hasRectChanged) {
      onDropTargetChange({
        rect: nextRect,
        area: nextArea,
        target: nextTarget,
      });
    }
  };

  return {
    handleMove(pointerCoordinate: Coordinate) {
      state.current.pointerCoordinate = pointerCoordinate;
      detectTarget();
    },

    handleScroll() {
      detectTarget();
    },

    handleEnd() {
      // Clear onHold timeout if we ended interaction before it fired
      clearHoldTimeout();
    },

    rootRef(rootElement: HTMLElement | null) {
      state.current.root = rootElement;
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
