import { useRef } from "react";
import { Box } from "../../box";

export type Rect = Pick<DOMRect, "top" | "left" | "width" | "height">;
type Coordinates = { x: number; y: number };

const probe = document.createElement("div");

/**
 * We place a div at the position where future drop will happen.
 * We learn if the indicator will render vertically or horizontally as well as its width/heigh.
 */
const getPlacement = ({
  target,
  index = 0,
}: {
  target: HTMLElement;
  index?: number;
}) => {
  const { children } = target;
  if (index > children.length - 1) {
    target.appendChild(probe);
  } else {
    target.insertBefore(probe, children[index]);
  }
  const rect = probe.getBoundingClientRect();
  target.removeChild(probe);
  return rect;
};

// https://stackoverflow.com/a/18157551/478603
const getDistance = (rect: Rect, { x, y }: Coordinates) => {
  const dx = Math.max(rect.left - x, 0, x - (rect.left + rect.width));
  const dy = Math.max(rect.top - y, 0, y - (rect.top + rect.height));
  return Math.sqrt(dx * dx + dy * dy);
};

const getClosestRectIndex = (rects: Rect[], point: Coordinates) => {
  if (rects.length === 0) {
    return -1;
  }

  const sorted = rects
    .map((rect, index) => ({
      index,
      distance: getDistance(rect, point),
    }))
    .sort((a, b) => a.distance - b.distance);

  return sorted[0].index;
};

const isEqualRect = (a: Rect | undefined, b: Rect) => {
  return (
    a !== undefined &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
};

type Parameters = {
  onPalcementChange: (event: { index: number; placementRect: Rect }) => void;
};

type Handlers = {
  handleEnd: () => void;
  handleMove: (pointerCoordinate: Coordinates) => void;
  handleScroll: () => void;
  handleTargetChange: (target: HTMLElement) => void;
};

export const usePlacement = ({ onPalcementChange }: Parameters): Handlers => {
  const state = useRef({
    childrenRectsCache: new WeakMap<HTMLElement, Rect[]>(),
    target: undefined as HTMLElement | undefined,
    targetRect: undefined as DOMRect | undefined,
    pointerCoordinate: undefined as Coordinates | undefined,
    index: undefined as number | undefined,
    placementRext: undefined as Rect | undefined,
  });

  const getChildrenRects = (parent: HTMLElement, parentRect: DOMRect) => {
    const fromCache = state.current.childrenRectsCache.get(parent);
    if (fromCache !== undefined) {
      return fromCache;
    }

    const result: Rect[] = [];

    for (const child of parent.children) {
      if (child instanceof HTMLElement) {
        const rect = child.getBoundingClientRect();
        result.push({
          top: rect.top - parentRect.top,
          left: rect.left - parentRect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    }

    state.current.childrenRectsCache.set(parent, result);
    return result;
  };

  const getIndex = (
    parent: HTMLElement,
    parentRect: DOMRect,
    pointerCoordinate: Coordinates
  ) => {
    if (parent.children.length === 0) {
      return 0;
    }

    const childrenRects = getChildrenRects(parent, parentRect);

    const pointerAdjusted = {
      x: pointerCoordinate.x - parentRect.left,
      y: pointerCoordinate.y - parentRect.top,
    };

    const closestRectIndex = getClosestRectIndex(
      childrenRects,
      pointerAdjusted
    );
    const closesRect = childrenRects[closestRectIndex];

    const isOrientationVertical =
      childrenRects.length < 2 ||
      childrenRects[0].left === childrenRects[1].left;

    if (isOrientationVertical) {
      const middleY = closesRect.top + closesRect.height / 2;
      return pointerAdjusted.y < middleY
        ? closestRectIndex
        : closestRectIndex + 1;
    } else {
      const middleX = closesRect.left + closesRect.width / 2;
      return pointerAdjusted.x < middleX
        ? closestRectIndex
        : closestRectIndex + 1;
    }
  };

  const detectChange = (
    reason: "pointer-move" | "scroll" | "target-change"
  ) => {
    const { target, pointerCoordinate } = state.current;

    if (target === undefined || pointerCoordinate === undefined) {
      return;
    }

    const nextTargetRect = target.getBoundingClientRect();
    const targetRectChanged = !isEqualRect(
      state.current.targetRect,
      nextTargetRect
    );

    state.current.targetRect = nextTargetRect;

    const nextIndex = getIndex(target, nextTargetRect, pointerCoordinate);
    const indexChanged = nextIndex !== state.current.index;
    state.current.index = nextIndex;

    if (reason !== "target-change" && !indexChanged && !targetRectChanged) {
      return;
    }

    const nextPlacementRect = getPlacement({ target, index: nextIndex });
    const placementRectChanged = !isEqualRect(
      state.current.placementRext,
      nextPlacementRect
    );
    state.current.placementRext = nextPlacementRect;

    if (placementRectChanged || indexChanged) {
      onPalcementChange({ index: nextIndex, placementRect: nextPlacementRect });
    }
  };

  return {
    handleEnd() {
      state.current = {
        childrenRectsCache: new WeakMap(),
        target: undefined,
        targetRect: undefined,
        pointerCoordinate: undefined,
        index: undefined,
        placementRext: undefined,
      };
    },
    handleMove(pointerCoordinate) {
      state.current.pointerCoordinate = pointerCoordinate;
      detectChange("pointer-move");
    },
    handleScroll() {
      detectChange("scroll");
    },
    handleTargetChange: (target) => {
      state.current.target = target;
      detectChange("target-change");
    },
  };
};

export const PlacementIndicator = ({ rect }: { rect?: Rect }) => {
  if (rect === undefined) {
    return null;
  }

  const style = {
    top: rect.top - 1,
    left: rect.left - 1,
    width: rect.width,
    height: rect.height,
  };

  return (
    <Box
      style={style}
      css={{
        boxSizing: "content-box",
        position: "absolute",
        border: "1px solid $grass9",
        pointerEvents: "none",
      }}
    />
  );
};
