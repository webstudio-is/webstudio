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
  isDragItem: (element: Element) => DragItemData | false;
  onStart: (event: { target: HTMLElement; data: DragItemData }) => void;
  onMove: (event: Point) => void;
  onShiftChange?: (event: { shifts: number }) => void;
  onEnd: () => void;
};

export type UseDragHandlers = {
  rootRef: (element: HTMLElement | null) => void;
};

export const useDrag = <DragItemData>({
  startDistanceThreashold = 3,
  shiftDistanceThreshold = 20,
  onStart,
  onMove,
  onShiftChange,
  onEnd,
  isDragItem,
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

  const { onPointerDown } = useMove({
    shouldStart: ({ target }) => {
      if (!target) {
        return false;
      }

      const data = isDragItem(target as Element);

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
    onMoveEnd() {
      state.current = initialState;
      onEnd();
    },
  });

  useEffect(() => {
    const roorElement = rootRef.current;
    if (roorElement !== null) {
      roorElement.addEventListener("pointerdown", onPointerDown);
      return () => {
        roorElement.removeEventListener("pointerdown", onPointerDown);
      };
    }
  }, [onPointerDown]);

  // We want to return a stable object to avoid re-renders when it's a dependency
  return useMemo(() => {
    return {
      rootRef(element) {
        rootRef.current = element;
      },
    };
  }, []);
};
