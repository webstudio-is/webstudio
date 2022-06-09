// This hook is based on https://github.com/streamich/react-use/blob/master/src/useMeasure.ts
// The problem is that contentRect has wrong x/y values for absolutely positioned element.
// We have to use getBoundingClientRect instead.
// @todo optimize for the case when many consumers need to measure the same element

import { useEffect, useMemo, useState } from "react";

export type UseMeasureRef<MeasuredElement extends Element = Element> = (
  element: MeasuredElement
) => void;
export type UseMeasureResult<MeasuredElement extends Element = Element> = [
  UseMeasureRef<MeasuredElement>,
  DOMRect | undefined
];

export const useMeasure = <
  MeasuredElement extends Element = Element
>(): UseMeasureResult<MeasuredElement> => {
  const [element, ref] = useState<MeasuredElement | null>(null);
  const [rect, setRect] = useState<DOMRect>();

  const observer = useMemo(() => {
    if (element === null || typeof window === "undefined") return;
    return new window.ResizeObserver((entries) => {
      if (element === null) return;
      requestAnimationFrame(() => {
        setRect(element.getBoundingClientRect());
      });
    });
  }, [element]);

  useEffect(() => {
    if (element === null || observer === undefined) return;
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);

  return [ref, rect];
};
