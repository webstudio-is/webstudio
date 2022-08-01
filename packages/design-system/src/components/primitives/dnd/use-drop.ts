import { useRef, useMemo } from "react";
import {
  isEqualRect,
  isNearEdge,
  rectRelativeToRect,
  pointRelativeToRect,
  getClosestRectIndex,
  type Rect,
} from "./rect";

// @todo: use this in useDrag as well
type UsableElement = HTMLElement | SVGElement;
const toUseableElement = (
  element: Element | undefined | null
): UsableElement | undefined => {
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    return element;
  }
};

// let probeCache: undefined | HTMLElement;
// const getProbe = () => {
//   if (probeCache === undefined) {
//     probeCache = document.createElement("div");
//   }
//   return probeCache;
// };

// @todo: add "vertical-reversed", "horizontal-reversed", "mixed-reversed"
type ChildrenOrientation = "vertical" | "horizontal" | "mixed";

// @todo: describe this function
const getLocalChildrenOrientation = (
  parent: UsableElement,
  childrentRects: Rect[],
  childIndex: number
): ChildrenOrientation => {
  const previous = childrentRects[childIndex - 1] as Rect | undefined;
  const current = childrentRects[childIndex] as Rect | undefined;
  const next = childrentRects[childIndex + 1] as Rect | undefined;

  if (current === undefined || (next === undefined && previous === undefined)) {
    // @todo: use probe
    return "vertical";
  }

  if (
    (next === undefined || next.top === current.top) &&
    (previous === undefined || previous.top === current.top)
  ) {
    return "horizontal";
  }

  if (
    (next === undefined || next.left === current.left) &&
    (previous === undefined || previous.left === current.left)
  ) {
    return "vertical";
  }

  return "mixed";
};

const getIndexAdjustment = (
  pointer: { x: number; y: number },
  closestChildRect: Rect,
  childrenOrientation: ChildrenOrientation
) => {
  const { top, left, width, height } = closestChildRect;

  if (childrenOrientation === "vertical") {
    const middleY = top + height / 2;
    return pointer.y < middleY ? 0 : 1;
  }

  if (childrenOrientation === "horizontal") {
    const middleX = left + width / 2;
    return pointer.x < middleX ? 0 : 1;
  }

  // For the "mixed" orientation,
  // we are looking at whether the pointer is above or below the diagonal

  // diagonal equation
  const getDiagonalY = (diagonalX: number) => {
    if (width === 0) {
      return undefined;
    }
    const slope = height / width;
    const topRightCorner = { x: left + width, y: top };
    return slope * (diagonalX - topRightCorner.x) + topRightCorner.y;
  };

  const diagonalY = getDiagonalY(pointer.x);
  if (diagonalY === undefined) {
    return 0;
  }
  return pointer.y < diagonalY ? 0 : 1;
};

// Partial information about a drop target
// used during the selection of a new drop target
type PartialDropTarget<Data> = {
  data: Data;
  element: UsableElement;
};

type Placement = {
  x: number;
  y: number;
  length: number;
  direction: "horizontal" | "vertical";
};

export const getPlacementBetween = (
  a: Rect,
  b: Rect
): Placement | undefined => {
  const [firstY, secondY] = a.top < b.top ? [a, b] : [b, a];
  const [firstX, secondX] = a.left < b.left ? [a, b] : [b, a];
  const distanceY = secondY.top - firstY.top - firstY.height;
  const distanceX = secondX.left - firstX.left - firstX.width;

  // if rects overlap we don't want to put placement between them
  if (distanceX < 0 && distanceY < 0) {
    return undefined;
  }

  if (distanceX < 0 || (distanceY >= 0 && distanceY < distanceX)) {
    const minX = Math.min(a.left, b.left);
    const maxX = Math.max(a.left + a.width, b.left + b.width);
    return {
      y: firstY.top + firstY.height + distanceY / 2,
      x: minX,
      length: maxX - minX,
      direction: "horizontal",
    };
  }

  const minY = Math.min(a.top, b.top);
  const maxY = Math.max(a.top + a.height, b.top + b.height);
  return {
    y: minY,
    x: firstX.left + firstX.width + distanceX / 2,
    length: maxY - minY,
    direction: "vertical",
  };
};

