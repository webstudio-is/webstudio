import { useMove } from "./use-move";
import { useRef, useEffect, useMemo } from "react";
import { type Point } from "./geometry-utils";

type State<Data> = {
  status: "pending" | "dragging" | "idle";
  initialX: number;
  initialY: number;
  shifts: number;
  root: HTMLElement | null;
  dragItemData: Data | undefined;
};

const initialState: State<unknown> = {
  status: "idle",
  initialX: 0,
  initialY: 0,
  shifts: 0,
  root: null,
  dragItemData: undefined,
};

export type UseDragProps<DragItemData> = {
  startDistanceThreashold?: number;
  shiftDistanceThreshold?: number;
  elementToData: (element: Element) => DragItemData | false;
  onStart: (event: { data: DragItemData }) => void;
  onMove: (event: Point) => void;
  onShiftChange?: (event: { shifts: number }) => void;
  onEnd: (event: { isCanceled: boolean }) => void;
};

export type UseDragHandlers = {
  rootRef: (element: HTMLElement | null) => void;
  cancelCurrentDrag: () => void;
};

export const useDrag = <DragItemData>({
  startDistanceThreashold = 3,
  shiftDistanceThreshold = 20,
  onStart,
  onMove,
  onShiftChange,
  onEnd,
  elementToData,
}: UseDragProps<DragItemData>): UseDragHandlers => {
  const state = useRef<State<DragItemData>>({
    ...(initialState as State<DragItemData>),
  });

  const detectShift = (x: number) => {
    const deltaX = x - state.current.initialX;
    const shifts =
      deltaX > 0
        ? Math.floor(deltaX / shiftDistanceThreshold)
        : Math.ceil(deltaX / shiftDistanceThreshold);

    if (shifts !== state.current.shifts) {
      state.current.shifts = shifts;
      onShiftChange?.({ shifts });
    }
  };

  const useMoveHandlers = useMove({
    shouldStart: ({ target }) => {
      if (!target) {
        return false;
      }

      const data = elementToData(target as Element);

      if (data === false) {
        return false;
      }

      state.current.dragItemData = data;
      return true;
    },
    onMoveStart({ clientX: x, clientY: y }) {
      state.current = {
        ...state.current,
        status: "pending",
        initialX: x,
        initialY: y,
      };
    },
    onMove({ clientX: x, clientY: y }) {
      // We want to start dragging only when the user has moved more than startDistanceThreashold.
      if (
        state.current.status === "pending" &&
        Math.abs(x - state.current.initialX) < startDistanceThreashold &&
        Math.abs(y - state.current.initialY) < startDistanceThreashold
      ) {
        return;
      }

      if (
        state.current.status === "pending" &&
        state.current.dragItemData !== undefined
      ) {
        onStart({ data: state.current.dragItemData });
        state.current.status = "dragging";
      }

      if (state.current.status === "dragging") {
        onMove({ x, y });
        detectShift(x);
      }
    },
    onMoveEnd({ isCanceled }) {
      // A drag is basically a very slow click.
      // But we don't want it to register as a click.
      if (isCanceled === false && state.current.status === "dragging") {
        const handleClick = (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
        };
        window.addEventListener("click", handleClick, true);
        setTimeout(() => {
          window.removeEventListener("click", handleClick, true);
        });
      }

      state.current = {
        ...(initialState as State<DragItemData>),
        root: state.current.root,
      };
      onEnd({ isCanceled: isCanceled });
    },
  });

  useEffect(() => {
    const roorElement = state.current.root;
    if (roorElement !== null) {
      roorElement.addEventListener(
        "pointerdown",
        useMoveHandlers.onPointerDown
      );
      return () => {
        roorElement.removeEventListener(
          "pointerdown",
          useMoveHandlers.onPointerDown
        );
      };
    }
  }, [useMoveHandlers]);

  // We want to return a stable object to avoid re-renders when it's a dependency
  return useMemo(() => {
    return {
      rootRef(element) {
        state.current.root = element;
      },
      cancelCurrentDrag() {
        useMoveHandlers.cancelCurrentMove();
      },
    };
  }, [useMoveHandlers]);
};
