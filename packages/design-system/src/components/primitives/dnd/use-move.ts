// this was taken from https://react-spectrum.adobe.com/react-aria/useMove.html
// but changed a lot

import { useMemo, useRef } from "react";
import { useGlobalListeners } from "@react-aria/utils";

interface MoveResult {
  onPointerDown: (e: PointerEvent) => void;
  cancelCurrentMove: () => void;
}

interface MoveStartEvent {
  type: "movestart";
  target: HTMLElement;
  clientX: number;
  clientY: number;
}

interface MoveMoveEvent {
  type: "move";
  clientX: number;
  clientY: number;
}

interface MoveEndEvent {
  type: "moveend";
  isCanceled: boolean;
}

interface MoveEvents {
  shouldStart: (e: PointerEvent) => boolean;
  /** Handler that is called when a move interaction starts. */
  onMoveStart?: (e: MoveStartEvent) => void;
  /** Handler that is called when the element is moved. */
  onMove?: (e: MoveMoveEvent) => void;
  /** Handler that is called when a move interaction ends. */
  onMoveEnd?: (e: MoveEndEvent) => void;
}

export const useMove = (props: MoveEvents): MoveResult => {
  const state = useRef<{
    didMove: boolean;
    lastPosition: { pageX: number; pageY: number } | null;
    id: number | null;
  }>({ didMove: false, lastPosition: null, id: null });

  const { addGlobalListener, removeGlobalListener } = useGlobalListeners();

  // Because addGlobalListener is used to set callbacks,
  // noramlly it will "see" the version of "props" at the time of addGlobalListener call.
  // This in turn means that user's callbakcs will see old state variables etc.
  // To workaround this, we use a ref that always points to the latest props.
  const latestProps = useRef<MoveEvents>(props);
  latestProps.current = props;

  const moveResult = useMemo(() => {
    const start = () => {
      state.current.didMove = false;
    };
    const move = (
      originalEvent: PointerEvent,
      deltaX: number,
      deltaY: number
    ) => {
      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      if (
        !state.current.didMove &&
        originalEvent.target instanceof HTMLElement
      ) {
        state.current.didMove = true;
        latestProps.current.onMoveStart?.({
          type: "movestart",
          target: originalEvent.target,
          clientX: originalEvent.clientX,
          clientY: originalEvent.clientY,
        });
      }

      latestProps.current.onMove?.({
        type: "move",
        clientX: originalEvent.clientX,
        clientY: originalEvent.clientY,
      });
    };

    const end = (event: PointerEvent | "canceled") => {
      if (state.current.didMove) {
        latestProps.current.onMoveEnd?.({
          type: "moveend",
          isCanceled: event === "canceled",
        });
      }

      state.current.id = null;
      removeGlobalListener(window, "pointermove", onPointerMove, false);
      removeGlobalListener(window, "pointerup", onPointerUp, false);
      removeGlobalListener(window, "pointercancel", onPointerUp, false);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (
        event.pointerId === state.current.id &&
        state.current.lastPosition !== null
      ) {
        // Problems with PointerEvent#movementX/movementY:
        // 1. it is always 0 on macOS Safari.
        // 2. On Chrome Android, it's scaled by devicePixelRatio, but not on Chrome macOS
        move(
          event,
          event.pageX - state.current.lastPosition.pageX,
          event.pageY - state.current.lastPosition.pageY
        );
        state.current.lastPosition = { pageX: event.pageX, pageY: event.pageY };
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId === state.current.id) {
        end(event);
      }
    };

    return {
      onPointerDown: (event: PointerEvent) => {
        if (
          event.button === 0 &&
          state.current.id == null &&
          latestProps.current.shouldStart(event)
        ) {
          start();
          state.current.lastPosition = {
            pageX: event.pageX,
            pageY: event.pageY,
          };
          state.current.id = event.pointerId;
          addGlobalListener(window, "pointermove", onPointerMove, false);
          addGlobalListener(window, "pointerup", onPointerUp, false);
          addGlobalListener(window, "pointercancel", onPointerUp, false);
        }
      },

      cancelCurrentMove: () => {
        end("canceled");
      },
    };
  }, [addGlobalListener, removeGlobalListener]);

  return moveResult;
};
