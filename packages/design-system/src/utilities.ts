import { useEffect, useMemo, useRef, useState } from "react";
import warnOnce from "warn-once";
import type { CSS } from "./stitches.config";

export const canvasPointerEventsPropertyName = "--canvas-pointer-events";

let disableCount = 0;

const updateCanvasPointerEvents = () => {
  if (disableCount < 0) {
    // Should be impossible as counter control implemented as disposable resource
    throw new Error("canvas pointer event counter can't be less than 0");
  }

  // use ===1 instead of >0 for optimisation
  if (disableCount === 1) {
    document.documentElement.style.setProperty(
      canvasPointerEventsPropertyName,
      "none"
    );
    return;
  }

  if (disableCount === 0) {
    document.documentElement.style.removeProperty(
      canvasPointerEventsPropertyName
    );
  }
};

/**
 * Temporarily disables pointer events on the canvas using canvasPointerEventsPropertyName.
 * Use the returned disposable to re-enable them.
 *
 * Implemented as disposable to
 * - Ensure events are first disabled, then enabled in sequence.
 * - To support concurrent calls (internal counter tracks the number of disables/enables).
 **/
export const disableCanvasPointerEvents = () => {
  let disposeCalled = false;

  disableCount += 1;
  updateCanvasPointerEvents();

  return () => {
    if (disposeCalled) {
      // It's perfectly ok to dispose multiple times.
      return;
    }
    disposeCalled = true;
    disableCount -= 1;
    updateCanvasPointerEvents();
  };
};

export const useDisableCanvasPointerEvents = () => {
  const enableCanvasPointerEventsRef = useRef<undefined | (() => void)>(
    undefined
  );

  const enableDisable = useMemo(
    () => ({
      enableCanvasPointerEvents: () => {
        warnOnce(
          enableCanvasPointerEventsRef.current === undefined,
          "enableCanvasPointerEvents was called before disableCanvasPointerEvents, this is not an issue but may indicate the problem with the code."
        );
        enableCanvasPointerEventsRef.current?.();
      },
      disableCanvasPointerEvents: () => {
        enableCanvasPointerEventsRef.current?.();
        enableCanvasPointerEventsRef.current = disableCanvasPointerEvents();
      },
    }),
    []
  );

  useEffect(
    () => () => {
      enableCanvasPointerEventsRef.current?.();
    },
    [enableDisable]
  );

  return enableDisable;
};

/**
 * Uses ResizeObserver to notify about resize events, with start, end and timeout.
 */
export const useResize = ({
  onResizeStart,
  onResize,
  onResizeEnd,
  timeout = 300,
}: {
  onResizeStart?: (entries: Array<ResizeObserverEntry>) => void;
  onResize?: (entries: Array<ResizeObserverEntry>) => void;
  onResizeEnd?: (entries: Array<ResizeObserverEntry>) => void;
  timeout?: number;
}) => {
  const [element, ref] = useState<HTMLElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const onResizeStartRef = useRef(onResizeStart);
  onResizeStartRef.current = onResizeStart;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const onResizeEndRef = useRef(onResizeEnd);
  onResizeEndRef.current = onResizeEnd;
  const isResizingRef = useRef<boolean | undefined>();

  useEffect(() => {
    if (element === null) {
      return;
    }
    // Mark resizing as on a new observer instance, we will use this to skip first resize event.
    isResizingRef.current = undefined;
    const observer = new ResizeObserver((entries) => {
      // Resize observer called first time is not a start of resize
      if (isResizingRef.current === undefined) {
        isResizingRef.current = false;
        return;
      }
      if (isResizingRef.current === false) {
        isResizingRef.current = true;
        onResizeStartRef.current?.(entries);
      }
      onResizeRef.current?.(entries);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onResizeEndRef.current?.(entries);
        isResizingRef.current = false;
      }, timeout);
    });
    observer.observe(element);
    return () => {
      clearTimeout(timeoutRef.current);
      observer.disconnect();
    };
  }, [element, onResizeStartRef, onResizeRef, onResizeEndRef, timeout]);

  return [element, ref] as const;
};

export const truncate = (): CSS => ({
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "clip",
});
