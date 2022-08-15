import { useRef, useMemo } from "react";
import {
  isEqualRect,
  getArea,
  getClosestRectIndex,
  getPlacementBetween,
  getPlacementInside,
  getPlacementNextTo,
  getIndexAdjustment,
  type Rect,
  type Point,
  type Placement,
  type Area,
} from "./geometry-utils";
import { getLocalChildrenOrientation, getChildrenRects } from "./dom-utils";

// Partial information about a drop target
// used during the selection of a new drop target
export type PartialDropTarget<Data> = {
  data: Data;
  element: Element;
};

export type DropTarget<Data> = PartialDropTarget<Data> & {
  rect: DOMRect;
  indexWithinChildren: number;
  placement: Placement;
};

// We pass around data, to avoid extra data lookups.
// For example, data found in elementToData
// doesn't have to be looked up again in swapDropTarget.
export type UseDropProps<Data> = {
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
  //
  // The pointer will be always at least 2px away from any edge of the root.
  emulatePointerAlwaysInRootBounds?: boolean;

  // Distance from an edge when placement is put next to an element edge
  placementPadding?: number;
};

export type UseDropHandlers = {
  handleMove: (pointerCoordinates: Point) => void;
  handleScroll: () => void;
  handleStart: () => void;
  handleEnd: () => void;
  rootRef: (target: Element | Document | null) => void;
  handleDomMutation: () => void;
};

const getInitialState = <Data>() => {
  return {
    started: false,
    pointerCoordinates: undefined as Point | undefined,
    dropTarget: undefined as DropTarget<Data> | undefined,
    childrenRectsCache: new WeakMap<Element, Rect[]>(),
    lastCandidateElement: undefined as Element | undefined,
    lastCandidateArea: undefined as Area | undefined,
  };
};

export const useDrop = <Data>(props: UseDropProps<Data>): UseDropHandlers => {
  // We want to use fresh props every time we use them,
  // but we don't need to react to updates.
  // So we can put them in a ref and make useMemo below very efficient.
  const latestProps = useRef<UseDropProps<Data>>(props);
  latestProps.current = props;

  const rootRef = useRef<Element | Document | null>(null);
  const state = useRef(getInitialState<Data>());

  // We want to return a stable object to avoid re-renders when it's a dependency
  return useMemo(() => {
    const getChildrenRectsMemoized = (parent: Element) => {
      const { getValidChildren = (parent) => parent.children } =
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

      const childrenOrientation = getLocalChildrenOrientation(
        partialDropTarget.element,
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
        const toGlobalCoordinates = (placement: Placement | undefined) =>
          placement && {
            ...placement,
            x: placement.x + parentRect.left,
            y: placement.y + parentRect.top,
          };

        const neighbourRect = childrenRects[
          indexAdjustment === 0 ? closestChildIndex - 1 : closestChildIndex + 1
        ] as Rect | undefined;

        const placement =
          toGlobalCoordinates(
            getPlacementBetween(closestChildRect, neighbourRect)
          ) ||
          toGlobalCoordinates(
            getPlacementNextTo(
              parentRect,
              closestChildRect,
              childrenOrientation,
              indexAdjustment > 0 ? "forward" : "backward",
              latestProps.current.placementPadding
            )
          ) ||
          getPlacementInside(
            parentRect,
            childrenOrientation,
            latestProps.current.placementPadding
          );

        const dropTarget: DropTarget<Data> = {
          ...partialDropTarget,
          rect: parentRect,
          indexWithinChildren,
          placement,
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

      // @todo: Cache this?
      // Not expensive by itself, but it may call elementToData multiple times.
      let candidate =
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
        });

      // To avoid calling swapDropTarget unnecessarily on every pointermove
      const isNewCandidate =
        candidate?.element !== state.current.lastCandidateElement;
      state.current.lastCandidateElement = candidate?.element;
      const candidateArea =
        candidate && pointerCoordinates
          ? getArea(
              pointerCoordinates,
              edgeDistanceThreshold,
              candidate.element.getBoundingClientRect()
            )
          : undefined;
      const isNewArea = candidateArea !== state.current.lastCandidateArea;
      state.current.lastCandidateArea = candidateArea;
      if (
        isNewCandidate === false &&
        isNewArea === false &&
        state.current.dropTarget
      ) {
        // Still need to call setDropTarget to update rect and/or placement.
        // Because indexWithinChildren might have changed,
        // or parent coordinates might have moved in case of a scroll
        setDropTarget(state.current.dropTarget);
        return;
      }

      let continueSwapping = true;
      while (continueSwapping || candidate == null) {
        const swappedTo = swapDropTarget(
          candidate && pointerCoordinates
            ? {
                ...candidate,
                area: getArea(
                  pointerCoordinates,
                  edgeDistanceThreshold,
                  candidate.element.getBoundingClientRect()
                ),
              }
            : undefined
        );
        continueSwapping =
          swappedTo.element !== candidate?.element && swappedTo.final !== true;
        candidate = swappedTo;
      }

      setDropTarget(candidate);
    };

    return {
      handleMove(pointerCoordinates) {
        if (latestProps.current.emulatePointerAlwaysInRootBounds === true) {
          const rect = (rootRef.current as Element).getBoundingClientRect();
          const padding = 2;
          const { x, y } = pointerCoordinates;
          state.current.pointerCoordinates = {
            x: Math.max(rect.left + padding, Math.min(rect.right - padding, x)),
            y: Math.max(rect.top + padding, Math.min(rect.bottom - padding, y)),
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
        state.current.lastCandidateElement = undefined;
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
  root: Element | Document;
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
