import { useRef, useMemo } from "react";
import {
  isEqualRect,
  getArea,
  getClosestRectIndex,
  getIndexAdjustment,
  type Rect,
  type Point,
  type Area,
  type ChildrenOrientation,
} from "./geometry-utils";
import { getLocalChildrenOrientation, getChildrenRects } from "./dom-utils";

// Partial information about a drop target
// used during the selection of a new drop target
type PartialDropTarget<Data> = {
  data: Data;
  element: Element;
};

export type DropTarget<Data> = PartialDropTarget<Data> & {
  rect: DOMRect;
  indexWithinChildren: number;
  placement: {
    closestChildIndex: number;
    indexAdjustment: number;
    childrenOrientation: ChildrenOrientation;
  };
};

// We pass around data, to avoid extra data lookups.
// For example, data found in elementToData
// doesn't have to be looked up again in swapDropTarget.
type UseDropProps<Data> = {
  // To check that the element can qualify as a target
  elementToData: (target: Element) => Data | false;

  // Distance from an edge to determine "area" value for swapDropTarget
  edgeDistanceThreshold?: number;

  // Given the potential target that has passed the elementToData check,
  // and the position of the pointer on the target,
  // you can swap to another target
  swapDropTarget: (
    // undefined is passed when no suitable element is found under the pointer
    dropTarget: (PartialDropTarget<Data> & { area: Area }) | undefined
  ) => PartialDropTarget<Data> & {
    // Set "final" to true if you don't want to swap any further.
    // (Normally swapDropTarget is called repeatedly until the output is the same as the input)
    final?: boolean;
  };

  onDropTargetChange: (dropTarget: DropTarget<Data>) => void;

  // Allows you to customize children
  // that will be used to determine placement and indexWithinChildren
  getValidChildren?: (parent: Element) => Element[] | HTMLCollection;

  // If set to true, the target selection will work as if
  // the pointer is always inside the root element's bounds.
  //
  // For example:
  //  ___________
  // |           |
  // |          *|   * - real pointer
  // |          ^------- emulated pointer
  // |           |
  // |___________|
  emulatePointerAlwaysInRootBounds?: boolean;

  // If not provided, will be guessed automatically based
  // on the actual orientation of the children
  childrenOrientation?: ChildrenOrientation;
};

// When emulatePointerAlwaysInRootBounds=true,
// the pointer always will be at least 2px away from any edge of the root.
const PADDING_WHEN_EMULATING_POINTER_IN_BOUNDS = 2;

type UseDropHandlers = {
  handleMove: (pointerCoordinates: Point) => void;
  handleScroll: () => void;
  handleStart: () => void;
  handleEnd: (event: { isCanceled: boolean }) => void;
  rootRef: (target: Element | null) => void;
  handleDomMutation: () => void;
};

const getInitialState = <Data>() => {
  return {
    started: false,
    pointerCoordinates: undefined as Point | undefined,
    dropTarget: undefined as DropTarget<Data> | undefined,
    childrenRectsCache: new WeakMap<Element, Rect[]>(),
    lastInitialCandidate: undefined as
      | (PartialDropTarget<Data> & { area: Area })
      | undefined,
  };
};

/**
 * accept by default only children without data-placement-indicator
 * to avoid including placement indicator element which is often put
 * along with other children and is always close to dragging point
 */
export const defaultGetValidChildren = (parent: Element) =>
  Array.from(parent.children).filter(
    (element) => element.hasAttribute("data-placement-indicator") === false
  );

