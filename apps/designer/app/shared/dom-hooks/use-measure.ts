// This hook is based on https://github.com/streamich/react-use/blob/master/src/useMeasure.ts
// The problem is that contentRect has wrong x/y values for absolutely positioned element.
// We have to use getBoundingClientRect instead.
// @todo optimize for the case when many consumers need to measure the same element

import { useCallback, useEffect, useMemo, useState } from "react";
import { PubsubMap, useSubscribeAll } from "~/shared/pubsub";
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

  const [isInline, setIsInline] = useState(false);

  const handleChange = useCallback(() => {
    if (element === null || typeof window === "undefined") return;
    setIsInline(window.getComputedStyle(element).display === "inline");
    const nextRect = element.getBoundingClientRect();
    setRect((currentRect) => {
      if (
        currentRect === undefined ||
        currentRect.x !== nextRect.x ||
        currentRect.y !== nextRect.y ||
        currentRect.width !== nextRect.width ||
        currentRect.height !== nextRect.height
      ) {
        return nextRect;
      }
      return currentRect;
    });
  }, [element]);

  // ResizeObserver does not work for inline elements,
  // so if the element is inline, we measure it after any change in the instance tree.
  //
  // NOTE: We assume useMeasure is used only to measure elements on canvas.
  // If this ever changes, we need to refactor this.
  useTreeChange(handleChange, isInline);

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

  useEffect(() => {
    if (element) {
      const observer = new window.ResizeObserver(handleChange);
      observer.observe(element);
      return () => observer.disconnect();
    }
  }, [element, handleChange]);

  useEffect(handleChange, [handleChange]);

  return [setElement, rect];
};

const useTreeChange = (onChange: () => void, enabled: boolean) => {
  const callback = useMemo(() => {
    if (!enabled) {
      return () => null;
    }
    return (type: keyof PubsubMap) => {
      if (
        type === "updateProps" ||
        type === "deleteProp" ||
        type === "insertInstance" ||
        type === "deleteInstance" ||
        type === "reparentInstance" ||
        type === "updateStyle" ||
        type.startsWith("previewStyle:")
      ) {
        onChange();
      }
    };
  }, [onChange, enabled]);

  useSubscribeAll(callback);
};
