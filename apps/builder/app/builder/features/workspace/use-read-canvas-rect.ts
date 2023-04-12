import { useCallback, useEffect, useState } from "react";

import {
  scaleStore,
  canvasWidthContainer,
  canvasRectContainer,
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
    canvasRectContainer.set(rect);
  }, [iframeElement]);

  useEffect(() => {
    updateRect();
    const scaleStoreUnsubscribe = scaleStore.listen(updateRect);
    const canvasWidthContainerUnsubscribe =
      canvasWidthContainer.listen(updateRect);

    return () => {
      scaleStoreUnsubscribe();
      canvasWidthContainerUnsubscribe();
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
