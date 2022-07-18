import { useEffect, useRef } from "react";
import { useMove } from "./use-move";

type IsDropTarget = (element: HTMLElement) => boolean;

const findDropTarget = ({
  root,
  target,
  isDropTarget,
}: {
  root: HTMLElement;
  target: HTMLElement;
  isDropTarget: IsDropTarget;
}): HTMLElement => {
  let currentTarget: HTMLElement | null = target;
  while (currentTarget !== null && currentTarget !== root) {
    const isValid = isDropTarget(currentTarget);
    if (isValid) {
      return target;
    }
    currentTarget = currentTarget.parentElement;
  }
  return root;
};

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
      target: HTMLElement;
    }
  | {
      status: "canceled";
    };

export const useDrag = ({
  onStart,
  startDistanceThreashold = 3,
  isDropTarget,
  onDropTargetChange,
}: any = {}) => {
  const rootRef = useRef<HTMLElement | null>(null);
  const state = useRef<State>({
    status: "idle",
  });

  const cancel = () => {
    state.current = { status: "canceled" };
  };

  const setDropTarget = () => {};

  const props = useMove({
    onMoveStart(event: any) {
      state.current = {
        status: "pending",
        pageX: event.pageX,
        pageY: event.pageY,
      };

      onStart({ ...event, cancel });
      console.log(event);
    },
    onMove(event: any) {
      if (state.current.status === "canceled") {
        return;
      }

      if (
        state.current.status === "pending" &&
        Math.abs(event.pageX - state.current.pageX) < startDistanceThreashold &&
        Math.abs(event.pageY - state.current.pageY) < startDistanceThreashold
      ) {
        return;
      }

      if (rootRef.current === null) {
        return;
      }

      const nextTarget = findDropTarget({
        root: rootRef.current,
        target: event.target,
        isDropTarget,
      });

      const hasTargetChanged =
        state.current.status !== "dragging" ||
        nextTarget !== state.current.target;

      state.current = {
        status: "dragging",
        pageX: event.pageX,
        pageY: event.pageY,
        target: nextTarget,
      };

      if (hasTargetChanged) {
        onDropTargetChange(nextTarget);
      }
    },
    onMoveEnd() {
      state.current.status = "idle";
    },
  });

  return {
    ...props.moveProps,
    ref(rootElement: HTMLElement | null) {
      rootRef.current = rootElement;
    },
  };
};
