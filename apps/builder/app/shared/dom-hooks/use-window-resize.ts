import { useEffect } from "react";
import mitt from "mitt";

const emitter = mitt();

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
  emitter.on("resizeStart", onResizeStart);
  emitter.on("resize", onResize);
  emitter.on("resizeEnd", onResizeEnd);

  return () => {
    emitter.off("resizeStart", onResizeStart);
    emitter.off("resize", onResize);
    emitter.off("resizeEnd", onResizeEnd);
  };
};

/**
 * Subscribe to DOM resize event only once and then notify all listeners over js only.
 * This allows us to subscribe to resize by many listeners without perf issues, since its going to be the same resize event.
 * TODO: We can add throttling and RAF if needed.
 */
export const useWindowResize = (onResize: () => void) => {
  useEffect(() => {
    emitter.on("resize", onResize);
    return () => {
      emitter.off("resize", onResize);
    };
  }, [onResize]);
};

export const useWindowResizeDebounced = (onResize: () => void) => {
  useEffect(() => {
    // Call on leading
    emitter.on("resizeStart", onResize);
    // and trailing edge
    emitter.on("resizeEnd", onResize);
    return () => {
      emitter.on("resizeStart", onResize);
      emitter.off("resizeEnd", onResize);
    };
  }, [onResize]);
};
