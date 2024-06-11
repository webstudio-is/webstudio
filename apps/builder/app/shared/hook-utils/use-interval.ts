import { useEffect, useRef } from "react";

type Timeout = ReturnType<typeof setTimeout>;

export const useInterval = (callback: (id: Timeout) => void, delay: number) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    const id = setInterval(() => {
      savedCallback.current(id);
    }, delay);
    return () => clearInterval(id);
  }, [delay]);
};
