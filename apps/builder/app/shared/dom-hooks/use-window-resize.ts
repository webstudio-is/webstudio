import { useEffect } from "react";
import { createNanoEvents } from "nanoevents";

const emitter = createNanoEvents<{
  resizeStart: () => void;
  resize: () => void;
  resizeEnd: () => void;
}>();

if (typeof window === "object") {
  let timeoutId = 0;
  let isResizing = false;
  window.addEventListener(
    "resize",
    () => {
      if (isResizing === false) {
        emitter.emit("resizeStart");
      }
      emitter.emit("resize");
      isResizing = true;
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (isResizing === false) {
          return;
        }
        isResizing = false;
        emitter.emit("resizeEnd");
      }, 150);
    },
    false
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

type UseWindowResize = {
  onResizeStart?: () => void;
  onResize?: () => void;
  onResizeEnd?: () => void;
};

export const subscribeWindowResize = ({
  onResizeStart = noop,
  onResize = noop,
  onResizeEnd = noop,
}: UseWindowResize) => {
  const unsubscribeResizeStart = emitter.on("resizeStart", onResizeStart);
  const unsubscribeResize = emitter.on("resize", onResize);
  const unsubscribeResizeEnd = emitter.on("resizeEnd", onResizeEnd);

  return () => {
    unsubscribeResizeStart();
    unsubscribeResize();
    unsubscribeResizeEnd();
  };
};

/**
 * Subscribe to DOM resize event only once and then notify all listeners over js only.
 * This allows us to subscribe to resize by many listeners without perf issues, since its going to be the same resize event.
 * TODO: We can add throttling and RAF if needed.
 */
export const useWindowResize = (onResize: () => void) => {
  useEffect(() => {
    const unsubscribeResize = emitter.on("resize", onResize);
    return () => {
      unsubscribeResize();
    };
  }, [onResize]);
};

export const useWindowResizeDebounced = (onResize: () => void) => {
  useEffect(() => {
    // Call on leading
    const unsubscribeResizeStart = emitter.on("resizeStart", onResize);
    // and trailing edge
    const unsubscribeResizeEnd = emitter.on("resizeEnd", onResize);
    return () => {
      unsubscribeResizeStart();
      unsubscribeResizeEnd();
    };
  }, [onResize]);
};
