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
      shifts: number;
    }
  | {
      status: "dragging";
      x: number;
      y: number;
      initialX: number;
      initialY: number;
      shifts: number;
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
  onStart,
  onMove,
  onShiftChange,
  onEnd,
}: any = {}) => {
  const state = useRef<State>(initialState);

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
        shifts: 0,
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

  return props.moveProps;
};
