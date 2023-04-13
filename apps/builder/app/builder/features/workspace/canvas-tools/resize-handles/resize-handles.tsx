import { css, theme } from "@webstudio-is/design-system";
import { useRef, type PointerEventHandler } from "react";
import {
  canvasRectStore,
  canvasWidthStore,
  isCanvasPointerEventsEnabledStore,
} from "~/builder/shared/nano-states";
import { minCanvasWidth } from "~/shared/breakpoints";

const handleStyle = css({
  position: "absolute",
  top: 0,
  width: 4,
  bottom: 0,
  cursor: "col-resize",
  pointerEvents: "auto",
  "&:hover": {
    background: theme.colors.backgroundPrimaryLight,
  },
  "&[data-align=left]": {
    left: 0,
  },
  "&[data-align=right]": {
    right: 0,
  },
});

type State = {
  status: "pending" | "dragging" | "idle";
  initialX: number;
  initialY: number;
  pointerId: number | undefined;
};

const initialState: State = {
  status: "idle",
  initialX: 0,
  initialY: 0,
  pointerId: undefined,
};

type Point = { x: number; y: number };

type UseDragProps = {
  onStart: () => void;
  onMove: (event: Point) => void;
  onEnd: (event: { isCanceled: boolean }) => void;
};

const useDrag = (props: UseDragProps) => {
  const state = useRef<State>({ ...initialState });
  const latestProps = useRef(props);
  latestProps.current = props;

  const end = (isCanceled: boolean) => {
    if (state.current.status === "dragging") {
      // A drag is basically a very slow click.
      // But we don't want it to register as a click.
      const addedAt = Date.now();
      window.addEventListener(
        "click",
        (event) => {
          // if more than 300ms have passed, we assume this click is unrelated to the drag.
          if (Date.now() - addedAt > 300) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
        },
        { capture: true, once: true }
      );

      latestProps.current.onEnd({ isCanceled });
    }

    state.current = { ...initialState };
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerCancel);
    window.removeEventListener("dragstart", handleDragStart);
  };

  const handlePointerMove = (event: PointerEvent) => {
    // prevent text selecting while dragging
    event.preventDefault();
    const { onStart, onMove } = latestProps.current;

    if (event.pointerId !== state.current.pointerId) {
      return;
    }

    const x = event.clientX;
    const y = event.clientY;

    if (state.current.status === "pending") {
      onStart();
      state.current.status = "dragging";
    }

    if (state.current.status === "dragging") {
      onMove({ x, y });
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerId === state.current.pointerId) {
      end(false);
    }
  };

  const handlePointerCancel = (event: PointerEvent) => {
    if (event.pointerId === state.current.pointerId) {
      end(true);
    }
  };
  const handleDragStart = (event: Event) => {
    // Prevent default drag behavior. For example, dragging a link.
    event.preventDefault();
  };

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (state.current.status !== "idle") {
      return;
    }
    state.current = {
      ...state.current,
      status: "pending",
      initialX: event.clientX,
      initialY: event.clientY,
      pointerId: event.pointerId,
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("dragstart", handleDragStart);
  };

  return { onPointerDown: handlePointerDown };
};

const baseDragHandlers = {
  onStart() {
    isCanvasPointerEventsEnabledStore.set(false);
  },
  onEnd() {
    isCanvasPointerEventsEnabledStore.set(true);
  },
};

export const ResizeHandles = () => {
  const dragPropsLeft = useDrag({
    ...baseDragHandlers,
    onMove({ x }) {
      const rect = canvasRectStore.get();
      if (rect === undefined) {
        return;
      }
      canvasWidthStore.set(
        Math.round(Math.max(rect.right - x, minCanvasWidth))
      );
    },
  });
  const dragPropsRight = useDrag({
    ...baseDragHandlers,
    onMove({ x }) {
      const rect = canvasRectStore.get();
      if (rect === undefined) {
        return;
      }
      canvasWidthStore.set(Math.max(Math.round(x - rect.left), minCanvasWidth));
    },
  });
  return (
    <>
      <div {...dragPropsLeft} className={handleStyle()} data-align="left" />
      <div {...dragPropsRight} className={handleStyle()} data-align="right" />
    </>
  );
};
