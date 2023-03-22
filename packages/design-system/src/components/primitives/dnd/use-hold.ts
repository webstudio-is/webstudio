import { useEffect, useMemo, useRef } from "react";

type UseHoldProps<Data> = {
  data: Data;
  isEqual: (a: Data, b: Data) => boolean;
  holdTimeThreshold: number;
  onHold: (data: Data) => void;
};

// Detects when a piece of data stays the same for a given amount of time
export const useHold = <Data>(props: UseHoldProps<Data>) => {
  const state = useRef({
    currentData: undefined as Data | undefined,
    timeoutId: undefined as NodeJS.Timeout | undefined,
  });

  // We want to use fresh props every time we use them,
  // but we don't need to react to updates.
  // So we can put them in a ref and make useMemo below very efficient.
  const latestProps = useRef<UseHoldProps<Data>>(props);

  useEffect(() => {
    const data = props.data;
    const { currentData } = state.current;
    const { isEqual, holdTimeThreshold } = latestProps.current;

    if (currentData !== undefined && isEqual(currentData, data)) {
      return;
    }

    clearTimeout(state.current.timeoutId);

    state.current.timeoutId = setTimeout(() => {
      state.current.timeoutId = undefined;
      latestProps.current.onHold(data);
    }, holdTimeThreshold);
  }, [props.data]);

  // We want to return a stable object to avoid re-renders when it's a dependency
  return useMemo(() => {
    return {
      reset() {
        clearTimeout(state.current.timeoutId);
        state.current = { currentData: undefined, timeoutId: undefined };
      },
    };
  }, []);
};
