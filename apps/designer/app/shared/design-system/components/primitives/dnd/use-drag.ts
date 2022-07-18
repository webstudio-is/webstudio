import { useMove } from "./use-move";
import { useRef } from "react";

type State =
  | {
      status: "idle";
    }
  | {
      status: "pending";
      pageX: number;
      pageY: number;
    }
  | {
      status: "dragging";
      pageX: number;
      pageY: number;
    }
  | {
      status: "canceled";
    };

const initialState = {
  status: "idle",
} as const;

export const useDrag = ({
  startDistanceThreashold = 3,
  onStart,
  onMove,
  onEnd,
}: any = {}) => {
  const state = useRef<State>(initialState);

  const cancel = () => {
    state.current = { status: "canceled" };
  };

  const props = useMove({
    onMoveStart({
      pageX,
      pageY,
      target,
    }: {
      pageX: number;
      pageY: number;
      target: HTMLElement;
    }) {
      state.current = {
        status: "pending",
        pageX,
        pageY,
      };
      onStart({ target, cancel });
    },
    onMove({ pageX, pageY }: { pageX: number; pageY: number }) {
      if (state.current.status === "canceled") {
        return;
      }

      // We want to start dragging only when the user has moved more than startDistanceThreashold.
      if (
        state.current.status === "pending" &&
        Math.abs(pageX - state.current.pageX) < startDistanceThreashold &&
        Math.abs(pageY - state.current.pageY) < startDistanceThreashold
      ) {
        return;
      }

      state.current = {
        status: "dragging",
        pageX,
        pageY,
      };

      onMove({ x: pageX, y: pageY });
    },
    onMoveEnd() {
      state.current = initialState;
      onEnd();
    },
  });

  return props.moveProps;
};
