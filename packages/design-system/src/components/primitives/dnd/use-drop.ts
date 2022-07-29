import { useRef, useMemo } from "react";
import { isEqualRect } from "./rect";

export type DropTarget<Data> = {
  data: Data;
  target: Element;
  rect: DOMRect;
};

// We pass around data, to avoid extra data lookups.
// For example, data found in isDropTarget
// doesn't have to be looked up again in swapDropTarget.
export type UseDropProps<Data> = {
  // To check that the element can qualify as a target
  isDropTarget: (target: Element) => Data | false;

  // Given the potential target that has passed isDropTarget check,
  // and the position of the pointer on the target,
  // you can swap to another target
  swapDropTarget?: (args: { target: Element; data: Data; onEdge: boolean }) => {
    target: Element;
    data: Data;
  };

  onDropTargetChange: (dropTarget: DropTarget<Data>) => void;
  edgeDistanceThreshold?: number;
};

export type UseDropHandlers = {
  handleMove: (pointerCoordinate: { x: number; y: number }) => void;
  handleScroll: () => void;
  handleEnd: () => void;
  rootRef: (target: Element | null) => void;
};

export const useDrop = <Data>(props: UseDropProps<Data>): UseDropHandlers => {
  // We want to use fresh props every time we use them,
  // but we don't need to react to updates.
  // So we can put them in a ref and make useMemo below very efficient.
  const latestProps = useRef<UseDropProps<Data>>(props);
  latestProps.current = props;

  const state = useRef({
    root: null as Element | null,
    pointerCoordinate: undefined as { x: number; y: number } | undefined,
    dropTarget: undefined as DropTarget<Data> | undefined,
  });

  // We want to rerurn a stable object to avoid re-renders when it's a dependency
  return useMemo(() => {
    const detectTarget = () => {
      const {
        edgeDistanceThreshold = 3,
        isDropTarget,
        swapDropTarget = (args) => args,
        onDropTargetChange,
      } = latestProps.current;

      const { pointerCoordinate, root } = state.current;
      if (pointerCoordinate === undefined || root === null) {
        return;
      }

      const target = document.elementFromPoint(
        pointerCoordinate.x,
        pointerCoordinate.y
      );
      if (!target) {
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
        rect: potentialTarget.target.getBoundingClientRect(),
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const swappedTarget = swapDropTarget({
          target: dropTarget.target,
          data: dropTarget.data,
          onEdge: isOnEdge(
            pointerCoordinate,
            edgeDistanceThreshold,
            dropTarget.rect
          ),
        });

        if (swappedTarget.target === dropTarget.target) {
          break;
        }

        dropTarget.target = swappedTarget.target;
        dropTarget.data = swappedTarget.data;
        dropTarget.rect = swappedTarget.target.getBoundingClientRect();
      }

      if (
        state.current.dropTarget === undefined ||
        state.current.dropTarget.target !== dropTarget.target ||
        !isEqualRect(state.current.dropTarget.rect, dropTarget.rect)
      ) {
        state.current.dropTarget = dropTarget;
        onDropTargetChange(dropTarget);
      }
    };

    return {
      handleMove(pointerCoordinate: { x: number; y: number }) {
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

      rootRef(rootElement: Element | null) {
        state.current.root = rootElement;
      },
    };
  }, []);
};

const isOnEdge = (
  { x, y }: { x: number; y: number },
  edgeDistanceThreshold: number,
  targetRect: DOMRect
) =>
  Math.min(
    y - targetRect.top,
    targetRect.bottom - y,
    x - targetRect.left,
    targetRect.right - x
  ) <= edgeDistanceThreshold;

// @todo: maybe rather than climbing the DOM tree,
// we should use document.elementsFromPoint() array?
// Might work better with absolute positioned elements.
const findClosestDropTarget = <Data>({
  root,
  target,
  isDropTarget,
}: {
  root: Element;
  target: Element;
  isDropTarget: (target: Element) => Data | false;
}) => {
  let currentTarget: Element | null = target;
  while (currentTarget !== null) {
    const data = isDropTarget(currentTarget);
    if (data !== false) {
      return { data: data, target: currentTarget };
    }

    // @todo: what makes us think that document.elementFromPoint() is inside the root in the first place?
    if (currentTarget === root) {
      break;
    }

    currentTarget = currentTarget.parentElement;
  }
};
