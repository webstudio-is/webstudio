import { useMove } from "./use-move";
import { useRef } from "react";

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

export type Parameters = {
  startDistanceThreashold?: number;
  shiftDistanceThreshold?: number;
  onStart: (event: { target: HTMLElement; cancel: () => void }) => void;
  onMove: (event: { x: number; y: number }) => void;
  onShiftChange?: (event: { shifts: number }) => void;
  onEnd: () => void;
};

export const useDrag = ({
  startDistanceThreashold = 3,
  shiftDistanceThreshold = 20,
  onStart,
  onMove,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onShiftChange = () => {},
  onEnd,
}: Parameters): React.HTMLAttributes<HTMLElement> => {
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
    onMove({ pageX: x, pageY: y }: { pageX: number; pageY: number }) {
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
