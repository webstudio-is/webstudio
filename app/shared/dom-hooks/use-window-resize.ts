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

export const useWindowResize = (onResize: () => void) => {
  useEffect(() => {
    emitter.on("resize", onResize);
    return () => {
      emitter.off("resize", onResize);
    };
  }, [onResize]);
};
