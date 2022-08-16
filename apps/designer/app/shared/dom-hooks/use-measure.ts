// This hook is based on https://github.com/streamich/react-use/blob/master/src/useMeasure.ts
// The problem is that contentRect has wrong x/y values for absolutely positioned element.
// We have to use getBoundingClientRect instead.
// @todo optimize for the case when many consumers need to measure the same element

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScrollState } from "./use-scroll-state";

export type UseMeasureRef<MeasuredElement extends HTMLElement = HTMLElement> = (
  element: MeasuredElement | null
) => void;
export type UseMeasureResult<
  MeasuredElement extends HTMLElement = HTMLElement
> = [UseMeasureRef<MeasuredElement>, DOMRect | undefined];

export const useMeasure = <
  MeasuredElement extends HTMLElement = HTMLElement
>(): UseMeasureResult<MeasuredElement> => {
  const [element, setElement] = useState<MeasuredElement | null>(null);
  const [rect, setRect] = useState<DOMRect>();

  const handleChange = useCallback(() => {
    if (element === null) return;
    setRect(element.getBoundingClientRect());
  }, [element]);

  useScrollState({
    onScrollEnd: handleChange,
  });

  useDetectReparenting(element, handleChange);

  const observer = useMemo(() => {
    if (typeof window === "undefined") return;
    return new window.ResizeObserver(handleChange);
  }, [handleChange]);

  useEffect(() => {
    if (observer) {
      if (element === null) observer.disconnect();
      else observer.observe(element);
    }
    return () => {
      observer?.disconnect();
    };
  }, [element, observer]);

  useEffect(handleChange, [handleChange]);

  return [setElement, rect];
};

const useDetectReparenting = (
  element: HTMLElement | null,
  callback: () => void
) => {
  // putting callback into a ref allows us to avoid adding it as a dependency
  const latestCallback = useRef(callback);
  latestCallback.current = callback;

  const [timeOfLastMutation, setTimeOfLastMutation] = useState(0);

  // We intentionally add timeOfLastMutation to dependency list
  // to force parent to update after a mutation.
  const parent = useMemo(
    () => element?.parentElement,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element, timeOfLastMutation]
  );

  const observer = useMemo(
    () =>
      typeof window !== "undefined" &&
      new window.MutationObserver(() => {
        setTimeOfLastMutation(Date.now());
        latestCallback.current();
      }),
    []
  );

  useEffect(() => {
    if (observer && parent) {
      observer.observe(parent, { childList: true });
      return () => observer.disconnect();
    }
  }, [observer, parent]);
};
