import { useRef, useMemo } from "react";
import { isEqualRect } from "./geometry-utils";

export type Area = "top" | "right" | "bottom" | "left" | "center";

export type DropTarget<Data> = {
  data: Data;
  element: HTMLElement;
  rect: DOMRect;
};

// We pass around data, to avoid extra data lookups.
// For example, data found in isDropTarget
// doesn't have to be looked up again in swapDropTarget.
export type UseDropTargetProps<Data> = {
  // To check that the element can qualify as a target
  isDropTarget: (element: HTMLElement) => Data | false;

  // Given the potential target that has passed isDropTarget check,
  // and the position of the pointer on the target,
  // you can swap to another target
  swapDropTarget?: (args: { element: HTMLElement; data: Data; area: Area }) => {
    element: HTMLElement;
    data: Data;
  };

  onDropTargetChange: (dropTarget: DropTarget<Data>) => void;
  edgeDistanceThreshold?: number;

  // @todo: not sure we should do any data comparisons here.
  // On the contrary, we may want to rely on the assumption
  // that the data for the same element is always the same (for caching)
  isSameData?: (data1: Data, data2: Data) => boolean;
};

export type UseDropTargetHandlers = {
  handleMove: (pointerCoordinate: Coordinate) => void;
  handleScroll: () => void;
  handleEnd: () => void;
  rootRef: (element: HTMLElement | null) => void;
};

export const useDropTarget = <Data>(
  props: UseDropTargetProps<Data>
): UseDropTargetHandlers => {
  // We want to use fresh props every time we use them,
  // but we don't need to react to updates.
  // So we can put them in a ref and make useMemo below very efficient.
  const latestProps = useRef<UseDropTargetProps<Data>>(props);
  latestProps.current = props;

  const state = useRef({
    root: null as HTMLElement | null,
    pointerCoordinate: undefined as Coordinate | undefined,
    dropTarget: undefined as DropTarget<Data> | undefined,
  });

  // We want to return a stable object to avoid re-renders when it's a dependency
  return useMemo(() => {
    const detectTarget = () => {
      const {
        edgeDistanceThreshold = 3,
        isSameData = (data1: Data, data2: Data) => data1 === data2,
        isDropTarget,
        swapDropTarget = (args) => args,
        onDropTargetChange,
      } = latestProps.current;

      const { pointerCoordinate, root } = state.current;
      if (pointerCoordinate === undefined || root === null) {
        return;
      }

      const target = elementFromPoint(pointerCoordinate);
      if (target === undefined) {
        return;
      }

      // @todo: cache this? Not expensive by itself, but it may call isDropTarget a lot
      const potentialTarget = findClosestDropTarget({
        root,
        target,
        isDropTarget,
      });
      if (potentialTarget === undefined) {
        return;
      }

      // @todo: if neither potentialTarget nor area has changed since the last time,
      // don't call swapDropTarget.

      const dropTarget = {
        ...potentialTarget,
        rect: potentialTarget.element.getBoundingClientRect(),
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const swappedTarget = swapDropTarget({
          element: dropTarget.element,
          data: dropTarget.data,
          area: getArea(
            pointerCoordinate,
            edgeDistanceThreshold,
            dropTarget.rect
          ),
        });

        if (swappedTarget.element === dropTarget.element) {
          break;
        }

        dropTarget.element = swappedTarget.element;
        dropTarget.data = swappedTarget.data;
        dropTarget.rect = swappedTarget.element.getBoundingClientRect();
      }

      if (
        state.current.dropTarget === undefined ||
        state.current.dropTarget.element !== dropTarget.element ||
        !isSameData(state.current.dropTarget.data, dropTarget.data) ||
        !isEqualRect(state.current.dropTarget.rect, dropTarget.rect)
      ) {
        state.current.dropTarget = dropTarget;
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

      handleEnd() {
        state.current.pointerCoordinate = undefined;
        state.current.dropTarget = undefined;
      },

      rootRef(rootElement: HTMLElement | null) {
        state.current.root = rootElement;
      },
    };
  }, []);
};

type Coordinate = { x: number; y: number };

const elementFromPoint = (coordinate: Coordinate): HTMLElement | undefined => {
  const element = document.elementFromPoint(coordinate.x, coordinate.y);
  if (element instanceof HTMLElement) return element;
};

// @todo: it seems we only care about whether the area is center or on an edge.
// Knowing which edge doesn't help much.
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

// @todo: maybe rather than climbing the DOM tree,
// we should use document.elementsFromPoint() array?
// Might work better with absolute positioned elements.
const findClosestDropTarget = <Data>({
  root,
  target,
  isDropTarget,
}: {
  root: HTMLElement;
  target: HTMLElement;
  isDropTarget: (target: HTMLElement) => Data | false;
}) => {
  let currentTarget: HTMLElement | null = target;
  while (currentTarget !== null) {
    const data = isDropTarget(currentTarget);
    if (data !== false) {
      return { data: data, element: currentTarget };
    }

    // @todo: what makes us think that document.elementFromPoint() is inside the root in the first place?
    if (currentTarget === root) {
      break;
    }

    currentTarget = currentTarget.parentElement;
  }
};
