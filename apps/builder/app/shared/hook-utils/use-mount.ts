import { useRef } from "react";
import { type EffectCallback, useEffect } from "react";

export const useMount = (effect: EffectCallback) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
};

export const useUnmount = (fn: () => void): void => {
  const fnRef = useRef(fn);
  // update the ref each render so if it change the newest callback will be invoked
  fnRef.current = fn;
  useMount(() => {
    return () => fnRef.current();
  });
};