export const getPlacementNextTo = (
  parentRect: Rect,
  rect: Rect,
  side: "top" | "bottom" | "left" | "right"
): Placement => {
  const margin = 5;

  if (side === "top") {
    return {
      x: rect.left,
      y: Math.min(rect.top, Math.max(parentRect.top, rect.top - margin)),
      length: rect.width,
      direction: "horizontal",
    };
  }

  if (side === "bottom") {
    return {
      x: rect.left,
      y: Math.max(
        rect.top + rect.height,
        Math.min(parentRect.top + parentRect.height, rect.top + margin)
      ),
      length: rect.width,
      direction: "horizontal",
    };
  }

  if (side === "left") {
    return {
      x: Math.min(rect.left, Math.max(parentRect.left, rect.left - margin)),
      y: rect.top,
      length: rect.height,
      direction: "vertical",
    };
  }

  return {
    x: Math.max(
      rect.left + rect.width,
      Math.min(parentRect.left + parentRect.width, rect.left + margin)
    ),
    y: rect.top,
    length: rect.height,
    direction: "vertical",
  };
};

export const getPlacementInside = (
  parentRect: Rect,
  childrenOrientation: ChildrenOrientation
): Placement => {
  const padding = 5;

  if (childrenOrientation === "horizontal") {
    const safePadding = Math.min(parentRect.width / 2, padding);
    return {
      y: parentRect.top + safePadding,
      x: parentRect.left + safePadding,
      length: parentRect.height - safePadding * 2,
      direction: "vertical",
    };
  }

  const safePadding = Math.min(parentRect.height / 2, padding);
  return {
    y: parentRect.top + safePadding,
    x: parentRect.left + safePadding,
    length: parentRect.width - safePadding * 2,
    direction: "horizontal",
  };
};

export type DropTarget<Data> = PartialDropTarget<Data> & {
  rect: DOMRect;
  indexWithinChildren: number;
  placement: Placement;
};

// We pass around data, to avoid extra data lookups.
// For example, data found in isDropTarget
// doesn't have to be looked up again in swapDropTarget.
export type UseDropProps<Data> = {
  // To check that the element can qualify as a target
  isDropTarget: (target: UsableElement) => Data | false;

  getDefaultDropTarget: () => PartialDropTarget<Data>;

  // Distance from an edge for pointer to be considered on an edge.
  edgeDistanceThreshold?: number;

  // Given the potential target that has passed isDropTarget check,
  // and the position of the pointer on the target,
  // you can swap to another target
  swapDropTarget?: (
    dropTarget: PartialDropTarget<Data> & { nearEdge: boolean }
  ) => PartialDropTarget<Data> | "DEFAULT";

  onDropTargetChange: (dropTarget: DropTarget<Data>) => void;
};

export type UseDropHandlers = {
  handleMove: (pointerCoordinates: { x: number; y: number }) => void;
  handleScroll: () => void;
  handleEnd: () => void;
  rootRef: (target: Element | null) => void;
};

const getInitialState = <Data>() => {
  return {
    root: undefined as UsableElement | undefined,
    pointerCoordinates: undefined as { x: number; y: number } | undefined,
    dropTarget: undefined as DropTarget<Data> | undefined,
    childrenRectsCache: new WeakMap<UsableElement, Rect[]>(),
  };
};

