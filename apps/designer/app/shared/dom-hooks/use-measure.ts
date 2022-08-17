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

  // Detect movement of the element without remounting.
  useEffect(() => {
    // No need to worry about parent changing while element stays the same.
    // React cannot do that. It can only move within the same parent.
    const parent = element?.parentElement;
    if (parent) {
      const observer = new window.MutationObserver(handleChange);
      observer.observe(parent, { childList: true });
      return () => observer.disconnect();
    }
  }, [element, handleChange]);

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
