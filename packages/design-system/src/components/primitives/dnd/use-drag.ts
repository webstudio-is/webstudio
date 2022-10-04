import { useRef, useEffect, useMemo, useState } from "react";
import { type Point } from "./geometry-utils";

type State<Data> = {
  status: "pending" | "dragging" | "idle";
  initialX: number;
  initialY: number;
  shifts: number;
  dragItemData: Data | undefined;
  pointerId: number | undefined;
};

const initialState: State<unknown> = {
  status: "idle",
  initialX: 0,
  initialY: 0,
  shifts: 0,
  dragItemData: undefined,
  pointerId: undefined,
};

type UseDragProps<DragItemData> = {
  startDistanceThreashold?: number;
  shiftDistanceThreshold?: number;
  elementToData: (element: Element) => DragItemData | false;
  onStart: (event: { data: DragItemData }) => void;
  onMove: (event: Point) => void;
  onShiftChange?: (event: { shifts: number }) => void;
  onEnd: (event: { isCanceled: boolean }) => void;
};

type UseDragHandlers = {
  rootRef: (element: HTMLElement | null) => void;
  cancelCurrentDrag: () => void;
};

export const useDrag = <DragItemData>(
  props: UseDragProps<DragItemData>
): UseDragHandlers => {
  // We want to use fresh props every time we use them,
  // but we don't need to react to updates.
  // So we can put them in a ref and make useMemo below very efficient.
  const latestProps = useRef<UseDragProps<DragItemData>>(props);
  latestProps.current = props;

  const state = useRef<State<DragItemData>>({
    ...(initialState as State<DragItemData>),
  });

  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);

  const { handlePointerDown, end } = useMemo(() => {
    const detectShift = (x: number) => {
      const { onShiftChange, shiftDistanceThreshold = 20 } =
        latestProps.current;

      const deltaX = x - state.current.initialX;
      const shifts =
        deltaX > 0
          ? Math.floor(deltaX / shiftDistanceThreshold)
          : Math.ceil(deltaX / shiftDistanceThreshold);

      if (shifts !== state.current.shifts) {
        state.current.shifts = shifts;
        onShiftChange?.({ shifts });
      }
    };

    const handleDragStart = (event: Event) => {
      // Prevent default drag behavior. For example, dragging a link.
      event.preventDefault();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || state.current.status !== "idle") {
        return;
      }

      const data = latestProps.current.elementToData(event.target as Element);

      if (data === false) {
        return;
      }

      state.current = {
        ...state.current,
        status: "pending",
        initialX: event.clientX,
        initialY: event.clientY,
        pointerId: event.pointerId,
        dragItemData: data,
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerCancel);
      window.addEventListener("dragstart", handleDragStart);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const {
        startDistanceThreashold = 3,
        onStart,
        onMove,
      } = latestProps.current;

      if (event.pointerId !== state.current.pointerId) {
        return;
      }

      const x = event.clientX;
      const y = event.clientY;

      // We want to start dragging only when the user has moved more than startDistanceThreashold.
      if (
        state.current.status === "pending" &&
        Math.abs(x - state.current.initialX) < startDistanceThreashold &&
        Math.abs(y - state.current.initialY) < startDistanceThreashold
      ) {
        return;
      }

      if (
        state.current.status === "pending" &&
        state.current.dragItemData !== undefined
      ) {
        onStart({ data: state.current.dragItemData });
        state.current.status = "dragging";
      }

      if (state.current.status === "dragging") {
        onMove({ x, y });
        detectShift(x);
      }
    };

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

      state.current = { ...(initialState as State<DragItemData>) };

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("dragstart", handleDragStart);
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

    return {
      handlePointerDown,
      end,
    };
  }, []);

  useEffect(() => {
    if (rootElement !== null) {
      rootElement.addEventListener("pointerdown", handlePointerDown);
      return () => {
        rootElement.removeEventListener("pointerdown", handlePointerDown);
      };
    }
  }, [rootElement, handlePointerDown]);

  // We want to return a stable object to avoid re-renders when it's a dependency
  return useMemo(() => {
    return {
      rootRef(element) {
        setRootElement(element);
      },
      cancelCurrentDrag() {
        end(true);
      },
    };
  }, [end]);
};
