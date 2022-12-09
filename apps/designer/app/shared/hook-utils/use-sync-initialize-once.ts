import { useRef } from "react";

// This hook allows to
// 1. run a function only once on the client
// 2. run it server-side
// 3. run the function synchronously in both
// Can't use effect for that (async).
// Can't use useState initializer because it can be called twice in strict mode and also isn't designed for this.
export const useSyncInitializeOnce = (fn: () => void) => {
  const ref = useRef(false);
  if (ref.current) {
    return;
  }
  ref.current = true;
  fn();
};
