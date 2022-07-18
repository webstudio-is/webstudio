import { useRef } from "react";
import { useMove } from "./use-move";

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

export const useDrag = ({
  onStart,
  startDistanceThreashold = 3,
  onMove,
}: any = {}) => {
  const state = useRef<State>({
    status: "idle",
  });

  const cancel = () => {
    state.current = { status: "canceled" };
  };

  const props = useMove({
    onMoveStart(event: any) {
      state.current = {
        status: "pending",
        pageX: event.pageX,
        pageY: event.pageY,
      };

      onStart({ ...event, cancel });
    },
    onMove(event: any) {
      if (state.current.status === "canceled") {
        return;
      }

      // We want to start dragging only when the user has moved more than startDistanceThreashold.
      if (
        state.current.status === "pending" &&
        Math.abs(event.pageX - state.current.pageX) < startDistanceThreashold &&
        Math.abs(event.pageY - state.current.pageY) < startDistanceThreashold
      ) {
        return;
      }

      state.current = {
        status: "dragging",
        pageX: event.pageX,
        pageY: event.pageY,
      };

      onMove({ x: event.pageX, y: event.pageY });
    },
    onMoveEnd() {
      state.current.status = "idle";
    },
  });

  return props.moveProps;
};
