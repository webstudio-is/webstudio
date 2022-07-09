import { useEffect } from "react";
import mitt from "mitt";

const emitter = mitt();

if (typeof window === "object") {
  window.addEventListener(
    "resize",
    () => {
      emitter.emit("resize");
    },
    false
  );
}

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
