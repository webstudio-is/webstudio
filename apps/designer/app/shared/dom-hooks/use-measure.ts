// This hook is based on https://github.com/streamich/react-use/blob/master/src/useMeasure.ts
// The problem is that contentRect has wrong x/y values for absolutely positioned element.
// We have to use getBoundingClientRect instead.
// @todo optimize for the case when many consumers need to measure the same element

import { useCallback, useEffect, useState } from "react";
import { useScrollState } from "./use-scroll-state";

export const useRectState = () => {
  const [rect, setRectBase] = useState<DOMRect>();
  const setRect = useCallback(
    (nextRect: DOMRect | undefined) =>
      setRectBase((currentRect) => {
        if (
          currentRect === undefined ||
          nextRect === undefined ||
          currentRect.x !== nextRect.x ||
          currentRect.y !== nextRect.y ||
          currentRect.width !== nextRect.width ||
          currentRect.height !== nextRect.height
        ) {
          return nextRect;
        }
        return currentRect;
      }),
    []
  );
  return [rect, setRect] as const;
};

export const useMeasure = (
  element: HTMLElement | undefined
): { canObserve: boolean; rect: DOMRect | undefined } => {
  const [rect, setRect] = useRectState();
  const [isInline, setIsInline] = useState(false);

  const triggerMeasure = useCallback(() => {
    setRect(element && element.getBoundingClientRect());
    setIsInline(
      element ? window.getComputedStyle(element).display === "inline" : false
    );
  }, [element, setRect]);

  useScrollState({
    onScrollEnd: triggerMeasure,
  });

  // Detect movement of the element without remounting.
  useEffect(() => {
    // No need to worry about parent changing while element stays the same.
    // React cannot do that. It can only move within the same parent.
    const parent = element?.parentElement;
    if (parent) {
      const observer = new window.MutationObserver(triggerMeasure);
      observer.observe(parent, { childList: true });
      return () => observer.disconnect();
    }
  }, [element, triggerMeasure]);

  useEffect(() => {
    if (element) {
      const observer = new window.ResizeObserver(triggerMeasure);
      observer.observe(element);
      return () => observer.disconnect();
    }
  }, [element, triggerMeasure]);

  useEffect(triggerMeasure, [triggerMeasure]);

  return {
    // ResizeObserver does not work for inline elements
    canObserve: isInline === false,
    rect,
  };
};
