import { useMove } from "./use-move";
import { useRef, useEffect, useMemo } from "react";

type State =
  | {
      status: "idle" | "canceled";
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

export type UseDragProps = {
  startDistanceThreashold?: number;
  shiftDistanceThreshold?: number;
  onStart: (event: {
    target: HTMLElement;
    x: number;
    y: number;
    cancel: () => void;
  }) => void;
  onMove: (event: { x: number; y: number }) => void;
  onShiftChange?: (event: { shifts: number }) => void;
  onEnd: () => void;
};

export type UseDragHandlers = {
  rootRef: (element: HTMLElement | null) => void;
};

export const useDrag = ({
  startDistanceThreashold = 3,
  shiftDistanceThreshold = 20,
  onStart,
  onMove,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onShiftChange = () => {},
  onEnd,
}: UseDragProps): UseDragHandlers => {
  const state = useRef<State>(initialState);
  const rootRef = useRef<HTMLElement | null>(null);

  const cancel = () => {
    state.current = { status: "canceled" };
  };

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
      onShiftChange({ shifts });
    }
  };

  const { onPointerDown } = useMove({
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
      onStart({ target, x, y, cancel });
    },
    onMove({ clientX: x, clientY: y }: { clientX: number; clientY: number }) {
      if (state.current.status === "canceled") {
        return;
      }

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

  // We want to retrun a stable object to avoid re-renders when it's a dependency
  return useMemo(() => {
    return {
      rootRef(element) {
        rootRef.current = element;
      },
    };
  }, []);
};
