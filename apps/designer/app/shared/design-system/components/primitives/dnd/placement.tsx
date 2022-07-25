import { useRef } from "react";
import { Box } from "../../box";

export type Rect = Pick<DOMRect, "top" | "left" | "width" | "height">;
type Point = { x: number; y: number };

let probeCache: undefined | HTMLElement;
const getProbe = () => {
  if (probeCache === undefined) {
    probeCache = document.createElement("div");
  }
  return probeCache;
};

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
  const probe = getProbe();
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
const getDistance = (rect: Rect, { x, y }: Point) => {
  const dx = Math.max(rect.left - x, 0, x - (rect.left + rect.width));
  const dy = Math.max(rect.top - y, 0, y - (rect.top + rect.height));
  return Math.sqrt(dx * dx + dy * dy);
};

const getClosestRectIndex = (rects: Rect[], point: Point) => {
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

type UsePlacementProps = {
  onPlacementChange: (event: { index: number; placementRect: Rect }) => void;
};

type Handlers = {
  handleEnd: () => void;
  handleMove: (pointerPoint: Point) => void;
  handleScroll: () => void;
  handleTargetChange: (target: HTMLElement) => void;
};

export const usePlacement = ({
  onPlacementChange,
}: UsePlacementProps): Handlers => {
  const state = useRef({
    childrenRectsCache: new WeakMap<HTMLElement, Rect[]>(),
    target: undefined as HTMLElement | undefined,
    targetRect: undefined as DOMRect | undefined,
    pointerPoint: undefined as Point | undefined,
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
    pointerPoint: Point
  ) => {
    if (parent.children.length === 0) {
      return 0;
    }

    const childrenRects = getChildrenRects(parent, parentRect);

    const pointerAdjusted = {
      x: pointerPoint.x - parentRect.left,
      y: pointerPoint.y - parentRect.top,
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
    const { target, pointerPoint } = state.current;

    if (target === undefined || pointerPoint === undefined) {
      return;
    }

    const nextTargetRect = target.getBoundingClientRect();
    const targetRectChanged = !isEqualRect(
      state.current.targetRect,
      nextTargetRect
    );

    state.current.targetRect = nextTargetRect;

    const nextIndex = getIndex(target, nextTargetRect, pointerPoint);
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
      onPlacementChange({ index: nextIndex, placementRect: nextPlacementRect });
    }
  };

  return {
    handleEnd() {
      state.current = {
        childrenRectsCache: new WeakMap(),
        target: undefined,
        targetRect: undefined,
        pointerPoint: undefined,
        index: undefined,
        placementRext: undefined,
      };
    },
    handleMove(pointerPoint) {
      state.current.pointerPoint = pointerPoint;
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

        // @todo: this makes the line 2px longer that it should be.
        // need to render it differently somehow.
        border: "1px solid $blue9",
        pointerEvents: "none",
      }}
    />
  );
};