export const useDrop = <Data>(props: UseDropProps<Data>): UseDropHandlers => {
  // We want to use fresh props every time we use them,
  // but we don't need to react to updates.
  // So we can put them in a ref and make useMemo below very efficient.
  const latestProps = useRef<UseDropProps<Data>>(props);
  latestProps.current = props;

  const state = useRef(getInitialState());

  // We want to return a stable object to avoid re-renders when it's a dependency
  return useMemo(() => {
    const getChildrenRects = (parent: UsableElement, parentRect: Rect) => {
      const fromCache = state.current.childrenRectsCache.get(parent);
      if (fromCache !== undefined) {
        return fromCache;
      }

      const result = Array.from(parent.children).map((child) =>
        rectRelativeToRect(parentRect, child.getBoundingClientRect())
      );

      state.current.childrenRectsCache.set(parent, result);
      return result;
    };

    const getIndex = (
      parent: UsableElement,
      parentRect: Rect,
      pointer: { x: number; y: number }

      // @todo: don't return array here like that
    ): [number, ChildrenOrientation, number, number] => {
      const pointerRelativeToParent = pointRelativeToRect(parentRect, pointer);
      const childrenRects = getChildrenRects(parent, parentRect);

      if (childrenRects.length === 0) {
        // @todo: still call getLocalChildrenOrientation
        return [0, "vertical", -1, 0];
      }

      const closestChildIndex = getClosestRectIndex(
        childrenRects,
        pointerRelativeToParent
      );

      const orientation = getLocalChildrenOrientation(
        parent,
        childrenRects,
        closestChildIndex
      );

      const adjustment = getIndexAdjustment(
        pointerRelativeToParent,
        childrenRects[closestChildIndex],
        orientation
      );

      return [
        closestChildIndex + adjustment,
        orientation,
        closestChildIndex,
        adjustment === 0 ? closestChildIndex - 1 : closestChildIndex + 1,
      ];
    };

    const handleDropTargetChange = (
      partialDropTarget: PartialDropTarget<Data>
    ) => {
      const { pointerCoordinates } = state.current;
      if (pointerCoordinates === undefined) {
        return;
      }

      const rect = partialDropTarget.element.getBoundingClientRect();

      const [indexWithinChildren, childrenOrientation, aIndex, bIndex] =
        getIndex(partialDropTarget.element, rect, pointerCoordinates);

      const current = state.current.dropTarget;
      if (
        current === undefined ||
        current.element !== partialDropTarget.element ||
        current.indexWithinChildren !== indexWithinChildren ||
        !isEqualRect(current.rect, rect)
      ) {
        const childrenRects = getChildrenRects(partialDropTarget.element, rect);
        const aRect = childrenRects[aIndex] as Rect | undefined;
        const bRect = childrenRects[bIndex] as Rect | undefined;

        let placement: Placement | undefined;

        if (aRect !== undefined && bRect !== undefined) {
          placement = getPlacementBetween(aRect, bRect);
        }

        if (placement === undefined && aRect !== undefined) {
          placement = getPlacementNextTo(
            rect,
            aRect,
            childrenOrientation === "horizontal"
              ? bIndex > aIndex
                ? "right"
                : "left"
              : bIndex > aIndex
              ? "bottom"
              : "top"
          );
        }

        const dropTarget: DropTarget<Data> = {
          ...partialDropTarget,
          rect,
          indexWithinChildren: indexWithinChildren,
          placement: placement || getPlacementInside(rect, childrenOrientation),
        };
        state.current.dropTarget = dropTarget;
        latestProps.current.onDropTargetChange(dropTarget);
      }
    };

    const detectTarget = () => {
      const {
        edgeDistanceThreshold = 3,
        isDropTarget,
        swapDropTarget = (x) => x,
        getDefaultDropTarget,
      } = latestProps.current;

      const { pointerCoordinates, root } = state.current;
      if (pointerCoordinates === undefined || root === undefined) {
        handleDropTargetChange(getDefaultDropTarget());
        return;
      }

      const target = toUseableElement(
        document.elementFromPoint(pointerCoordinates.x, pointerCoordinates.y)
      );
      if (!target) {
        handleDropTargetChange(getDefaultDropTarget());
        return;
      }

      // @todo: cache this? Not expensive by itself, but it may call isDropTarget a lot
      let candidate = findClosestDropTarget({
        root,
        target,
        isDropTarget,
      });
      if (candidate === undefined) {
        handleDropTargetChange(getDefaultDropTarget());
        return;
      }

      // @todo: if neither potentialTarget nor area has changed since the last time,
      // don't call swapDropTarget.

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const swappedTo = swapDropTarget({
          ...candidate,
          nearEdge: isNearEdge(
            pointerCoordinates,
            edgeDistanceThreshold,
            candidate.element.getBoundingClientRect()
          ),
        });

        if (swappedTo === "DEFAULT") {
          handleDropTargetChange(getDefaultDropTarget());
          return;
        }

        if (swappedTo.element === candidate.element) {
          handleDropTargetChange(candidate);
          return;
        }

        candidate = swappedTo;
      }
    };

    return {
      handleMove(pointerCoordinates) {
        state.current.pointerCoordinates = pointerCoordinates;
        detectTarget();
      },

      handleScroll() {
        detectTarget();
      },

      handleEnd() {
        state.current = getInitialState();
      },

      rootRef(rootElement) {
        state.current.root = toUseableElement(rootElement);
      },
    };
  }, []);
};

// @todo: maybe rather than climbing the DOM tree,
// we should use document.elementsFromPoint() array?
// Might work better with absolute positioned elements.
const findClosestDropTarget = <Data>({
  root,
  target,
  isDropTarget,
}: {
  root: UsableElement;
  target: UsableElement;
  isDropTarget: (target: UsableElement) => Data | false;
}): PartialDropTarget<Data> | undefined => {
  // The element we get from elementFromPoint() might not be inside the root
  if (!root.contains(target)) {
    return undefined;
  }

  let currentTarget: UsableElement | undefined = target;
  while (currentTarget !== undefined) {
    const data = isDropTarget(currentTarget);
    if (data !== false) {
      return { data: data, element: currentTarget };
    }
    if (currentTarget === root) {
      break;
    }
    currentTarget = toUseableElement(currentTarget.parentElement);
  }
};
