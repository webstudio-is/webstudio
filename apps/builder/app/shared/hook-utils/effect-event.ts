import { useRef, useInsertionEffect, useCallback } from "react";

const useSafeInsertionEffect =
  typeof window !== "undefined"
    ? useInsertionEffect
    : (fn: () => void) => {
        fn();
      };

// eslint-disable-next-line @typescript-eslint/ban-types
export const useEffectEvent = <T extends Function>(callback?: T) => {
  const ref = useRef(callback);

  useSafeInsertionEffect(() => {
    ref.current = callback;
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback<T>(
    ((...args: unknown[]) => ref.current?.(...args)) as never,
    []
  );
};
