// This hook is based on https://github.com/streamich/react-use/blob/master/src/useMeasure.ts
// The problem is that contentRect has wrong x/y values for absolutely positioned element.
// We have to use getBoundingClientRect instead.
// @todo optimize for the case when many consumers need to measure the same element

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const resizeObserver = useMemo(() => {
    if (typeof window === "undefined") return;
    return new window.ResizeObserver(handleChange);
  }, [handleChange]);

  const mutationObserver = useMemo(() => {
    if (typeof window === "undefined") return;
    return new window.MutationObserver(handleChange);
  }, [handleChange]);

  useEffect(() => {
    if (resizeObserver) {
      if (element === null) resizeObserver.disconnect();
      else resizeObserver.observe(element);
    }

    // detect reparenting of the element
    if (mutationObserver) {
      const parent = element?.parentElement;
      if (parent == null) mutationObserver.disconnect();
      else mutationObserver.observe(parent, { childList: true });
    }

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [element, resizeObserver, mutationObserver]);

  useEffect(handleChange, [handleChange]);

  return [setElement, rect];
};
