import { useRef, useInsertionEffect, useCallback } from "react";

const useSafeInsertionEffect =
  typeof window !== "undefined"
    ? useInsertionEffect
    : (fn: () => void) => {
        fn();
      };

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const useEffectEvent = <T extends Function>(callback?: T) => {
  const ref = useRef(callback);

  useSafeInsertionEffect(() => {
    ref.current = callback;
  });

  return useCallback<T>(
    ((...args: unknown[]) => ref.current?.(...args)) as never,
    []
  );
};
