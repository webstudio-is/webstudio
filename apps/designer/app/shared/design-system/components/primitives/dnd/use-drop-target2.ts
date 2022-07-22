import { useRef } from "react";

export type Area = "top" | "right" | "bottom" | "left" | "center";

type DropTarget<Data> = {
  data: Data;
  element: HTMLElement;
  rect: DOMRect;
};

const isSameRect = (rect1: DOMRect, rect2: DOMRect) =>
  rect1.top === rect2.top &&
  rect1.left === rect2.left &&
  rect1.bottom === rect2.bottom &&
  rect1.right === rect2.right;

const isSameDropTarget = <Data>(
  prev: DropTarget<Data> | undefined,
  next: DropTarget<Data>,
  isSameData: (data1: Data, data2: Data) => boolean
) =>
  prev !== undefined &&
  prev.element === next.element &&
  isSameData(prev.data, next.data) &&
  isSameRect(prev.rect, next.rect);

export type UseDropTargetProps<Data> = {
  edgeDistanceThreshold?: number;

  isSameData?: (data1: Data, data2: Data) => boolean;

  elementToData: (element: HTMLElement) => Data | undefined;

  swapDropTarget: (args: { element: HTMLElement; data: Data; area: Area }) => {
    element: HTMLElement;
    data: Data;
  };

  onDropTargetChange: (dropTarget: DropTarget<Data>) => void;
};

export type UseDropTargetHandlers = {
  handleMove: (pointerCoordinate: Coordinate) => void;
  handleScroll: () => void;
  rootRef: (element: HTMLElement | null) => void;
};

export const useDropTarget = <Data>({
  edgeDistanceThreshold = 3,
  isSameData = (data1: Data, data2: Data) => data1 === data2,
  elementToData,
  swapDropTarget,
  onDropTargetChange,
}: UseDropTargetProps<Data>): UseDropTargetHandlers => {
  const state = useRef({
    root: null as HTMLElement | null,
    pointerCoordinate: undefined as Coordinate | undefined,
    dropTarget: undefined as DropTarget<Data> | undefined,
  });

  const detectTarget = () => {
    const pointerCoordinate = state.current.pointerCoordinate;
    if (pointerCoordinate === undefined) {
      return;
    }

    const target = elementFromPoint(pointerCoordinate);
    if (target === undefined || state.current.root === null) {
      return;
    }

    const elementWithData = findClosestElementWithData({
      root: state.current.root,
      target,
      elementToData,
    });

    if (elementWithData === undefined) {
      return;
    }

    const dropTarget = {
      ...elementWithData,
      rect: elementWithData.element.getBoundingClientRect(),
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const newTarget = swapDropTarget({
        element: dropTarget.element,
        data: dropTarget.data,
        area: getArea(
          pointerCoordinate,
          edgeDistanceThreshold,
          dropTarget.rect
        ),
      });

      if (newTarget.element === dropTarget.element) {
        break;
      }

      dropTarget.element = newTarget.element;
      dropTarget.data = newTarget.data;
      dropTarget.rect = newTarget.element.getBoundingClientRect();
    }

    if (!isSameDropTarget(state.current.dropTarget, dropTarget, isSameData)) {
      onDropTargetChange(dropTarget);
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

const findClosestElementWithData = <Data>({
  root,
  target,
  elementToData,
}: {
  root: HTMLElement;
  target: HTMLElement;
  elementToData: (target: HTMLElement) => Data | undefined;
}) => {
  let currentTarget: HTMLElement | null = target;
  while (currentTarget !== null && currentTarget !== root) {
    const data = elementToData(currentTarget);
    if (data !== undefined) {
      return { data: data, element: currentTarget };
    }
    currentTarget = currentTarget.parentElement;
  }
};
