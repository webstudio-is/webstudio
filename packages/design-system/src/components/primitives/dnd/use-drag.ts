import { useMove } from "./use-move";
import { useRef, useEffect, useMemo } from "react";
import { type Point } from "./geometry-utils";

type State =
  | {
      status: "idle";
    }
  | {
      status: "pending" | "dragging";
      x: number;
      y: number;
      initialX: number;
      initialY: number;
      shifts: number;
    };

const initialState = {
  status: "idle",
} as const;

export type UseDragProps<DragItemData> = {
  startDistanceThreashold?: number;
  shiftDistanceThreshold?: number;
  elementToData: (element: Element) => DragItemData | false;
  onStart: (event: { target: HTMLElement; data: DragItemData }) => void;
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
  const state = useRef<State>(initialState);
  const rootRef = useRef<HTMLElement | null>(null);
  const dragItemData = useRef<DragItemData>();

  const detectShift = () => {
    if (state.current.status !== "dragging") {
      return;
    }
    const deltaX = state.current.x - state.current.initialX;
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

      dragItemData.current = data;

      return true;
    },
    onMoveStart({
      clientX: x,
      clientY: y,
      target,
    }: {
      clientX: number;
      clientY: number;
      target: HTMLElement;
    }) {
      state.current = {
        status: "pending",
        x,
        y,
        initialX: x,
        initialY: y,
        shifts: 0,
      };
      if (dragItemData.current !== undefined) {
        onStart({ target, data: dragItemData.current });
      }
    },
    onMove({ clientX: x, clientY: y }: { clientX: number; clientY: number }) {
      // We want to start dragging only when the user has moved more than startDistanceThreashold.
      if (
        state.current.status === "pending" &&
        Math.abs(x - state.current.x) < startDistanceThreashold &&
        Math.abs(y - state.current.y) < startDistanceThreashold
      ) {
        return;
      }

      // We shouldn't be in non-pending state when we get here, unles user has ended the drag and yet somehow we ended up with onMove() call.
      if (
        state.current.status === "pending" ||
        state.current.status === "dragging"
      ) {
        state.current = {
          status: "dragging",
          x,
          y,
          initialX: state.current.initialX,
          initialY: state.current.initialY,
          shifts: state.current.shifts,
        };
      }

      onMove({ x, y });
      detectShift();
    },
    onMoveEnd(event) {
      state.current = initialState;
      onEnd({ isCanceled: event.isCanceled });

      // A drag is basically a very slow click.
      // But we don't want it to register as a click.
      if (event.isCanceled === false) {
        const handleClick = (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
        };
        window.addEventListener("click", handleClick, true);
        setTimeout(() => {
          window.removeEventListener("click", handleClick, true);
        });
      }
    },
  });

  useEffect(() => {
    const roorElement = rootRef.current;
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
        rootRef.current = element;
      },
      cancelCurrentDrag() {
        useMoveHandlers.cancelCurrentMove();
      },
    };
  }, [useMoveHandlers]);
};
