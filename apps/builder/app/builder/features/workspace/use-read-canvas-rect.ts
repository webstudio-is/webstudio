import { useCallback, useEffect, useState } from "react";

import {
  $scale,
  $canvasWidth,
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
    const $scaleUnsubscribe = $scale.listen(updateRect);
    const $canvasWidthUnsubscribe = $canvasWidth.listen(updateRect);

    return () => {
      $scaleUnsubscribe();
      $canvasWidthUnsubscribe();
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
