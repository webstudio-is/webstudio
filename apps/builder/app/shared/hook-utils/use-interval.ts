import { useEffect, useRef } from "react";

export const useInterval = (callback: () => void, delay: number) => {
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
