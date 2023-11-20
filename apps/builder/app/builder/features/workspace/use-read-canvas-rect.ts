import { useCallback, useEffect, useState } from "react";

import {
  scaleStore,
  canvasWidthStore,
  $canvasRect,
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

  // react updates dom asynchronously so here schedule rect
  // computing into effect when react done with dom
  const [updateCallback, setUpdateCallback] = useState<
    undefined | (() => void)
  >(undefined);
  useEffect(() => {
    updateCallback?.();
  }, [updateCallback]);

  const updateRect = useCallback(() => {
    if (iframeElement === null) {
      return;
    }
    // create new function to trigger effect
    const task = () => {
      const rect = iframeElement.getBoundingClientRect();
      $canvasRect.set(rect);
    };
    setUpdateCallback(() => task);
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
