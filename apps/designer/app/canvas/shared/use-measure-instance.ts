import { useCallback, useEffect, useMemo } from "react";
import { useMeasure, useRectState } from "~/shared/dom-hooks";
import { type PubsubMap, useSubscribeAll } from "~/shared/pubsub";

const useSubscribeTreeChange = (onChange: () => void, isEnabled: boolean) => {
  const callback = useMemo(() => {
    if (!isEnabled) {
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
  }, [onChange, isEnabled]);

  useSubscribeAll(callback);
};

// A version of useMeasure capable of measuring inlined elements, but works only within canvas.
export const useMeasureInstance = (element: HTMLElement | undefined) => {
  const { canObserve, rect: baseRect } = useMeasure(element);

  const [rect, setRect] = useRectState();

  const handleChange = useCallback(() => {
    setRect(element && element.getBoundingClientRect());
  }, [element, setRect]);

  useSubscribeTreeChange(handleChange, canObserve === false);

  useEffect(() => {
    if (canObserve === false) {
      handleChange();
    }
  }, [handleChange, canObserve]);

  return canObserve ? baseRect : rect;
};
