import { useCallback, useEffect, useState } from "react";

import {
  scaleStore,
  canvasWidthStore,
  canvasRectStore,
} from "~/builder/shared/nano-states";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";

/**
 * Reads the canvas iframe dom rect and puts it into nano state
 * so that this is the only place we do it.
 */
export const useReadCanvasRect = () => {
  const [iframeElement, setIframeElement] = useState<HTMLIFrameElement | null>(
    null
  );

  const updateRect = useCallback(() => {
    if (iframeElement === null) {
      return;
    }
    const rect = iframeElement.getBoundingClientRect();
    canvasRectStore.set(rect);
  }, [iframeElement]);

  useEffect(() => {
    updateRect();
    const scaleStoreUnsubscribe = scaleStore.listen(updateRect);
    const canvasWidthStoreUnsubscribe = canvasWidthStore.listen(updateRect);

    return () => {
      scaleStoreUnsubscribe();
      canvasWidthStoreUnsubscribe();
    };
  }, [updateRect]);

  useWindowResizeDebounced(() => {
    updateRect();
  });

  return {
    onRef: setIframeElement,
    onTransitionEnd: updateRect,
  };
};