export const useDrop = <Data>(props: UseDropProps<Data>): UseDropHandlers => {
  // We want to use fresh props every time we use them,
  // but we don't need to react to updates.
  // So we can put them in a ref and make useMemo below very efficient.
  const latestProps = useRef<UseDropProps<Data>>(props);
  latestProps.current = props;

  const rootRef = useRef<Element | null>(null);
  const state = useRef(getInitialState<Data>());

  // We want to return a stable object to avoid re-renders when it's a dependency
  return useMemo(() => {
    const getChildrenRectsMemoized = (parent: Element) => {
      const { getValidChildren = defaultGetValidChildren } =
        latestProps.current;
      const fromCache = state.current.childrenRectsCache.get(parent);
      if (fromCache !== undefined) {
        return fromCache;
      }
      const result = getChildrenRects(parent, getValidChildren(parent));
      state.current.childrenRectsCache.set(parent, result);
      return result;
    };

    const setDropTarget = (partialDropTarget: PartialDropTarget<Data>) => {
      const { pointerCoordinates } = state.current;
      if (pointerCoordinates === undefined) {
        return;
      }

      const parentRect = partialDropTarget.element.getBoundingClientRect();

      const pointerRelativeToParent = {
        x: pointerCoordinates.x - parentRect.left,
        y: pointerCoordinates.y - parentRect.top,
      };

      const childrenRects = getChildrenRectsMemoized(partialDropTarget.element);

      const closestChildIndex =
        childrenRects.length === 0
          ? 0
          : getClosestRectIndex(childrenRects, pointerRelativeToParent);
      const closestChildRect = childrenRects[closestChildIndex] as
        | Rect
        | undefined;

      const childrenOrientation =
        latestProps.current.childrenOrientation ??
        getLocalChildrenOrientation(
          partialDropTarget.element,
          latestProps.current.getValidChildren ?? ((parent) => parent.children),
          childrenRects,
          closestChildIndex
        );

      const indexAdjustment = getIndexAdjustment(
        pointerRelativeToParent,
        closestChildRect,
        childrenOrientation
      );

      const indexWithinChildren = closestChildIndex + indexAdjustment;

      const current = state.current.dropTarget;
      if (
        current === undefined ||
        current.element !== partialDropTarget.element ||
        current.indexWithinChildren !== indexWithinChildren ||
        isEqualRect(current.rect, parentRect) === false
      ) {
        const dropTarget: DropTarget<Data> = {
          ...partialDropTarget,
          rect: parentRect,
          indexWithinChildren,
          placement: {
            closestChildIndex,
            indexAdjustment,
            childrenOrientation,
          },
        };

        state.current.dropTarget = dropTarget;
        latestProps.current.onDropTargetChange(dropTarget);
      }
    };

    const detectTarget = () => {
      const {
        edgeDistanceThreshold = 3,
        elementToData,
        swapDropTarget,
      } = latestProps.current;

      if (state.current.started === false) {
        return;
      }

      const { pointerCoordinates } = state.current;
      const root = rootRef.current;

      const withArea = (
        candidate: PartialDropTarget<Data> | null | undefined
      ) => {
        if (candidate == null || pointerCoordinates === undefined) {
          return undefined;
        }
        return {
          ...candidate,
          area: getArea(
            pointerCoordinates,
            edgeDistanceThreshold,
            candidate.element.getBoundingClientRect()
          ),
        };
      };

      // @todo: Cache this?
      // Not expensive by itself, but it may call elementToData multiple times.
      let candidate = withArea(
        root &&
          findClosestDropTarget({
            root,
            initialElement:
              pointerCoordinates &&
              document.elementFromPoint(
                pointerCoordinates.x,
                pointerCoordinates.y
              ),
            elementToData,
          })
      );

      // To avoid calling swapDropTarget unnecessarily on every pointermove
      const isNewInitialCandidate =
        candidate?.element !== state.current.lastInitialCandidate?.element ||
        candidate?.area !== state.current.lastInitialCandidate?.area;
      state.current.lastInitialCandidate = candidate;
      if (isNewInitialCandidate === false && state.current.dropTarget) {
        // Still need to call setDropTarget to update rect and/or placement.
        // Because indexWithinChildren might have changed,
        // or parent coordinates might have moved in case of a scroll
        setDropTarget(state.current.dropTarget);
        return;
      }

      let continueSwapping = true;
      while (continueSwapping || candidate == null) {
        const swappedTo = swapDropTarget(candidate);
        continueSwapping =
          swappedTo.element !== candidate?.element && swappedTo.final !== true;
        candidate = withArea(swappedTo);
      }

      setDropTarget(candidate);
    };

    return {
      handleMove(pointerCoordinates) {
        if (latestProps.current.emulatePointerAlwaysInRootBounds === true) {
          const rect = (rootRef.current as Element).getBoundingClientRect();
          const { x, y } = pointerCoordinates;
          state.current.pointerCoordinates = {
            x: Math.max(
              rect.left + PADDING_WHEN_EMULATING_POINTER_IN_BOUNDS,
              Math.min(rect.right - PADDING_WHEN_EMULATING_POINTER_IN_BOUNDS, x)
            ),
            y: Math.max(
              rect.top + PADDING_WHEN_EMULATING_POINTER_IN_BOUNDS,
              Math.min(
                rect.bottom - PADDING_WHEN_EMULATING_POINTER_IN_BOUNDS,
                y
              )
            ),
          };
        } else {
          state.current.pointerCoordinates = pointerCoordinates;
        }
        detectTarget();
      },

      handleScroll() {
        detectTarget();
      },

      handleStart() {
        state.current.started = true;
      },

      handleEnd() {
        state.current = getInitialState();
      },

      rootRef(rootElement) {
        rootRef.current = rootElement;
      },

      handleDomMutation() {
        state.current.childrenRectsCache = new WeakMap();
        state.current.lastInitialCandidate = undefined;
        detectTarget();
      },
    };
  }, []);
};

const findClosestDropTarget = <Data>({
  root,
  initialElement,
  elementToData,
}: {
  root: Element;
  initialElement: Element | undefined | null;
  elementToData: (target: Element) => Data | false;
}): PartialDropTarget<Data> | undefined => {
  // The element we get from elementFromPoint() might not be inside the root
  if (initialElement === undefined || root.contains(initialElement) === false) {
    return undefined;
  }

  let currentElement = initialElement;
  while (currentElement != null) {
    const data = elementToData(currentElement);
    if (data !== false) {
      return { data: data, element: currentElement };
    }
    if (currentElement === root) {
      break;
    }
    currentElement = currentElement.parentElement;
  }
};
