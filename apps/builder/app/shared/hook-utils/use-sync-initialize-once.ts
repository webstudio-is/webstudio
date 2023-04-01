import { useEffect, useRef } from "react";

// This hook allows to
// 1. run a function only once on the client
// Can't use useState initializer because it can be called twice in strict mode and also isn't designed for this.
export const useSyncInitializeOnce = (fn: () => void) => {
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current) {
      return;
    }
    ref.current = true;

    fn();
  }, [fn]);
};
