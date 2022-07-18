import { useMove } from "./use-move";
import { useRef } from "react";

type State =
  | {
      status: "idle";
    }
  | {
      status: "pending";
      x: number;
      y: number;
      initialX: number;
      initialY: number;
      hasShifted: boolean;
    }
  | {
      status: "dragging";
      x: number;
      y: number;
      initialX: number;
      initialY: number;
      hasShifted: boolean;
    }
  | {
      status: "canceled";
    };

const initialState = {
  status: "idle",
} as const;

export const useDrag = ({
  startDistanceThreashold = 3,
  shiftDistanceThreshold = 20,
  verticalDistanceTolerance = 5,
  onStart,
  onMove,
  onShift,
  onEnd,
}: any = {}) => {
  const state = useRef<State>(initialState);

  const cancel = () => {
    state.current = { status: "canceled" };
  };

  const detectShift = (target: HTMLElement) => {
    if (state.current.status !== "dragging" || state.current.hasShifted) {
      return;
    }
    const deltaX = state.current.x - state.current.initialX;
    const hasShifted = Math.abs(deltaX) > shiftDistanceThreshold;
    const hasVerticallyMoved =
      Math.abs(state.current.y - state.current.initialY) >
      verticalDistanceTolerance;
    if (hasShifted && hasVerticallyMoved === false) {
      const direction = deltaX > 0 ? "right" : "left";
      state.current.hasShifted = true;
      onShift({ direction, cancel, target });
    }
  };

  const props = useMove({
    onMoveStart({
      pageX: x,
      pageY: y,
      target,
    }: {
      pageX: number;
      pageY: number;
      target: HTMLElement;
    }) {
      state.current = {
        status: "pending",
        x,
        y,
        initialX: x,
        initialY: y,
        hasShifted: false,
      };
      onStart({ target, cancel });
    },
    onMove({
      pageX: x,
      pageY: y,
      target,
    }: {
      pageX: number;
      pageY: number;
      target: HTMLElement;
    }) {
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
          hasShifted: state.current.hasShifted,
        };
      }

      onMove({ x, y });
      detectShift(target);
    },
    onMoveEnd() {
      state.current = initialState;
      onEnd();
    },
  });

  return props.moveProps;
};
