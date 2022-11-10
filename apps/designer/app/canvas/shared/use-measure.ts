import { useCallback, useEffect, useMemo } from "react";
import { useMeasure as useMeasureBase, useRectState } from "~/shared/dom-hooks";
import { type PubsubMap, useSubscribeAll } from "~/shared/pubsub";

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

// A version of useMeasure capable of measuring inlined elements, but works only within canvas.
export const useMeasure = (element: HTMLElement | undefined) => {
  const { canObserve, rect: baseRect } = useMeasureBase(element);

  const [rect, setRect] = useRectState();

  const handleChange = useCallback(() => {
    setRect(element && element.getBoundingClientRect());
  }, [element, setRect]);

  useTreeChange(handleChange, canObserve === false);

  useEffect(() => {
    if (canObserve === false) {
      handleChange();
    }
  }, [handleChange, canObserve]);

  return canObserve ? baseRect : rect;
};
